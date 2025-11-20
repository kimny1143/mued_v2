/**
 * Interview Answers API
 * POST /api/interview/answers - Save user's answers to interview questions
 *
 * Phase 1.3 Day 18-19: Interview API Routes Implementation
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, sessions, interviewQuestions, interviewAnswers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// ========================================
// Input Validation Schema
// ========================================

const SaveAnswerRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  questionId: z.string().uuid('Invalid question ID format'),
  answerText: z.string().min(1, 'Answer cannot be empty').max(5000, 'Answer too long (max 5000 chars)'),
});

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
// Helper: Verify session ownership
// ========================================

async function verifySessionOwnership(sessionId: string, userId: string): Promise<boolean> {
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    return false;
  }

  return session.userId === userId;
}

// ========================================
// Helper: Verify question belongs to session
// ========================================

async function verifyQuestionInSession(questionId: string, sessionId: string): Promise<boolean> {
  const [question] = await db
    .select({ sessionId: interviewQuestions.sessionId })
    .from(interviewQuestions)
    .where(eq(interviewQuestions.id, questionId))
    .limit(1);

  if (!question) {
    return false;
  }

  return question.sessionId === sessionId;
}

// ========================================
// POST /api/interview/answers
// Save user's answer to an interview question
// ========================================

/**
 * Save user's answer to an interview question
 *
 * Flow:
 * 1. Validate request body
 * 2. Authenticate user
 * 3. Verify session ownership
 * 4. Verify question belongs to session
 * 5. Check if answer already exists (update if yes, insert if no)
 * 6. Update session metadata with latest answer timestamp
 * 7. Return success response with answer ID
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();

    if (!session?.userId) {
      logger.warn('[POST /api/interview/answers] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await req.json();

    const validationResult = SaveAnswerRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[POST /api/interview/answers] Invalid request body', {
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

    const { sessionId, questionId, answerText } = validationResult.data;

    // 3. Get internal user ID
    const internalUserId = await getUserIdFromClerkId(session.userId);

    // 4. Verify session ownership
    const isOwner = await verifySessionOwnership(sessionId, internalUserId);

    if (!isOwner) {
      logger.warn('[POST /api/interview/answers] Session not found or unauthorized', {
        sessionId,
        userId: internalUserId,
      });
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    // 5. Verify question belongs to session
    const questionInSession = await verifyQuestionInSession(questionId, sessionId);

    if (!questionInSession) {
      logger.warn('[POST /api/interview/answers] Question not found or does not belong to session', {
        questionId,
        sessionId,
      });
      return NextResponse.json(
        { error: 'Question not found or does not belong to this session' },
        { status: 404 }
      );
    }

    logger.info('[POST /api/interview/answers] Saving answer', {
      sessionId,
      questionId,
      answerLength: answerText.length,
    });

    // 6. Check if answer already exists
    const [existingAnswer] = await db
      .select()
      .from(interviewAnswers)
      .where(
        and(
          eq(interviewAnswers.sessionId, sessionId),
          eq(interviewAnswers.questionId, questionId)
        )
      )
      .limit(1);

    let savedAnswer;

    if (existingAnswer) {
      // Update existing answer
      logger.info('[POST /api/interview/answers] Updating existing answer', {
        answerId: existingAnswer.id,
      });

      [savedAnswer] = await db
        .update(interviewAnswers)
        .set({
          text: answerText,
          updatedAt: new Date(),
        })
        .where(eq(interviewAnswers.id, existingAnswer.id))
        .returning();
    } else {
      // Insert new answer
      logger.info('[POST /api/interview/answers] Inserting new answer');

      [savedAnswer] = await db
        .insert(interviewAnswers)
        .values({
          sessionId,
          questionId,
          text: answerText,
        })
        .returning();
    }

    // 7. Update session's updatedAt timestamp to reflect new activity
    await db
      .update(sessions)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    logger.info('[POST /api/interview/answers] Answer saved successfully', {
      answerId: savedAnswer.id,
      sessionId,
      isUpdate: !!existingAnswer,
    });

    // 8. Return success response
    return NextResponse.json({
      success: true,
      answerId: savedAnswer.id,
      sessionId,
      isUpdate: !!existingAnswer,
    });

  } catch (error) {
    logger.error('[POST /api/interview/answers] Failed to save answer', { error });

    // Provide user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to save answer',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
