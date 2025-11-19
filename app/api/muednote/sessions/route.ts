/**
 * Sessions API
 * Phase 2: MUEDnote Session/Interview Architecture
 *
 * POST /api/muednote/sessions - Create new session with Analyzer
 * GET  /api/muednote/sessions - List user's sessions with filters
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/edge';
import { sessions, sessionAnalyses, users } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { analyzerService } from '@/lib/services/analyzer.service';
import { logger } from '@/lib/utils/logger';
import type { DAWMetadata, SessionType, SessionStatus } from '@/db/schema/sessions';

export const runtime = 'edge';

// ========================================
// Helper: Get internal user UUID from Clerk ID
// ========================================

async function getUserIdFromClerkId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error(
      `User ${clerkId} not found in database. Please ensure Clerk webhooks are properly configured.`
    );
  }

  return user.id;
}

// ========================================
// POST /api/muednote/sessions
// Create new session with Analyzer
// ========================================

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const {
      type,
      title,
      userShortNote,
      projectId,
      projectName,
      dawMeta,
      isPublic = false,
      shareWithMentor = true,
    } = body;

    // Validate required fields (early return for invalid requests)
    if (!type || !title || !userShortNote) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, userShortNote' },
        { status: 400 }
      );
    }

    // Get internal user ID (after validation)
    const internalUserId = await getUserIdFromClerkId(session.userId);

    logger.info('[POST /api/muednote/sessions] Creating session', {
      userId: internalUserId,
      type,
      titleLength: title.length,
      noteLength: userShortNote.length,
    });

    // 1. Run Analyzer to infer focus area and intent hypothesis
    const analysisResult = await analyzerService.analyzeSession({
      sessionType: type,
      userShortNote,
      dawMeta: dawMeta as DAWMetadata | undefined,
    });

    logger.info('[POST /api/muednote/sessions] Analysis completed', {
      focusArea: analysisResult.focusArea,
      confidence: analysisResult.confidence,
    });

    // 2. Create session with AI annotations
    const [newSession] = await db
      .insert(sessions)
      .values({
        userId: internalUserId,
        type,
        title,
        userShortNote,
        projectId,
        projectName,
        dawMeta: dawMeta as DAWMetadata | undefined,
        aiAnnotations: {
          focusArea: analysisResult.focusArea,
          intentHypothesis: analysisResult.intentHypothesis,
          confidence: analysisResult.confidence,
          analysisMethod: analysisResult.analysisMethod,
        },
        isPublic,
        shareWithMentor,
        status: 'draft',
      })
      .returning();

    // 3. Create session analysis record
    const [newAnalysis] = await db
      .insert(sessionAnalyses)
      .values({
        sessionId: newSession.id,
        analysisData: {
          focusArea: analysisResult.focusArea,
          intentHypothesis: analysisResult.intentHypothesis,
        },
        analysisVersion: 'mvp-1.0',
        confidence: analysisResult.confidence,
      })
      .returning();

    logger.info('[POST /api/muednote/sessions] Session created', {
      sessionId: newSession.id,
      analysisId: newAnalysis.id,
    });

    return NextResponse.json({
      session: newSession,
      analysis: newAnalysis,
    });

  } catch (error) {
    logger.error('[POST /api/muednote/sessions] Failed to create session', { error });
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ========================================
// GET /api/muednote/sessions
// List user's sessions with filters
// ========================================

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get internal user ID
    const internalUserId = await getUserIdFromClerkId(session.userId);

    // Parse query parameters
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const type = url.searchParams.get('type'); // Filter by session type
    const status = url.searchParams.get('status'); // Filter by status

    logger.info('[GET /api/muednote/sessions] Fetching sessions', {
      userId: internalUserId,
      limit,
      offset,
      type,
      status,
    });

    // Build WHERE conditions
    const conditions = [eq(sessions.userId, internalUserId)];

    if (type) {
      conditions.push(eq(sessions.type, type as SessionType));
    }

    if (status) {
      conditions.push(eq(sessions.status, status as SessionStatus));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Fetch sessions
    const userSessions = await db
      .select()
      .from(sessions)
      .where(whereCondition)
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(sessions)
      .where(whereCondition);

    logger.info('[GET /api/muednote/sessions] Sessions fetched', {
      count: userSessions.length,
      total,
    });

    return NextResponse.json({
      sessions: userSessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    logger.error('[GET /api/muednote/sessions] Failed to fetch sessions', { error });
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
