/**
 * MUEDnote DAW Log API
 *
 * POST /api/muednote/daw-log - Create DAW log (from CLI/Hub)
 * GET  /api/muednote/daw-log - Get DAW logs by time range
 *
 * 認証方式:
 * - X-DAW-API-Key ヘッダー（CLI用）
 * - Bearer JWT（将来のデスクトップアプリ用）
 */

import { db } from '@/db';
import { muednoteDawLogs } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';

// 開発用APIキー（本番では環境変数で管理）
const DEV_API_KEY = process.env.DAW_HUB_API_KEY || 'dev_daw_key_kimny';
const DEV_USER_ID = process.env.DAW_HUB_USER_ID || 'user_2wUoGVkTsBdFc0n2qIRxnAWa7Vy'; // kimny's clerk user id

/**
 * DAW Hub 認証
 * - X-DAW-API-Key: APIキー認証（CLI用）
 * - Bearer: JWT認証（将来のアプリ用）
 */
async function getAuthUserId(req: Request): Promise<string | null> {
  // APIキー認証（CLI/Hub用）
  const apiKey = req.headers.get('X-DAW-API-Key');
  if (apiKey && apiKey === DEV_API_KEY) {
    return DEV_USER_ID;
  }

  // JWT認証（将来のデスクトップアプリ用）
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      if (payload?.sub) {
        return payload.sub;
      }
    } catch (error) {
      console.error('[DAW API] JWT verification failed:', error);
    }
  }

  // Cookie認証（Web用）
  const session = await auth();
  return session?.userId || null;
}

// ========================================
// POST /api/muednote/daw-log
// Create DAW log entry
// ========================================

interface DawLogPostBody {
  timestamp: string;
  daw?: 'ableton' | 'protools' | 'logic' | 'other';
  action?: 'parameter_change' | 'track_volume' | 'track_pan';
  track_id: number;
  device_id: number;
  param_id: number;
  value: number;
  value_string: string;
  metadata?: Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DawLogPostBody = await req.json();

    // Validate required fields
    if (
      !body.timestamp ||
      body.track_id === undefined ||
      body.device_id === undefined ||
      body.param_id === undefined ||
      body.value === undefined ||
      !body.value_string
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create log entry
    const [newLog] = await db
      .insert(muednoteDawLogs)
      .values({
        userId,
        ts: new Date(body.timestamp),
        daw: body.daw || 'ableton',
        action: body.action || 'parameter_change',
        trackId: body.track_id,
        deviceId: body.device_id,
        paramId: body.param_id,
        value: body.value,
        valueString: body.value_string,
        metadata: body.metadata || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      id: newLog.id,
    });

  } catch (error) {
    console.error('[POST /api/muednote/daw-log] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create DAW log' },
      { status: 500 }
    );
  }
}

// ========================================
// GET /api/muednote/daw-log
// Get DAW logs by time range or session
// ========================================

export async function GET(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const until = url.searchParams.get('until');
    const sessionId = url.searchParams.get('session_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

    // Build query conditions
    const conditions = [eq(muednoteDawLogs.userId, userId)];

    if (since) {
      conditions.push(gte(muednoteDawLogs.ts, new Date(since)));
    }
    if (until) {
      conditions.push(lte(muednoteDawLogs.ts, new Date(until)));
    }
    if (sessionId) {
      conditions.push(eq(muednoteDawLogs.sessionId, sessionId));
    }

    // Fetch logs
    const logs = await db
      .select()
      .from(muednoteDawLogs)
      .where(and(...conditions))
      .orderBy(desc(muednoteDawLogs.ts))
      .limit(limit);

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        ts: log.ts,
        daw: log.daw,
        action: log.action,
        track_id: log.trackId,
        device_id: log.deviceId,
        param_id: log.paramId,
        value: log.value,
        value_string: log.valueString,
        metadata: log.metadata,
        created_at: log.createdAt,
      })),
      count: logs.length,
    });

  } catch (error) {
    console.error('[GET /api/muednote/daw-log] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DAW logs' },
      { status: 500 }
    );
  }
}
