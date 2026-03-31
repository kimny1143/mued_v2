/**
 * Hoo Memory Extraction API
 * POST /api/hoo/memory/extract — Extract auto-memories from a conversation
 *
 * Triggers LLM-based extraction of structured facts from a Hoo conversation.
 * Results are merged into hoo_memories.autoMemories.
 */

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

// ========================================
// POST — Extract memories from conversation
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    const body = await request.json();
    const validation = extractSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError('Invalid request', validation.error.errors);
    }

    const { conversationId } = validation.data;

    // Verify conversation belongs to user
    const conversation = await hooConversationsRepository.findById(conversationId);
    if (!conversation || conversation.userId !== internalUserId) {
      return apiError('Conversation not found', { status: 404 });
    }

    // Extract memories
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
