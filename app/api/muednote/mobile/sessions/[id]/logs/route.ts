/**
 * MUEDnote Mobile Session Logs API
 * v7 MVP: Get logs for a specific session
 *
 * GET /api/muednote/mobile/sessions/:id/logs
 */

import { db } from '@/db';
import { muednoteMobileSessions, muednoteMobileLogs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// ========================================
// GET /api/muednote/mobile/sessions/:id/logs
// Get all logs for a session
// ========================================

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Get session with ownership check
    const [existingSession] = await db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.id, sessionId))
      .limit(1);

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (existingSession.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to session' },
        { status: 403 }
      );
    }

    // Get logs ordered by timestamp
    const logs = await db
      .select()
      .from(muednoteMobileLogs)
      .where(eq(muednoteMobileLogs.sessionId, sessionId))
      .orderBy(asc(muednoteMobileLogs.timestampSec));

    return NextResponse.json({
      session: {
        id: existingSession.id,
        duration_sec: existingSession.durationSec,
        started_at: existingSession.startedAt,
        ended_at: existingSession.endedAt,
        session_memo: existingSession.sessionMemo,
        status: existingSession.status,
        created_at: existingSession.createdAt,
      },
      logs: logs.map(log => ({
        id: log.id,
        timestamp_sec: log.timestampSec,
        text: log.text,
        confidence: log.confidence,
        created_at: log.createdAt,
      })),
    });

  } catch (error) {
    console.error('[GET /api/muednote/mobile/sessions/:id/logs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
