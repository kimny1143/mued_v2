/**
 * Hoo Memory Extraction API
 * POST /api/hoo/memory/extract — Extract auto-memories from a conversation
 *
 * Triggers LLM-based extraction of structured facts from a Hoo conversation.
 * Results are merged into hoo_memories.autoMemories.
 *
 * Auth: Clerk session (web UI) OR internal API key (Worker → API)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api-response';
import { hooMemoryExtractorService } from '@/lib/services/hoo-memory-extractor.service';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { logger } from '@/lib/utils/logger';

// ========================================
// Validation
// ========================================

const extractSchema = z.object({
  conversationId: z.string().uuid(),
});

const internalExtractSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(), // internal user ID
});

// ========================================
// Internal API Key Auth
// ========================================

function verifyInternalApiKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Internal-API-Key');
  const expected = process.env.INTERNAL_API_KEY;
  return !!key && !!expected && key === expected;
}

// ========================================
// POST — Extract memories from conversation
// ========================================

export async function POST(request: NextRequest) {
  // Check for internal API key (Worker → API calls)
  if (verifyInternalApiKey(request)) {
    return handleInternalExtract(request);
  }

  // Fall back to Clerk auth (web UI)
  return handleClerkAuth(request);
}

async function handleInternalExtract(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = internalExtractSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError('Invalid request', validation.error.errors);
    }

    const { conversationId, userId } = validation.data;

    // Verify conversation belongs to user
    const conversation = await hooConversationsRepository.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return apiError('Conversation not found', { status: 404 });
    }

    const extracted = await hooMemoryExtractorService.extractFromConversation(
      userId,
      conversationId
    );

    return apiSuccess({
      extracted: extracted.length,
      memories: extracted,
    });
  } catch (error) {
    logger.error('[POST /api/hoo/memory/extract] Internal error', { error });
    return apiServerError(error instanceof Error ? error : new Error('Extraction failed'));
  }
}

async function handleClerkAuth(request: NextRequest) {
  const handler = withAuthResolved(async ({ internalUserId, request: req }) => {
    try {
      const body = await req.json();
      const validation = extractSchema.safeParse(body);

      if (!validation.success) {
        return apiValidationError('Invalid request', validation.error.errors);
      }

      const { conversationId } = validation.data;

      const conversation = await hooConversationsRepository.findById(conversationId);
      if (!conversation || conversation.userId !== internalUserId) {
        return apiError('Conversation not found', { status: 404 });
      }

      const extracted = await hooMemoryExtractorService.extractFromConversation(
        internalUserId,
        conversationId
      );

      return apiSuccess({
        extracted: extracted.length,
        memories: extracted,
      });
    } catch (error) {
      logger.error('[POST /api/hoo/memory/extract] Error', { error });
      return apiServerError(error instanceof Error ? error : new Error('Extraction failed'));
    }
  });

  return handler(request);
}
