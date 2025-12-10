/**
 * Mentor Matching Session API
 * POST /api/mentor-matching/session - Create new matching session
 * GET /api/mentor-matching/session?sessionId=xxx - Retrieve session state
 *
 * Manages chat session state for mentor matching conversations
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
} from '@/lib/api-response';
import { db } from '@/db/edge';
import { chatSessions, chatMessages } from '@/db/schema/chat-system';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import type { MatchingStep, ExtractedUserNeeds } from '@/types/chat-matching';

// ========================================
// Type Definitions
// ========================================

// TODO: Use this interface when implementing persistent session metadata storage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MatchingSessionMetadata {
  step: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
  messageCount: number;
  lastMessageAt: string;
}

interface CreateSessionResponse {
  sessionId: string;
  step: MatchingStep;
  message: string;
  createdAt: string;
}

interface GetSessionResponse {
  sessionId: string;
  step: MatchingStep;
  extractedNeeds: Partial<ExtractedUserNeeds>;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  createdAt: string;
  lastMessageAt: string;
}

// ========================================
// Request Validation Schemas
// ========================================

const createSessionRequestSchema = z.object({
  initialMessage: z.string().optional(),
});

const getSessionRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

// ========================================
// Initial Greeting Message
// ========================================

const INITIAL_GREETING = `こんにちは！音楽学習のお手伝いをさせていただきます🎵

あなたにぴったりのメンターを見つけるために、いくつか質問させてください。

まず、どんな楽器を学びたいですか？`;

// ========================================
// POST Handler - Create Session
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = createSessionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(
        'Invalid request format',
        validationResult.error.errors
      );
    }

    const { initialMessage } = validationResult.data;

    logger.info('[POST /api/mentor-matching/session] Creating session', {
      userId: internalUserId,
      hasInitialMessage: !!initialMessage,
    });

    // Create chat session
    const [session] = await db
      .insert(chatSessions)
      .values({
        userId: internalUserId,
        title: 'メンターマッチング',
        isActive: true,
        messageCount: 0,
      })
      .returning();

    if (!session) {
      throw new Error('Failed to create session');
    }

    // Insert initial assistant greeting
    await db.insert(chatMessages).values({
      sessionId: session.id,
      userId: internalUserId,
      role: 'assistant',
      content: INITIAL_GREETING,
      metadata: {
        suggestedActions: ['greeting'],
        relatedConcepts: ['mentor-matching'],
      },
    });

    // Update session message count
    await db
      .update(chatSessions)
      .set({
        messageCount: 1,
        lastMessageAt: new Date(),
      })
      .where(eq(chatSessions.id, session.id));

    logger.info('[POST /api/mentor-matching/session] Session created', {
      sessionId: session.id,
      userId: internalUserId,
    });

    const response: CreateSessionResponse = {
      sessionId: session.id,
      step: 'greeting',
      message: INITIAL_GREETING,
      createdAt: session.createdAt.toISOString(),
    };

    return apiSuccess(response, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/mentor-matching/session] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return apiValidationError('Invalid request', error.errors);
    }

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});

// ========================================
// GET Handler - Retrieve Session
// ========================================

export const GET = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return apiValidationError('sessionId query parameter is required');
    }

    const validationResult = getSessionRequestSchema.safeParse({ sessionId });
    if (!validationResult.success) {
      return apiValidationError(
        'Invalid sessionId format',
        validationResult.error.errors
      );
    }

    logger.info('[GET /api/mentor-matching/session] Retrieving session', {
      userId: internalUserId,
      sessionId,
    });

    // Fetch session
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.userId, internalUserId)
        )
      )
      .limit(1);

    if (!session) {
      logger.warn('[GET /api/mentor-matching/session] Session not found', {
        sessionId,
        userId: internalUserId,
      });
      return apiNotFound('Session not found or access denied');
    }

    // Fetch conversation history
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt));

    // Extract current step and needs from latest message tags/metadata
    // Note: For MVP, we store step in session title and needs in session summary
    // A more robust solution would use a dedicated matching_sessions table
    // We have the latest message at messages[0] but for MVP we use defaults
    const step: MatchingStep = 'greeting'; // Default for MVP
    const extractedNeeds: Partial<ExtractedUserNeeds> = {}; // Default for MVP

    // Build conversation history
    const conversationHistory = messages
      .reverse() // Chronological order
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
      }));

    logger.info('[GET /api/mentor-matching/session] Session retrieved', {
      sessionId,
      messageCount: conversationHistory.length,
      currentStep: step,
    });

    const response: GetSessionResponse = {
      sessionId: session.id,
      step,
      extractedNeeds,
      conversationHistory,
      createdAt: session.createdAt.toISOString(),
      lastMessageAt: session.lastMessageAt?.toISOString() || session.createdAt.toISOString(),
    };

    return apiSuccess(response);
  } catch (error) {
    logger.error('[GET /api/mentor-matching/session] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return apiValidationError('Invalid request', error.errors);
    }

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});

// ========================================
// DELETE Handler - Archive Session
// ========================================

export const DELETE = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return apiValidationError('sessionId query parameter is required');
    }

    logger.info('[DELETE /api/mentor-matching/session] Archiving session', {
      userId: internalUserId,
      sessionId,
    });

    // Archive session (soft delete)
    const [archived] = await db
      .update(chatSessions)
      .set({
        isActive: false,
        archivedAt: new Date(),
      })
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.userId, internalUserId)
        )
      )
      .returning();

    if (!archived) {
      logger.warn('[DELETE /api/mentor-matching/session] Session not found', {
        sessionId,
        userId: internalUserId,
      });
      return apiNotFound('Session not found or access denied');
    }

    logger.info('[DELETE /api/mentor-matching/session] Session archived', {
      sessionId,
    });

    return apiSuccess({
      sessionId: archived.id,
      archivedAt: archived.archivedAt?.toISOString(),
    });
  } catch (error) {
    logger.error('[DELETE /api/mentor-matching/session] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});
