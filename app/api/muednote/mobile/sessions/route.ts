/**
 * MUEDnote Mobile Sessions API
 * v7 MVP: Simple timer-based session management
 *
 * POST /api/muednote/mobile/sessions - Create session
 * GET  /api/muednote/mobile/sessions - List sessions
 */

import { db } from '@/db';
import { muednoteMobileSessions, muednoteMobileLogs } from '@/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 開発用トークン認証（本番では無効化）
const DEV_TOKEN = process.env.NODE_ENV === 'development' ? 'dev_token_kimny' : null;
const DEV_USER_ID = 'dev_user_kimny';

async function getAuthUserId(req: Request): Promise<string | null> {
  // 開発用トークン認証
  if (DEV_TOKEN) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader === `Bearer ${DEV_TOKEN}`) {
      return DEV_USER_ID;
    }
  }
  // Clerk 認証
  const session = await auth();
  return session?.userId || null;
}

// ========================================
// POST /api/muednote/mobile/sessions
// Create new session
// ========================================

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { duration_sec, started_at, ended_at, session_memo, device_id } = body;

    // Validate required fields
    if (!duration_sec || !started_at) {
      return NextResponse.json(
        { error: 'Missing required fields: duration_sec, started_at' },
        { status: 400 }
      );
    }

    // Create session
    const [newSession] = await db
      .insert(muednoteMobileSessions)
      .values({
        userId: userId,
        durationSec: duration_sec,
        startedAt: new Date(started_at),
        endedAt: ended_at ? new Date(ended_at) : null,
        sessionMemo: session_memo || null,
        deviceId: device_id || null,
        status: 'completed',
      })
      .returning();

    return NextResponse.json({
      session: {
        id: newSession.id,
        user_id: newSession.userId,
        duration_sec: newSession.durationSec,
        started_at: newSession.startedAt,
        ended_at: newSession.endedAt,
        session_memo: newSession.sessionMemo,
        created_at: newSession.createdAt,
      },
    });

  } catch (error) {
    console.error('[POST /api/muednote/mobile/sessions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// ========================================
// GET /api/muednote/mobile/sessions
// List user's sessions
// ========================================

export async function GET(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch sessions with log count using LEFT JOIN
    const sessions = await db
      .select({
        id: muednoteMobileSessions.id,
        userId: muednoteMobileSessions.userId,
        durationSec: muednoteMobileSessions.durationSec,
        startedAt: muednoteMobileSessions.startedAt,
        endedAt: muednoteMobileSessions.endedAt,
        sessionMemo: muednoteMobileSessions.sessionMemo,
        status: muednoteMobileSessions.status,
        createdAt: muednoteMobileSessions.createdAt,
        logCount: sql<number>`COUNT(${muednoteMobileLogs.id})::int`,
      })
      .from(muednoteMobileSessions)
      .leftJoin(muednoteMobileLogs, eq(muednoteMobileLogs.sessionId, muednoteMobileSessions.id))
      .where(eq(muednoteMobileSessions.userId, userId))
      .groupBy(muednoteMobileSessions.id)
      .orderBy(desc(muednoteMobileSessions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, userId));

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        duration_sec: s.durationSec,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        session_memo: s.sessionMemo,
        status: s.status,
        log_count: s.logCount,
        created_at: s.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('[GET /api/muednote/mobile/sessions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
