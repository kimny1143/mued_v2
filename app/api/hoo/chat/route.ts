/**
 * Hoo AI Chat API (Production)
 * POST /api/hoo/chat
 *
 * All tiers: Unlimited Hoo AI conversation (MUEDnote free-ified)
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { sendHooChat, generateConversationTitle, type HooChatMessage } from '@/lib/ai/providers';
import { subscriptionRepository } from '@/lib/repositories/subscriptions.repository';
import { sessionRepository } from '@/lib/repositories/sessions.repository';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { dawLogsRepository } from '@/lib/repositories/daw-logs.repository';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { getHooSystemPromptWithMemory } from '@/lib/ai/hoo-prompt';
import { buildMusicalDawContext } from '@/lib/services/daw-log-interpreter.service';
import { profileGeneratorService } from '@/lib/services/profile-generator.service';
import { logger } from '@/lib/utils/logger';

// ========================================
// Free Tier Template Responses
// ========================================

// ========================================
// Request Validation Schema
// ========================================

/**
 * Context types for Hoo conversations:
 * - profile: Discussing the user's musical profile, preferences, or growth
 * - care: Timer break reminders, wellness check-ins, rest suggestions
 * - general: Default — open conversation about music creation
 */
const hooChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  context: z.enum(['profile', 'care', 'general']).optional().default('general'),
  includeSessionContext: z.boolean().optional(),
  localSessionContext: z.string().max(10000).optional(),
});

// ========================================
// Response Type
// ========================================

interface HooChatApiResponse {
  conversationId: string;
  content: string;
  model: string;
  provider: 'claude' | 'gemini' | 'openai';
  isAiResponse: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    threadsUsed: number;
    threadsLimit: number;
    turnsUsed: number;
    turnsLimit: number;
  };
  latencyMs?: number;
}

// ========================================
// DAW Log Context Builder (via daw-log-interpreter service)
// ========================================

async function buildDawLogContextForUser(userId: string): Promise<string | null> {
  const logs = await dawLogsRepository.getLogs({ userId, limit: 1000 });
  return buildMusicalDawContext(logs);
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

    const { conversationId, message, context, includeSessionContext, localSessionContext } = validationResult.data;

    // Check subscription tier and usage
    const usageCheck = await subscriptionRepository.canUseHooConversation(internalUserId);

    // Fetch custom instructions (memory)
    const customInstructions = await hooMemoriesRepository.getCustomInstructions(internalUserId);

    // Fetch MUEDlobe special instructions for all users (free-ified)
    let muedlobeInstructions: string[] | null = null;
    try {
      const hooConfig = await cognitiveProfileRepository.findHooConfig(clerkUserId);
      if (hooConfig?.specialInstructions) {
        muedlobeInstructions = hooConfig.specialInstructions as string[];
      }
    } catch (err) {
      logger.warn('[POST /api/hoo/chat] MUEDlobe config fetch failed', { err });
    }

    // Fetch session context if requested (uses Clerk ID for mobile sessions)
    const sessionContext = includeSessionContext
      ? await sessionRepository.getSessionContextForHoo(clerkUserId, 3)
      : undefined;

    // Fetch DAW log context (uses Clerk ID — DAW logs store Clerk ID)
    let dawLogContext: string | null = null;
    try {
      dawLogContext = await buildDawLogContextForUser(clerkUserId);
    } catch (err) {
      logger.warn('[POST /api/hoo/chat] DAW log context fetch failed', { err });
    }

    // Build system prompt with memory, MUEDlobe profile, and optional session context
    let systemPrompt = getHooSystemPromptWithMemory(customInstructions, sessionContext, muedlobeInstructions);

    // Append conversation context directive
    if (context === 'profile') {
      systemPrompt += `\n\n---\n\n## 会話コンテキスト: プロファイル\nこの会話はユーザーの音楽的プロファイル（好み・傾向・成長領域）について話しています。プロファイルの確認・修正・深掘りに集中してください。`;
    } else if (context === 'care') {
      systemPrompt += `\n\n---\n\n## 会話コンテキスト: ケア\nこの会話はタイマー休憩やウェルネスチェックインの文脈です。短く優しいトーンで、休憩を促したり、制作のペースについてケアしてください。長い回答は不要です。`;
    }

    // Append DAW log context
    if (dawLogContext) {
      systemPrompt += `\n\n---\n\n${dawLogContext}`;
    }

    // Append local device session context (includes unsynced transcriptions/memos)
    if (localSessionContext) {
      systemPrompt += `\n\n---\n\n## モバイルデバイスからの最新セッション情報\n\n以下はユーザーのデバイスから直接送られた最新のセッションデータです。サーバーにまだ同期されていない情報（文字起こし結果やメモ）を含みます。\nこのデータを会話の文脈として活用してください。\n\n${localSessionContext}`;
    }

    logger.info('[POST /api/hoo/chat] System prompt built', {
      clerkUserId,
      hasCustomInstructions: !!customInstructions,
      hasMuedlobeInstructions: !!muedlobeInstructions,
      muedlobeInstructionsCount: muedlobeInstructions?.length ?? 0,
      hasSessionContext: sessionContext?.hasContext ?? false,
      sessionCount: sessionContext?.recentSessions?.length ?? 0,
      hasDawLogContext: !!dawLogContext,
      hasLocalContext: !!localSessionContext,
      localContextLength: localSessionContext?.length ?? 0,
    });

    logger.info('[POST /api/hoo/chat] Processing request', {
      userId: internalUserId,
      tier: usageCheck.tier,
      allowed: usageCheck.allowed,
      conversationId,
      includeSessionContext: includeSessionContext ?? false,
    });

    // ========================================
    // AI Response (all tiers — MUEDnote free-ified)
    // ========================================

    // Determine if this is a new conversation
    const isNewConversation = !conversationId;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await hooConversationsRepository.findById(conversationId);
      if (!conversation || conversation.userId !== internalUserId) {
        return apiError('Conversation not found', { code: 'NOT_FOUND', status: 404 });
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

    // Increment usage counters (for analytics tracking)
    await subscriptionRepository.incrementHooTurnsUsed(internalUserId);
    if (isNewConversation) {
      await subscriptionRepository.incrementHooConversationsUsed(internalUserId);
    }

    // Title generation logic:
    // 1. New conversation: generate title
    // 2. Resumed conversation with no title: generate title
    const needsTitleGeneration = isNewConversation;
    const hasNoTitle = !conversation.title || conversation.title.startsWith('Conversation') || conversation.title === 'New conversation';
    const shouldGenerateTitle = needsTitleGeneration || (hasNoTitle && conversationId);

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
            reason: needsTitleGeneration ? 'new' : 'missing',
          });
          return hooConversationsRepository.updateTitle(conversation.id, title);
        })
        .then((updated) => {
          logger.info('[POST /api/hoo/chat] Title saved', { updated: !!updated });
        })
        .catch((err) => logger.warn('[POST /api/hoo/chat] Title generation failed', { err }));
    }

    // Fire-and-forget: incremental profile update from this conversation
    profileGeneratorService
      .updateFromConversation(internalUserId, conversation.id)
      .catch((err) => logger.warn('[POST /api/hoo/chat] Profile update failed', { err }));

    // Get updated usage
    const updatedUsage = await subscriptionRepository.getHooUsageLimits(internalUserId);

    logger.info('[POST /api/hoo/chat] Response generated', {
      userId: internalUserId,
      conversationId: conversation.id,
      model: aiResponse.model,
      latencyMs,
      totalTokens: aiResponse.usage.totalTokens,
      costUsd: aiResponse.cost.total.toFixed(6),
      turnsUsed: updatedUsage.hooTurns.used,
      threadsUsed: updatedUsage.hooThreads.used,
    });

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
        threadsUsed: updatedUsage.hooThreads.used,
        threadsLimit: updatedUsage.hooThreads.limit,
        turnsUsed: updatedUsage.hooTurns.used,
        turnsLimit: updatedUsage.hooTurns.limit,
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
// GET Handler (Usage Info including Trial)
// ========================================

export const GET = withAuthResolved(async ({ internalUserId }) => {
  const usageLimits = await subscriptionRepository.getHooUsageLimits(internalUserId);
  const stats = await hooConversationsRepository.getUserStats(internalUserId);

  return apiSuccess({
    tier: usageLimits.tier,
    effectiveTier: usageLimits.tier,
    threads: usageLimits.hooThreads,
    turns: usageLimits.hooTurns,
    stats,
  });
});
