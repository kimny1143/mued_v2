/**
 * Hoo Conversations API
 * GET /api/hoo/conversations - List user's conversations
 * DELETE /api/hoo/conversations - Delete all conversations
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api-response';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { logger } from '@/lib/utils/logger';

// ========================================
// GET Handler - List Conversations
// ========================================

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const GET = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const validationResult = listQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return apiValidationError('Invalid query parameters', validationResult.error.errors);
    }

    const { limit, offset } = validationResult.data;

    const conversations = await hooConversationsRepository.findByUserId(
      internalUserId,
      limit,
      offset
    );

    const total = await hooConversationsRepository.countByUserId(internalUserId);

    logger.info('[GET /api/hoo/conversations] Listed conversations', {
      userId: internalUserId,
      count: conversations.length,
      total,
    });

    return apiSuccess({
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title || `Conversation ${c.id.slice(0, 8)}`,
        messageCount: c.messageCount,
        model: c.model,
        provider: c.provider,
        startedAt: c.startedAt,
        lastMessageAt: c.lastMessageAt,
        // Don't include full messages in list view
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + conversations.length < total,
      },
    });
  } catch (error) {
    logger.error('[GET /api/hoo/conversations] Error', { error });
    return apiError('Failed to fetch conversations', { status: 500 });
  }
});

// ========================================
// DELETE Handler - Delete All Conversations
// ========================================

export const DELETE = withAuthResolved(async ({ internalUserId }) => {
  try {
    const deleted = await hooConversationsRepository.deleteAllByUserId(internalUserId);

    logger.info('[DELETE /api/hoo/conversations] Deleted all conversations', {
      userId: internalUserId,
      count: deleted.length,
    });

    return apiSuccess({
      deleted: deleted.length,
      message: `Deleted ${deleted.length} conversations`,
    });
  } catch (error) {
    logger.error('[DELETE /api/hoo/conversations] Error', { error });
    return apiError('Failed to delete conversations', { status: 500 });
  }
});
