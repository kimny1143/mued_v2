/**
 * Hoo AI Chat API (Production)
 * POST /api/hoo/chat
 *
 * Tier-based AI conversation for MUEDnote:
 * - Free: Template responses only
 * - Basic: 150 AI conversations/month (Claude Haiku 4.5)
 * - Premium: Unlimited (BYOK)
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { sendHooChat, generateConversationTitle, type HooChatMessage } from '@/lib/ai/providers';
import { subscriptionRepository, TURN_LIMITS } from '@/lib/repositories/subscriptions.repository';
import { sessionRepository } from '@/lib/repositories/sessions.repository';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { getHooSystemPromptWithMemory } from '@/lib/ai/hoo-prompt';
import { logger } from '@/lib/utils/logger';

// ========================================
// Free Tier Template Responses
// ========================================

const FREE_TIER_RESPONSES = {
  greeting: {
    patterns: ['こんにち', 'hello', 'hi', 'hey', 'おはよう', 'こんばん'],
    response: 'こんにちは、Hooです。\n\n思考整理のお手伝いをしたいのですが、AIチャット機能はBasicプラン以上でご利用いただけます。\n\nBasicプランでは月30回のAI会話が可能です。',
  },
  upgrade: {
    patterns: ['アップグレード', 'upgrade', 'プラン', 'plan', 'basic', 'premium'],
    response: 'プランについてですね。\n\n- **Basic**: 月額980円で30回/月のAI会話\n- **Premium**: 月額2,980円で無制限AI会話（お持ちのAPIキー利用）\n\nダッシュボードの「サブスクリプション」からアップグレードできます。',
  },
  default: {
    response: 'Hooです。\n\nAI会話機能はBasicプラン以上でご利用いただけます。\n\n現在のFreeプランでは、セッション記録やダッシュボード機能をお試しいただけます。',
  },
};

/**
 * Get appropriate template response for Free tier
 */
function getFreeTierResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();

  for (const [, config] of Object.entries(FREE_TIER_RESPONSES)) {
    if ('patterns' in config && config.patterns.some(p => lowerMsg.includes(p))) {
      return config.response;
    }
  }

  return FREE_TIER_RESPONSES.default.response;
}

// ========================================
// Request Validation Schema
// ========================================

const hooChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(), // Existing conversation or new
  message: z.string().min(1).max(10000),
  includeSessionContext: z.boolean().optional(), // Include recent session context in prompt
});

// ========================================
// Response Type
// ========================================

interface HooChatApiResponse {
  conversationId: string;
  content: string;
  model: string;
  provider: 'claude' | 'gemini' | 'openai' | 'template';
  isAiResponse: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    used: number;
    limit: number;
  };
  turnInfo?: {
    current: number;
    softLimit: number;
    hardLimit: number;
    extended: boolean;
    extensionCost: number;
  };
  latencyMs?: number;
}

// ========================================
// POST Handler
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, clerkUserId, request }) => {
  // Rate limit: 10 requests per minute for AI endpoints
  const rateLimitResponse = await rateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const validationResult = hooChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error('[POST /api/hoo/chat] Validation failed', {
        errors: validationResult.error.errors,
      });
      return apiValidationError('Invalid request format', validationResult.error.errors);
    }

    const { conversationId, message, includeSessionContext } = validationResult.data;

    // Check subscription tier and usage
    const usageCheck = await subscriptionRepository.canUseHooConversation(internalUserId);

    // Fetch custom instructions (memory)
    const customInstructions = await hooMemoriesRepository.getCustomInstructions(internalUserId);

    // Fetch session context if requested (uses Clerk ID for mobile sessions)
    const sessionContext = includeSessionContext
      ? await sessionRepository.getSessionContextForHoo(clerkUserId, 3)
      : undefined;

    // Build system prompt with memory and optional session context
    const systemPrompt = getHooSystemPromptWithMemory(customInstructions, sessionContext);

    logger.info('[POST /api/hoo/chat] System prompt built', {
      clerkUserId,
      hasCustomInstructions: !!customInstructions,
      hasSessionContext: sessionContext?.hasContext ?? false,
      sessionCount: sessionContext?.recentSessions?.length ?? 0,
    });

    logger.info('[POST /api/hoo/chat] Processing request', {
      userId: internalUserId,
      tier: usageCheck.tier,
      allowed: usageCheck.allowed,
      conversationId,
      includeSessionContext: includeSessionContext ?? false,
    });

    // ========================================
    // Free Tier: Return template response
    // ========================================
    if (!usageCheck.allowed && usageCheck.reason === 'FREE_TIER') {
      const templateResponse = getFreeTierResponse(message);

      // Create/update conversation for history (even for free tier)
      let convId = conversationId;
      if (!convId) {
        const newConv = await hooConversationsRepository.create({
          userId: internalUserId,
          model: 'template',
          provider: 'claude', // placeholder
        });
        convId = newConv.id;
      }

      // Add user message
      await hooConversationsRepository.addMessage({
        conversationId: convId,
        role: 'user',
        content: message,
      });

      // Add template response
      await hooConversationsRepository.addMessage({
        conversationId: convId,
        role: 'assistant',
        content: templateResponse,
      });

      const response: HooChatApiResponse = {
        conversationId: convId,
        content: templateResponse,
        model: 'template',
        provider: 'template',
        isAiResponse: false,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          used: usageCheck.usage?.used ?? 0,
          limit: 0,
        },
      };

      return apiSuccess(response);
    }

    // ========================================
    // Usage Limit Exceeded
    // ========================================
    if (!usageCheck.allowed && usageCheck.reason === 'LIMIT_EXCEEDED') {
      return apiError('Monthly Hoo conversation limit reached. Upgrade to Premium for unlimited access.', {
        code: 'LIMIT_EXCEEDED',
        status: 429,
        details: {
          used: usageCheck.usage?.used,
          limit: usageCheck.usage?.limit,
        },
      });
    }

    // ========================================
    // Basic/Premium: AI Response
    // ========================================

    // Get or create conversation
    let conversation;
    let currentTurnCount = 0;
    let extensionCost = 0;
    let isExtended = false;

    if (conversationId) {
      conversation = await hooConversationsRepository.findById(conversationId);
      if (!conversation || conversation.userId !== internalUserId) {
        return apiError('Conversation not found', { code: 'NOT_FOUND', status: 404 });
      }

      // Calculate current turn count (messages / 2, since each turn = user + assistant)
      currentTurnCount = Math.floor((conversation.messageCount ?? 0) / 2);

      // Check hard limit (30 turns)
      if (currentTurnCount >= TURN_LIMITS.hardLimit) {
        return apiError('This conversation has reached the maximum turn limit. Please start a new conversation.', {
          code: 'TURN_LIMIT_EXCEEDED',
          status: 429,
          details: {
            currentTurn: currentTurnCount,
            hardLimit: TURN_LIMITS.hardLimit,
          },
        });
      }

      // Check if extension is needed (beyond soft limit)
      if (currentTurnCount >= TURN_LIMITS.softLimit) {
        // Calculate how many extensions have been used
        const turnsOverSoftLimit = currentTurnCount - TURN_LIMITS.softLimit;
        const extensionsUsed = Math.floor(turnsOverSoftLimit / TURN_LIMITS.turnsPerExtension);

        // Check if this turn triggers a new extension
        const nextTurn = currentTurnCount + 1;
        const turnsOverSoftLimitAfter = nextTurn - TURN_LIMITS.softLimit;
        const extensionsNeededAfter = Math.ceil(turnsOverSoftLimitAfter / TURN_LIMITS.turnsPerExtension);

        if (extensionsNeededAfter > extensionsUsed) {
          // Need to consume an additional conversation credit
          extensionCost = 1;
          isExtended = true;

          // Check if user has enough credits for extension
          if (usageCheck.usage && usageCheck.usage.limit > 0) {
            if (usageCheck.usage.used + extensionCost > usageCheck.usage.limit) {
              return apiError('Not enough conversation credits for extension. Please start a new conversation or upgrade to Premium.', {
                code: 'EXTENSION_LIMIT_EXCEEDED',
                status: 429,
                details: {
                  used: usageCheck.usage.used,
                  limit: usageCheck.usage.limit,
                  extensionCost,
                },
              });
            }
          }

          // Increment usage for extension
          await subscriptionRepository.incrementHooConversationsUsed(internalUserId);
          logger.info('[POST /api/hoo/chat] Extension consumed', {
            userId: internalUserId,
            conversationId,
            currentTurn: currentTurnCount,
            extensionCost,
          });
        }
      }
    } else {
      conversation = await hooConversationsRepository.create({
        userId: internalUserId,
        model: 'claude-haiku-4-5-20251001',
        provider: 'claude',
      });
    }

    // Add user message first
    await hooConversationsRepository.addMessage({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    });

    // Build message history for AI
    const updatedConversation = await hooConversationsRepository.findById(conversation.id);
    const messages: HooChatMessage[] = (updatedConversation?.messages ?? []).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Send to AI (Claude Haiku 4.5)
    const startTime = Date.now();
    const aiResponse = await sendHooChat('claude-haiku', messages, {
      systemPrompt,
    });
    const latencyMs = Date.now() - startTime;

    // Add AI response to conversation
    await hooConversationsRepository.addMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse.content,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
      costUsd: aiResponse.cost.total,
    });

    // Increment usage counter (only count once per conversation session start)
    // We count when first message is sent in a new conversation
    const isNewConversation = !conversationId;
    if (isNewConversation) {
      await subscriptionRepository.incrementHooConversationsUsed(internalUserId);
    }

    // Title generation logic:
    // 1. New conversation: generate title
    // 2. Resumed conversation with no title: generate title
    // 3. Extended conversation (11th turn, 21st turn, etc.): regenerate title to reflect new context
    const needsTitleGeneration = isNewConversation;
    const needsTitleRegeneration = isExtended; // Regenerate on extension
    const hasNoTitle = !conversation.title || conversation.title.startsWith('Conversation') || conversation.title === 'New conversation';
    const shouldGenerateTitle = needsTitleGeneration || (hasNoTitle && conversationId) || needsTitleRegeneration;

    if (shouldGenerateTitle) {
      // Get first and last messages for better title context
      const allMessages = updatedConversation?.messages ?? [];
      const userMsgs = allMessages.filter(m => m.role === 'user');
      const assistantMsgs = allMessages.filter(m => m.role === 'assistant');

      const firstUserMsg = userMsgs[0]?.content ?? message;
      const firstAssistantMsg = assistantMsgs[0]?.content ?? aiResponse.content;
      // For last messages: use current exchange (message + aiResponse.content)
      const lastUserMsg = message;
      const lastAssistantMsg = aiResponse.content;

      // Generate title (async, don't block response)
      generateConversationTitle(firstUserMsg, firstAssistantMsg, lastUserMsg, lastAssistantMsg)
        .then((title) => {
          logger.info('[POST /api/hoo/chat] Generated title', {
            conversationId: conversation.id,
            title,
            reason: needsTitleGeneration ? 'new' : needsTitleRegeneration ? 'extension' : 'missing',
          });
          return hooConversationsRepository.updateTitle(conversation.id, title);
        })
        .then((updated) => {
          logger.info('[POST /api/hoo/chat] Title saved', { updated: !!updated });
        })
        .catch((err) => logger.warn('[POST /api/hoo/chat] Title generation failed', { err }));
    }

    // Get updated usage
    const updatedUsage = await subscriptionRepository.getHooUsageLimits(internalUserId);

    logger.info('[POST /api/hoo/chat] Response generated', {
      userId: internalUserId,
      conversationId: conversation.id,
      model: aiResponse.model,
      latencyMs,
      totalTokens: aiResponse.usage.totalTokens,
      costUsd: aiResponse.cost.total.toFixed(6),
    });

    // Calculate the new turn count after this exchange
    const newTurnCount = currentTurnCount + 1;

    const response: HooChatApiResponse = {
      conversationId: conversation.id,
      content: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      isAiResponse: true,
      usage: {
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        used: updatedUsage.hooConversations.used,
        limit: updatedUsage.hooConversations.limit,
      },
      turnInfo: {
        current: newTurnCount,
        softLimit: TURN_LIMITS.softLimit,
        hardLimit: TURN_LIMITS.hardLimit,
        extended: isExtended,
        extensionCost,
      },
      latencyMs,
    };

    return apiSuccess(response);
  } catch (error) {
    logger.error('[POST /api/hoo/chat] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific API errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Anthropic billing error
    if (errorMessage.includes('credit balance is too low')) {
      return apiError('AI service temporarily unavailable. Please try again later.', {
        code: 'SERVICE_ERROR',
        status: 503,
      });
    }

    // API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return apiError('AI service configuration error.', {
        code: 'CONFIG_ERROR',
        status: 500,
      });
    }

    // Rate limit
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      return apiError('AI service rate limited. Please wait a moment.', {
        code: 'RATE_LIMIT',
        status: 429,
      });
    }

    // Timeout error
    if (errorMessage.includes('timeout')) {
      return apiError('AI request timed out. Please try again.', {
        code: 'TIMEOUT',
        status: 504,
      });
    }

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});

// ========================================
// GET Handler (Usage Info)
// ========================================

export const GET = withAuthResolved(async ({ internalUserId }) => {
  const usageLimits = await subscriptionRepository.getHooUsageLimits(internalUserId);
  const stats = await hooConversationsRepository.getUserStats(internalUserId);

  return apiSuccess({
    tier: usageLimits.tier,
    usage: usageLimits.hooConversations,
    stats,
  });
});
