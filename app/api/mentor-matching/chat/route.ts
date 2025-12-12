/**
 * Chat-based Mentor Matching API
 * POST /api/mentor-matching/chat
 *
 * Conversational interface for progressive disclosure of user needs
 * Uses GPT-5-mini for natural language processing
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/api-response';
import { createChatCompletion } from '@/lib/openai';
import { MENTOR_MATCHING_SYSTEM_PROMPT } from '@/lib/ai/prompts/mentor-matching';
import type {
  ChatMatchingResponse,
  ExtractedUserNeeds,
} from '@/types/chat-matching';
import { logger } from '@/lib/utils/logger';
import { db } from '@/db';
import { chatSessions, chatMessages } from '@/db/schema/chat-system';
import { eq, sql } from 'drizzle-orm';

// ========================================
// Request Validation Schema
// ========================================

const chatMatchingRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  currentStep: z.enum([
    'greeting',
    'gathering_goals',
    'gathering_details',
    'searching',
    'suggesting',
    'selected',
    'error',
  ]),
  extractedNeeds: z
    .object({
      learningGoals: z.array(z.string()).optional(),
      instrument: z.string().optional(),
      // Accept any string - AI may return flexible values
      skillLevel: z.string().optional(),
      preferredGenres: z.array(z.string()).optional(),
      preferredDays: z.array(z.string()).optional(),
      // Accept any string - AI may return detailed time descriptions
      preferredTimeOfDay: z.string().optional(),
      budgetRange: z
        .object({
          min: z.number().nullable().optional(),
          max: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
      previousExperience: z.string().optional(),
      specificRequests: z.string().optional(),
    })
    .optional()
    .default({}),
});

// ========================================
// Response Schema for AI Output
// ========================================

// Helper to transform null/undefined to empty array or undefined
const nullableArray = z.array(z.string()).nullable().optional()
  .transform((val) => (val === null ? [] : val));

const nullableString = z.string().nullable().optional()
  .transform((val) => (val === null || val === '' ? undefined : val));

const aiResponseSchema = z.object({
  message: z.string(),
  nextStep: z.enum([
    'greeting',
    'gathering_goals',
    'gathering_details',
    'searching',
    'suggesting',
    'selected',
    'error',
  ]),
  extractedNeeds: z.object({
    learningGoals: nullableArray,
    instrument: nullableString,
    skillLevel: nullableString,
    preferredGenres: nullableArray,
    preferredDays: nullableArray,
    preferredTimeOfDay: nullableString,
    // budgetRange can be: null, string ("未定"), or object {min, max}
    budgetRange: z.union([
      z.object({
        min: z.number().nullable().optional().transform((val) => val ?? undefined),
        max: z.number().nullable().optional().transform((val) => val ?? undefined),
      }),
      z.string(), // AI might return "未定" as string
      z.null(),
    ]).optional().transform((val) => {
      // Normalize: string or null → undefined, object → object
      if (val === null || typeof val === 'string') return undefined;
      return val;
    }),
    previousExperience: nullableString,
    specificRequests: nullableString,
  }).passthrough(), // Allow additional fields AI might add
  quickReplies: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  shouldSearchMentors: z.boolean(),
  searchCriteria: z
    .object({
      skillLevel: z.string().optional(),
      learningGoals: z.array(z.string()).optional(),
      genres: z.array(z.string()).optional(),
      priceRange: z
        .object({
          min: z.number(),
          max: z.number(),
        })
        .optional(),
      availability: z.union([
        z.array(z.string()),
        z.object({
          days: z.array(z.string()).optional(),
          times: z.array(z.string()).optional(),
        }),
      ]).optional(),
    })
    .passthrough()
    .nullable()
    .optional(), // Make searchCriteria completely optional
  confidence: z.number().min(0).max(1),
});

// ========================================
// Database Helper Functions
// ========================================

/**
 * Ensure a chat session exists, create if not
 */
async function ensureSessionExists(sessionId: string, userId: string): Promise<void> {
  const existing = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(chatSessions).values({
      id: sessionId,
      userId,
      title: 'メンターマッチング',
      isActive: true,
      messageCount: 0,
    });
    logger.info('[ensureSessionExists] Created new session', { sessionId, userId });
  }
}

/**
 * Save a message to the database
 */
async function saveMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(chatMessages).values({
    sessionId,
    userId,
    role,
    content,
    metadata: metadata as Record<string, unknown> | undefined,
    tags: ['mentor-matching'],
  });

  // Update session stats
  await db
    .update(chatSessions)
    .set({
      messageCount: sql`${chatSessions.messageCount} + 1`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, sessionId));
}

// ========================================
// POST Handler
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = chatMatchingRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error('[POST /api/mentor-matching/chat] Validation failed', {
        errors: validationResult.error.errors,
        receivedBody: JSON.stringify(body).slice(0, 500), // First 500 chars for debugging
      });
      return apiValidationError(
        'Invalid request format',
        validationResult.error.errors
      );
    }

    const { sessionId, message, conversationHistory, currentStep, extractedNeeds } =
      validationResult.data;

    logger.info('[POST /api/mentor-matching/chat] Processing message', {
      userId: internalUserId,
      sessionId,
      currentStep,
      messageLength: message.length,
    });

    // Ensure session exists and save user message to DB
    await ensureSessionExists(sessionId, internalUserId);
    await saveMessage(sessionId, internalUserId, 'user', message, {
      step: currentStep,
      extractedNeeds,
    });

    // Build conversation messages for AI
    const messages = [
      { role: 'system' as const, content: MENTOR_MATCHING_SYSTEM_PROMPT },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `Current step: ${currentStep}\nExtracted needs so far: ${JSON.stringify(extractedNeeds)}\nUser message: ${message}`,
      },
    ];

    // Call GPT-5-mini for natural language processing with retry logic
    const MAX_RETRIES = 2;
    let lastError: Error | null = null;
    let completion;
    let usage;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await createChatCompletion(messages, {
          model: 'gpt-5-mini',
          maxTokens: 8000, // High limit for testing - monitor actual usage to find optimal value
        });
        completion = result.completion;
        usage = result.usage;

        const aiMessage = completion.choices[0]?.message;
        const finishReason = completion.choices[0]?.finish_reason;

        if (aiMessage && aiMessage.content) {
          // Success - break out of retry loop
          break;
        }

        // Log empty response details
        logger.warn(`[POST /api/mentor-matching/chat] Empty AI response (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
          finishReason,
          hasMessage: !!aiMessage,
          hasContent: !!aiMessage?.content,
          refusal: aiMessage?.refusal,
        });

        lastError = new Error(`No response from AI (finish_reason: ${finishReason})`);

        // Wait before retry (exponential backoff)
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`[POST /api/mentor-matching/chat] API call failed (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
          error: lastError.message,
        });

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    const aiMessage = completion?.choices[0]?.message;
    const finishReason = completion?.choices[0]?.finish_reason as string | undefined;

    // Handle token limit exceeded - return graceful termination message
    if (finishReason === 'length') {
      logger.warn('[POST /api/mentor-matching/chat] Token limit exceeded, ending conversation gracefully', {
        sessionId,
        userId: internalUserId,
        finishReason,
      });

      // Save graceful termination message to DB
      const terminationMessage = 'お話ありがとうございました！詳しい内容を確認して、改めてご連絡いたしますね。少々お待ちください。';
      await saveMessage(sessionId, internalUserId, 'assistant', terminationMessage, {
        step: 'error',
        terminatedDueToTokenLimit: true,
      });

      const terminationResponse: ChatMatchingResponse = {
        message: terminationMessage,
        nextStep: 'error',
        extractedNeeds: extractedNeeds,
        quickReplies: undefined,
        shouldSearchMentors: false,
        confidence: 0,
      };

      return apiSuccess(terminationResponse);
    }

    if (!aiMessage || !aiMessage.content) {
      throw lastError || new Error('No response from AI after retries');
    }

    // Parse AI response
    let parsedResponse: z.infer<typeof aiResponseSchema>;
    try {
      // Extract JSON from AI response
      // Try multiple patterns: markdown code block, raw JSON object, or mixed text+JSON
      let jsonStr = aiMessage.content;

      // Pattern 1: ```json ... ```
      const codeBlockMatch = aiMessage.content.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Pattern 2: Find JSON object starting with { and ending with }
        const jsonObjectMatch = aiMessage.content.match(/\{[\s\S]*"message"[\s\S]*"nextStep"[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }

      const rawResponse = JSON.parse(jsonStr);
      parsedResponse = aiResponseSchema.parse(rawResponse);
    } catch (parseError) {
      logger.error('[POST /api/mentor-matching/chat] Failed to parse AI response', {
        error: parseError,
        rawContent: aiMessage.content,
      });
      throw new Error('Failed to parse AI response');
    }

    // Merge extracted needs
    const mergedNeeds: Partial<ExtractedUserNeeds> = {
      ...extractedNeeds,
      ...parsedResponse.extractedNeeds,
    };

    // Build response
    const response: ChatMatchingResponse = {
      message: parsedResponse.message,
      nextStep: parsedResponse.nextStep,
      extractedNeeds: mergedNeeds,
      quickReplies: parsedResponse.quickReplies,
      shouldSearchMentors: parsedResponse.shouldSearchMentors,
      searchCriteria: parsedResponse.searchCriteria || undefined,
      confidence: parsedResponse.confidence,
    };

    // Save assistant response to DB
    await saveMessage(sessionId, internalUserId, 'assistant', parsedResponse.message, {
      step: parsedResponse.nextStep,
      extractedNeeds: mergedNeeds,
      confidence: parsedResponse.confidence,
      tokensUsed: usage?.totalTokens ?? 0,
      estimatedCost: usage?.estimatedCost ?? 0,
      quickReplies: parsedResponse.quickReplies,
    });

    logger.info('[POST /api/mentor-matching/chat] Response generated', {
      nextStep: parsedResponse.nextStep,
      shouldSearchMentors: parsedResponse.shouldSearchMentors,
      confidence: parsedResponse.confidence,
      tokensUsed: usage?.totalTokens ?? 0,
      estimatedCost: usage?.estimatedCost ?? 0,
    });

    return apiSuccess(response);
  } catch (error) {
    logger.error('[POST /api/mentor-matching/chat] Error', {
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
// GET Handler (Health Check)
// ========================================

export const GET = withAuthResolved(async () => {
  return apiSuccess({
    status: 'ok',
    endpoint: '/api/mentor-matching/chat',
    description: 'Chat-based mentor matching with progressive disclosure',
    model: 'gpt-5-mini',
    features: [
      'Natural language understanding',
      'Progressive disclosure (one question at a time)',
      'Quick reply suggestions',
      'Automatic needs extraction',
      'Japanese language support',
    ],
  });
});
