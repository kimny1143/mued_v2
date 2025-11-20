/**
 * Interview Questions API
 * POST /api/interview/questions - Generate interview questions based on user's short note
 *
 * Phase 1.3 Day 18-19: Interview API Routes Implementation
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, sessions, interviewQuestions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzerService } from '@/lib/services/analyzer.service';
import { interviewerService } from '@/lib/services/interviewer.service';
import { ragService } from '@/lib/services/rag.service';
import { logger } from '@/lib/utils/logger';
import { getUserIdFromClerkId, verifySessionOwnership } from '@/lib/utils/auth-helpers';

// ========================================
// Input Validation Schema
// ========================================

const GenerateQuestionsRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  userShortNote: z.string().min(1, 'User note cannot be empty').max(500, 'Note too long (max 500 chars)'),
  previousQuestions: z.array(z.string()).optional(),
});

// ========================================
// POST /api/interview/questions
// Generate interview questions
// ========================================

/**
 * Generate interview questions based on user's short note
 *
 * Flow:
 * 1. Validate request body
 * 2. Authenticate user
 * 3. Verify session ownership
 * 4. Analyze session to get focusArea (using AnalyzerService)
 * 5. Find similar logs (using RAGService)
 * 6. Generate questions (using InterviewerService)
 * 7. Save questions to database
 * 8. Return questions with metadata
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();

    if (!session?.userId) {
      logger.warn('[POST /api/interview/questions] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await req.json();

    const validationResult = GenerateQuestionsRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[POST /api/interview/questions] Invalid request body', {
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { sessionId, userShortNote, previousQuestions } = validationResult.data;

    // 3. Get internal user ID
    const internalUserId = await getUserIdFromClerkId(session.userId);

    // 4. Verify session ownership
    const isOwner = await verifySessionOwnership(sessionId, internalUserId);

    if (!isOwner) {
      logger.warn('[POST /api/interview/questions] Session not found or unauthorized', {
        sessionId,
        userId: internalUserId,
      });
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    logger.info('[POST /api/interview/questions] Generating questions', {
      sessionId,
      noteLength: userShortNote.length,
      previousQuestionsCount: previousQuestions?.length || 0,
    });

    // 5. Get session details for analysis
    const [sessionData] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 6. Analyze session to get focusArea and intentHypothesis
    const analysisResult = await analyzerService.analyzeSession({
      sessionType: sessionData.type,
      userShortNote,
      dawMeta: sessionData.dawMeta || undefined,
    });

    logger.info('[POST /api/interview/questions] Session analysis completed', {
      focusArea: analysisResult.focusArea,
      confidence: analysisResult.confidence,
    });

    // 7. Find similar logs using RAG
    let similarLogs: Array<{
      logId: string;
      similarity: number;
      content: string;
    }> = [];

    try {
      const ragResults = await ragService.findSimilarLogs(userShortNote, 3, 0.7);
      similarLogs = ragResults.map(log => ({
        logId: log.logId,
        similarity: log.similarity,
        content: log.content,
      }));

      logger.info('[POST /api/interview/questions] Similar logs found', {
        count: similarLogs.length,
      });
    } catch (error) {
      logger.error('[POST /api/interview/questions] RAG search failed, continuing without similar logs', {
        error,
      });
      // Continue without similar logs - not critical
    }

    // 8. Generate questions using InterviewerService
    const questionResult = await interviewerService.generateQuestions({
      sessionId,
      focusArea: analysisResult.focusArea,
      intentHypothesis: analysisResult.intentHypothesis,
      userShortNote,
      previousQuestions,
    });

    logger.info('[POST /api/interview/questions] Questions generated', {
      count: questionResult.questions.length,
      method: questionResult.generationMethod,
      confidence: questionResult.confidence,
    });

    // 9. Save questions to database
    const savedQuestions = await db.transaction(async (tx) => {
      const insertPromises = questionResult.questions.map((q, index) =>
        tx
          .insert(interviewQuestions)
          .values({
            sessionId,
            text: q.text,
            focus: q.focus,
            depth: q.depth,
            order: index,
            generatedBy: questionResult.generationMethod === 'ai' ? 'ai' : 'template',
            ragContext: similarLogs.length > 0
              ? { similarLogs: similarLogs.map(l => ({ logId: l.logId, similarity: l.similarity })) }
              : undefined,
          })
          .returning()
      );

      return await Promise.all(insertPromises);
    });

    logger.info('[POST /api/interview/questions] Questions saved to database', {
      savedCount: savedQuestions.length,
    });

    // 10. Return response with questions and metadata
    return NextResponse.json({
      questions: questionResult.questions,
      confidence: questionResult.confidence,
      generationMethod: questionResult.generationMethod,
      similarLogs: similarLogs.map(log => ({
        logId: log.logId,
        similarity: log.similarity,
        content: log.content,
      })),
    });

  } catch (error) {
    logger.error('[POST /api/interview/questions] Failed to generate questions', { error });

    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
