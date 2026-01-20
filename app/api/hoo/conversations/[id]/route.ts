/**
 * Single Hoo Conversation API
 * GET /api/hoo/conversations/[id] - Get conversation with messages
 * DELETE /api/hoo/conversations/[id] - Delete conversation
 */

import { withAuthResolvedParams } from '@/lib/middleware/with-auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { logger } from '@/lib/utils/logger';

// ========================================
// GET Handler - Get Single Conversation
// ========================================

export const GET = withAuthResolvedParams<{ id: string }>(async ({ internalUserId, params }) => {
  try {
    const { id } = params;

    if (!id) {
      return apiError('Conversation ID required', { status: 400 });
    }

    const conversation = await hooConversationsRepository.findById(id);

    if (!conversation) {
      return apiError('Conversation not found', { status: 404 });
    }

    // Security: ensure user owns this conversation
    if (conversation.userId !== internalUserId) {
      return apiError('Conversation not found', { status: 404 });
    }

    logger.info('[GET /api/hoo/conversations/[id]] Fetched conversation', {
      userId: internalUserId,
      conversationId: id,
      messageCount: conversation.messageCount,
    });

    return apiSuccess({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      messageCount: conversation.messageCount,
      model: conversation.model,
      provider: conversation.provider,
      totalInputTokens: conversation.totalInputTokens,
      totalOutputTokens: conversation.totalOutputTokens,
      totalCostUsd: conversation.totalCostUsd,
      summary: conversation.summary,
      tags: conversation.tags,
      startedAt: conversation.startedAt,
      lastMessageAt: conversation.lastMessageAt,
    });
  } catch (error) {
    logger.error('[GET /api/hoo/conversations/[id]] Error', { error });
    return apiError('Failed to fetch conversation', { status: 500 });
  }
});

// ========================================
// DELETE Handler - Delete Single Conversation
// ========================================

export const DELETE = withAuthResolvedParams<{ id: string }>(async ({ internalUserId, params }) => {
  try {
    const { id } = params;

    if (!id) {
      return apiError('Conversation ID required', { status: 400 });
    }

    const conversation = await hooConversationsRepository.findById(id);

    if (!conversation) {
      return apiError('Conversation not found', { status: 404 });
    }

    // Security: ensure user owns this conversation
    if (conversation.userId !== internalUserId) {
      return apiError('Conversation not found', { status: 404 });
    }

    await hooConversationsRepository.delete(id);

    logger.info('[DELETE /api/hoo/conversations/[id]] Deleted conversation', {
      userId: internalUserId,
      conversationId: id,
    });

    return apiSuccess({
      deleted: true,
      id,
    });
  } catch (error) {
    logger.error('[DELETE /api/hoo/conversations/[id]] Error', { error });
    return apiError('Failed to delete conversation', { status: 500 });
  }
});
