/**
 * MUEDnote Mobile Logs API
 * v7 MVP: Batch log upload from mobile app
 *
 * POST /api/muednote/mobile/logs - Batch save logs
 */

import { db } from '@/db';
import { muednoteMobileSessions, muednoteMobileLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
// POST /api/muednote/mobile/logs
// Batch save logs for a session
// ========================================

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { session_id, logs } = body;

    // Validate required fields
    if (!session_id || !logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, logs (array)' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const [existingSession] = await db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.id, session_id))
      .limit(1);

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (existingSession.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to session' },
        { status: 403 }
      );
    }

    // Validate and prepare log entries
    const logEntries = logs.map((log: {
      timestamp_sec: number;
      text: string;
      confidence?: number;
    }) => {
      if (typeof log.timestamp_sec !== 'number' || !log.text) {
        throw new Error('Invalid log entry: requires timestamp_sec and text');
      }

      return {
        sessionId: session_id,
        timestampSec: log.timestamp_sec,
        text: log.text,
        confidence: log.confidence ?? null,
      };
    });

    // Batch insert logs
    if (logEntries.length > 0) {
      await db.insert(muednoteMobileLogs).values(logEntries);
    }

    // Update session status to synced
    await db
      .update(muednoteMobileSessions)
      .set({ status: 'synced' })
      .where(eq(muednoteMobileSessions.id, session_id));

    return NextResponse.json({
      success: true,
      saved_count: logEntries.length,
      session_id,
    });

  } catch (error) {
    console.error('[POST /api/muednote/mobile/logs] Error:', error);

    if (error instanceof Error && error.message.includes('Invalid log entry')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save logs' },
      { status: 500 }
    );
  }
}
