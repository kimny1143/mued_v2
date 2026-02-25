/**
 * Hoo AI Chat API (Production)
 * POST /api/hoo/chat
 *
 * Tier-based AI conversation for MUEDnote:
 * - Free: Template responses only (3-day trial available: 50 turns)
 * - Basic: Unlimited Hoo AI conversation
 * - Premium: Personalized Hoo AI (accumulated data + MUEDlobe cognitive profile)
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
import { getHooSystemPromptWithMemory } from '@/lib/ai/hoo-prompt';
import { trialService, TRIAL_TURNS_LIMIT } from '@/lib/services/trial.service';
import { logger } from '@/lib/utils/logger';

// ========================================
// Free Tier Template Responses
// ========================================

// ========================================
// Request Validation Schema
// ========================================

const hooChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(), // Existing conversation or new
  message: z.string().min(1).max(10000),
  includeSessionContext: z.boolean().optional(), // Include recent session context in prompt
  localSessionContext: z.string().max(10000).optional(), // Local device session data (transcriptions, memos not yet synced)
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
    // Thread usage (soft limit)
    threadsUsed: number;
    threadsLimit: number;
    // Turn usage (hard limit)
    turnsUsed: number;
    turnsLimit: number;
  };
  // Alert if thread soft limit is exceeded (doesn't block, just shows warning)
  threadAlert?: boolean;
  // Trial info (for Free tier users)
  trial?: {
    isInTrial: boolean;
    turnsUsed: number;
    turnsRemaining: number;
    daysRemaining: number;
    trialEndsAt: string | null;
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

    const { conversationId, message, includeSessionContext, localSessionContext } = validationResult.data;

    // Check subscription tier and usage (including trial)
    const usageCheck = await subscriptionRepository.canUseHooConversation(internalUserId);
    const trialCheck = await trialService.canUseHooAI(internalUserId);

    // Fetch custom instructions (memory)
    const customInstructions = await hooMemoriesRepository.getCustomInstructions(internalUserId);

    // Fetch session context if requested (uses Clerk ID for mobile sessions)
    const sessionContext = includeSessionContext
      ? await sessionRepository.getSessionContextForHoo(clerkUserId, 3)
      : undefined;

    // Build system prompt with memory and optional session context
    let systemPrompt = getHooSystemPromptWithMemory(customInstructions, sessionContext);

    // Append local device session context (includes unsynced transcriptions/memos)
    if (localSessionContext) {
      systemPrompt += `\n\n---\n\n## モバイルデバイスからの最新セッション情報\n\n以下はユーザーのデバイスから直接送られた最新のセッションデータです。サーバーにまだ同期されていない情報（文字起こし結果やメモ）を含みます。\nこのデータを会話の文脈として活用してください。\n\n${localSessionContext}`;
    }

    logger.info('[POST /api/hoo/chat] System prompt built', {
      clerkUserId,
      hasCustomInstructions: !!customInstructions,
      hasSessionContext: sessionContext?.hasContext ?? false,
      sessionCount: sessionContext?.recentSessions?.length ?? 0,
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
    // Free Tier: Auto-start trial or return trial expired message
    // ========================================
    if (!usageCheck.allowed && usageCheck.reason === 'FREE_TIER') {
      // Check if user can use trial
      if (trialCheck.isInTrial) {
        // User is in trial - proceed with AI response (handled below)
        logger.info('[POST /api/hoo/chat] User in active trial', {
          userId: internalUserId,
          trialStatus: trialCheck.trialStatus,
        });
      } else if (trialCheck.reason === 'TRIAL_NOT_STARTED') {
        // Auto-start trial on first Hoo use
        const startResult = await trialService.startTrial(internalUserId);
        if (startResult.success) {
          logger.info('[POST /api/hoo/chat] Trial auto-started', {
            userId: internalUserId,
            trialStartedAt: startResult.trialStartedAt,
          });
          // Refresh trial check after starting
          const refreshedTrialCheck = await trialService.canUseHooAI(internalUserId);
          Object.assign(trialCheck, refreshedTrialCheck);
        } else {
          logger.error('[POST /api/hoo/chat] Failed to start trial', {
            userId: internalUserId,
            error: startResult.error,
          });
          // Fall through to template response
        }
      } else {
        // Trial expired or exhausted - return upgrade message
        const trialExpiredResponse = `Hooです。

3日間の無料トライアルが終了しました。

Hoo AIとの会話を続けるには、Basicプランへのアップグレードをご検討ください。

- **Basic**: 月額1,980円でHoo AI無制限会話 + Whisper + DAWログ連携
- **Premium**: 月額2,980円で上記すべて + Hoo個人化 + MUEDlobe認知プロファイル

ダッシュボードの「サブスクリプション」からアップグレードできます。

---

Your 3-day free trial has ended.

To continue conversations with Hoo AI, please consider upgrading to Basic.

- **Basic**: ¥1,980/month for unlimited Hoo AI + Whisper + DAW log integration
- **Premium**: ¥2,980/month for all Basic features + personalized Hoo + MUEDlobe

You can upgrade from "Subscription" in your dashboard.`;

        // Create/update conversation for history
        let convId = conversationId;
        if (!convId) {
          const newConv = await hooConversationsRepository.create({
            userId: internalUserId,
            model: 'template',
            provider: 'claude',
          });
          convId = newConv.id;
        }

        await hooConversationsRepository.addMessage({
          conversationId: convId,
          role: 'user',
          content: message,
        });

        await hooConversationsRepository.addMessage({
          conversationId: convId,
          role: 'assistant',
          content: trialExpiredResponse,
        });

        const response: HooChatApiResponse = {
          conversationId: convId,
          content: trialExpiredResponse,
          model: 'template',
          provider: 'template',
          isAiResponse: false,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            threadsUsed: 0,
            threadsLimit: 0,
            turnsUsed: 0,
            turnsLimit: 0,
          },
          trial: {
            isInTrial: false,
            turnsUsed: trialCheck.trialStatus?.turnsUsed ?? TRIAL_TURNS_LIMIT,
            turnsRemaining: 0,
            daysRemaining: 0,
            trialEndsAt: trialCheck.trialStatus?.trialEndsAt?.toISOString() ?? null,
          },
        };

        return apiSuccess(response);
      }
    }

    // ========================================
    // Turn Limit Exceeded (Hard Limit) - Basic/Premium
    // ========================================
    if (!usageCheck.allowed && usageCheck.reason === 'TURN_LIMIT_EXCEEDED') {
      return apiError('Monthly Hoo turn limit reached. Upgrade to Premium for unlimited access.', {
        code: 'TURN_LIMIT_EXCEEDED',
        status: 429,
        details: {
          turnsUsed: usageCheck.usage?.turnsUsed,
          turnsLimit: usageCheck.usage?.turnsLimit,
          threadsUsed: usageCheck.usage?.threadsUsed,
          threadsLimit: usageCheck.usage?.threadsLimit,
        },
      });
    }

    // ========================================
    // Trial Turn Limit Check (for trial users)
    // ========================================
    if (trialCheck.isInTrial && trialCheck.trialStatus) {
      if (trialCheck.trialStatus.turnsRemaining <= 0) {
        return apiError('Trial turn limit reached. Upgrade to Basic for unlimited Hoo AI.', {
          code: 'TRIAL_LIMIT_EXCEEDED',
          status: 429,
          details: {
            turnsUsed: trialCheck.trialStatus.turnsUsed,
            turnsLimit: TRIAL_TURNS_LIMIT,
            daysRemaining: trialCheck.trialStatus.daysRemaining,
          },
        });
      }
    }

    // ========================================
    // Basic/Premium: AI Response
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

    // Increment usage counters
    let trialUsageResult: { turnsUsed: number; turnsRemaining: number } | undefined;

    if (trialCheck.isInTrial) {
      // Trial user: increment trial turns (not regular subscription turns)
      trialUsageResult = await trialService.incrementTrialTurns(internalUserId);
      logger.info('[POST /api/hoo/chat] Trial turn incremented', {
        userId: internalUserId,
        turnsUsed: trialUsageResult.turnsUsed,
        turnsRemaining: trialUsageResult.turnsRemaining,
      });
    } else {
      // Paid user: increment regular subscription turns
      // 1. Turn count: increment for EVERY user message (already validated above)
      await subscriptionRepository.incrementHooTurnsUsed(internalUserId);

      // 2. Thread count: increment only for NEW conversations
      if (isNewConversation) {
        await subscriptionRepository.incrementHooConversationsUsed(internalUserId);
      }
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

    // Build trial info if applicable
    let trialInfo: HooChatApiResponse['trial'] | undefined;
    if (trialCheck.isInTrial && trialUsageResult) {
      // Refresh trial status for accurate remaining count
      const updatedTrialStatus = await trialService.getTrialStatus(internalUserId);
      trialInfo = {
        isInTrial: true,
        turnsUsed: trialUsageResult.turnsUsed,
        turnsRemaining: trialUsageResult.turnsRemaining,
        daysRemaining: updatedTrialStatus.daysRemaining,
        trialEndsAt: updatedTrialStatus.trialEndsAt?.toISOString() ?? null,
      };
    }

    const response: HooChatApiResponse = {
      conversationId: conversation.id,
      content: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      isAiResponse: true,
      usage: trialCheck.isInTrial
        ? {
            // Trial users: show trial usage instead of subscription usage
            inputTokens: aiResponse.usage.inputTokens,
            outputTokens: aiResponse.usage.outputTokens,
            totalTokens: aiResponse.usage.totalTokens,
            threadsUsed: 0,
            threadsLimit: 0,
            turnsUsed: trialUsageResult?.turnsUsed ?? 0,
            turnsLimit: TRIAL_TURNS_LIMIT,
          }
        : {
            inputTokens: aiResponse.usage.inputTokens,
            outputTokens: aiResponse.usage.outputTokens,
            totalTokens: aiResponse.usage.totalTokens,
            threadsUsed: updatedUsage.hooThreads.used,
            threadsLimit: updatedUsage.hooThreads.limit,
            turnsUsed: updatedUsage.hooTurns.used,
            turnsLimit: updatedUsage.hooTurns.limit,
          },
      threadAlert: usageCheck.threadAlert,
      trial: trialInfo,
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
  const trialStatus = await trialService.getTrialStatus(internalUserId);

  // Determine effective tier (basic if in trial)
  const effectiveTier = trialStatus.isInTrial ? 'basic' : usageLimits.tier;

  return apiSuccess({
    tier: usageLimits.tier,
    effectiveTier,
    // Thread usage (soft limit) - not applicable for trial
    threads: usageLimits.hooThreads,
    // Turn usage (hard limit) - shows trial usage if in trial
    turns: trialStatus.isInTrial
      ? { used: trialStatus.turnsUsed, limit: TRIAL_TURNS_LIMIT }
      : usageLimits.hooTurns,
    // Trial info
    trial: {
      isInTrial: trialStatus.isInTrial,
      hasTrialStarted: trialStatus.hasTrialStarted,
      trialUsed: trialStatus.trialUsed,
      turnsUsed: trialStatus.turnsUsed,
      turnsRemaining: trialStatus.turnsRemaining,
      daysRemaining: trialStatus.daysRemaining,
      trialStartedAt: trialStatus.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: trialStatus.trialEndsAt?.toISOString() ?? null,
    },
    stats,
  });
});
