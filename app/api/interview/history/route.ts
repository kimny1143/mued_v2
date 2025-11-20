/**
 * Interview History API
 * GET /api/interview/history - Get interview history for a session
 *
 * Phase 1.3 Day 18-19: Interview API Routes Implementation
 */

import { db } from '@/db';
import { interviewQuestions, interviewAnswers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { verifySessionOwnership } from '@/lib/utils/auth-helpers';
import { authenticateApiRequest, isAuthenticated } from '@/lib/utils/api-auth';

// ========================================
// Query Parameter Validation Schema
// ========================================

const GetHistoryQuerySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
});

// ========================================
// GET /api/interview/history
// Get interview history for a session
// ========================================

/**
 * Get interview history for a session
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate query parameters
 * 3. Verify session ownership
 * 4. Fetch all questions for the session
 * 5. Fetch all answers for those questions
 * 6. Join questions and answers
 * 7. Return history with statistics
 */
export async function GET(req: Request) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateApiRequest('GET /api/interview/history');

    if (!isAuthenticated(authResult)) {
      return authResult; // Return 401 or 500 response
    }

    const { internalUserId } = authResult;

    // 2. Parse and validate query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: sessionId' },
        { status: 400 }
      );
    }

    const validationResult = GetHistoryQuerySchema.safeParse({ sessionId });

    if (!validationResult.success) {
      logger.warn('[GET /api/interview/history] Invalid query parameters', {
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const validatedSessionId = validationResult.data.sessionId;

    // 4. Verify session ownership
    const isOwner = await verifySessionOwnership(validatedSessionId, internalUserId);

    if (!isOwner) {
      logger.warn('[GET /api/interview/history] Session not found or unauthorized', {
        sessionId: validatedSessionId,
        userId: internalUserId,
      });
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    logger.info('[GET /api/interview/history] Fetching interview history', {
      sessionId: validatedSessionId,
    });

    // 5. Fetch all questions for the session (ordered by order field)
    const questions = await db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.sessionId, validatedSessionId))
      .orderBy(asc(interviewQuestions.order));

    if (questions.length === 0) {
      logger.info('[GET /api/interview/history] No questions found for session', {
        sessionId: validatedSessionId,
      });
      return NextResponse.json({
        sessionId: validatedSessionId,
        questions: [],
        totalQuestions: 0,
        answeredCount: 0,
      });
    }

    // 6. Fetch all answers for the session
    const answers = await db
      .select()
      .from(interviewAnswers)
      .where(eq(interviewAnswers.sessionId, validatedSessionId));

    // Create a map of questionId -> answer for efficient lookup
    const answerMap = new Map(answers.map(answer => [answer.questionId, answer]));

    // 7. Join questions with their answers
    const questionsWithAnswers = questions.map(question => {
      const answer = answerMap.get(question.id);

      return {
        id: question.id,
        text: question.text,
        focus: question.focus,
        depth: question.depth,
        answer: answer
          ? {
              id: answer.id,
              text: answer.text,
              createdAt: answer.createdAt.toISOString(),
            }
          : null,
        createdAt: question.createdAt.toISOString(),
      };
    });

    // 8. Calculate statistics
    const totalQuestions = questions.length;
    const answeredCount = questionsWithAnswers.filter(q => q.answer !== null).length;

    logger.info('[GET /api/interview/history] Interview history retrieved', {
      sessionId: validatedSessionId,
      totalQuestions,
      answeredCount,
    });

    // 9. Return history with statistics
    return NextResponse.json({
      sessionId: validatedSessionId,
      questions: questionsWithAnswers,
      totalQuestions,
      answeredCount,
    });

  } catch (error) {
    logger.error('[GET /api/interview/history] Failed to fetch interview history', { error });

    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch interview history',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
