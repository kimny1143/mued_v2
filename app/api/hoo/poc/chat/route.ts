/**
 * Hoo AI PoC Chat API
 * POST /api/hoo/poc/chat
 *
 * Model comparison endpoint for evaluating Claude vs Gemini
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { sendHooChat, type HooModelId, type HooChatMessage, HOO_MODELS } from '@/lib/ai/providers';
import { logger } from '@/lib/utils/logger';

// ========================================
// Request Validation Schema
// ========================================

const hooChatRequestSchema = z.object({
  model: z.enum(['claude-sonnet-4', 'claude-haiku', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gpt-4.1-mini', 'gpt-5-mini']),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(10000),
    })
  ).min(1),
});

// ========================================
// Response Type
// ========================================

interface HooChatApiResponse {
  content: string;
  model: string;
  provider: 'claude' | 'gemini' | 'openai';
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
    totalJpy: number;
  };
  latencyMs: number;
}

// ========================================
// POST Handler
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, request }) => {
  // Rate limit: 10 requests per minute for AI endpoints
  const rateLimitResponse = await rateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const validationResult = hooChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error('[POST /api/hoo/poc/chat] Validation failed', {
        errors: validationResult.error.errors,
      });
      return apiValidationError('Invalid request format', validationResult.error.errors);
    }

    const { model, messages } = validationResult.data;

    logger.info('[POST /api/hoo/poc/chat] Processing request', {
      userId: internalUserId,
      model,
      messageCount: messages.length,
    });

    // Send to appropriate provider
    const response = await sendHooChat(model as HooModelId, messages as HooChatMessage[]);

    // Calculate JPY cost (assuming 150 JPY/USD)
    const JPY_RATE = 150;
    const totalJpy = response.cost.total * JPY_RATE;

    const apiResponse: HooChatApiResponse = {
      content: response.content,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      cost: {
        ...response.cost,
        totalJpy,
      },
      latencyMs: response.latencyMs,
    };

    logger.info('[POST /api/hoo/poc/chat] Response generated', {
      userId: internalUserId,
      model: response.model,
      provider: response.provider,
      latencyMs: response.latencyMs,
      totalTokens: response.usage.totalTokens,
      costUsd: response.cost.total.toFixed(6),
    });

    return apiSuccess(apiResponse);
  } catch (error) {
    logger.error('[POST /api/hoo/poc/chat] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific API errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Anthropic billing error
    if (errorMessage.includes('credit balance is too low')) {
      return apiError('Anthropic API credit balance is too low. Please add credits at console.anthropic.com', {
        code: 'BILLING_ERROR',
        status: 402,
      });
    }

    // API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return apiError('API key is invalid or not configured. Check your environment variables.', {
        code: 'API_KEY_ERROR',
        status: 401,
      });
    }

    // Google rate limit / quota errors
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
      return apiError('Google AI quota exceeded. Wait a minute or enable billing at aistudio.google.com', {
        code: 'RATE_LIMIT',
        status: 429,
      });
    }

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});

// ========================================
// GET Handler (Available Models)
// ========================================

export const GET = withAuthResolved(async () => {
  return apiSuccess({
    status: 'ok',
    endpoint: '/api/hoo/poc/chat',
    description: 'Hoo AI PoC - Model comparison endpoint',
    availableModels: HOO_MODELS,
  });
});
