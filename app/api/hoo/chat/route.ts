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
import { dawLogsRepository } from '@/lib/repositories/daw-logs.repository';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { getHooSystemPromptWithMemory } from '@/lib/ai/hoo-prompt';
import { trialService, TRIAL_TURNS_LIMIT } from '@/lib/services/trial.service';
import { logger } from '@/lib/utils/logger';
import type { DawAction } from '@/db/schema/muednote-daw-logs';

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
// DAW Log Context Builder
// ========================================

const ACTION_LABELS: Record<DawAction, string> = {
  parameter_change: 'パラメータ変更',
  track_volume: 'トラックボリューム',
  track_pan: 'トラックパン',
  track_select: 'トラック選択',
  clip_trigger: 'クリップトリガー',
  device_config_change: 'デバイス設定変更',
};

const DAW_LABELS: Record<string, string> = {
  ableton: 'Ableton Live',
  protools: 'Pro Tools',
  logic: 'Logic Pro',
  other: 'DAW',
};

/**
 * Build a human-readable summary of recent DAW logs for Hoo context.
 * Returns null if no logs found.
 */
async function buildDawLogContext(internalUserId: string): Promise<string | null> {
  // Fetch last 3 hours of DAW logs
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const until = new Date();
  const logs = await dawLogsRepository.getByTimeRange(internalUserId, since, until, 200);

  if (logs.length === 0) return null;

  // Determine DAW type
  const dawCounts: Record<string, number> = {};
  for (const log of logs) {
    const daw = log.daw || 'other';
    dawCounts[daw] = (dawCounts[daw] || 0) + 1;
  }
  const primaryDaw = Object.entries(dawCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Time range (getByTimeRange sorts asc, so first = oldest, last = newest)
  const oldest = logs[0].ts;
  const newest = logs[logs.length - 1].ts;
  const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  // Group by action
  const byAction: Record<string, number> = {};
  for (const log of logs) {
    const action = log.action || 'parameter_change';
    byAction[action] = (byAction[action] || 0) + 1;
  }

  // Extract unique track/device names from metadata
  const trackNames = new Set<string>();
  const deviceNames = new Set<string>();
  for (const log of logs) {
    const meta = log.metadata as Record<string, unknown> | null;
    if (meta) {
      if (typeof meta.trackName === 'string' && meta.trackName) trackNames.add(meta.trackName);
      if (typeof meta.deviceName === 'string' && meta.deviceName) deviceNames.add(meta.deviceName);
    }
  }

  // Build summary
  let summary = `## DAWログ（直近の制作アクティビティ）\n\n`;
  summary += `ユーザーはDAWで制作作業を行っています。以下はDAWから自動取得した操作ログのサマリーです。\n`;
  summary += `ユーザーの制作状況を把握するために活用してください。\n\n`;
  summary += `- **DAW**: ${DAW_LABELS[primaryDaw] || primaryDaw}\n`;
  summary += `- **期間**: ${formatTime(oldest)}〜${formatTime(newest)}\n`;
  summary += `- **操作数**: ${logs.length}件\n`;

  // Action breakdown
  summary += `- **操作内訳**:\n`;
  for (const [action, count] of Object.entries(byAction).sort((a, b) => b[1] - a[1])) {
    const label = ACTION_LABELS[action as DawAction] || action;
    summary += `  - ${label}: ${count}件\n`;
  }

  // Track/device names
  if (trackNames.size > 0) {
    summary += `- **使用トラック**: ${[...trackNames].slice(0, 8).join(', ')}\n`;
  }
  if (deviceNames.size > 0) {
    summary += `- **使用デバイス/プラグイン**: ${[...deviceNames].slice(0, 8).join(', ')}\n`;
  }

  // Recent notable changes (last 5 with valueString)
  const recentLogs = logs.slice(-10).reverse().filter(l => l.valueString);
  if (recentLogs.length > 0) {
    summary += `\n### 直近の操作（新しい順）\n`;
    for (const log of recentLogs.slice(0, 5)) {
      const meta = log.metadata as Record<string, unknown> | null;
      const trackName = meta?.trackName as string || '';
      const deviceName = meta?.deviceName as string || '';
      const actionLabel = ACTION_LABELS[log.action as DawAction] || log.action;
      const time = formatTime(log.ts);
      const parts = [time, actionLabel];
      if (trackName) parts.push(`Track: ${trackName}`);
      if (deviceName) parts.push(`Device: ${deviceName}`);
      parts.push(`→ ${log.valueString}`);
      summary += `- ${parts.join(' / ')}\n`;
    }
  }

  return summary;
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

    // Fetch MUEDlobe special instructions for Premium users
    let muedlobeInstructions: string[] | null = null;
    if (usageCheck.tier === 'premium') {
      try {
        const hooConfig = await cognitiveProfileRepository.findHooConfig(clerkUserId);
        if (hooConfig?.specialInstructions) {
          muedlobeInstructions = hooConfig.specialInstructions as string[];
        }
      } catch (err) {
        logger.warn('[POST /api/hoo/chat] MUEDlobe config fetch failed', { err });
      }
    }

    // Fetch session context if requested (uses Clerk ID for mobile sessions)
    const sessionContext = includeSessionContext
      ? await sessionRepository.getSessionContextForHoo(clerkUserId, 3)
      : undefined;

    // Fetch DAW log context (uses internal user ID)
    let dawLogContext: string | null = null;
    try {
      dawLogContext = await buildDawLogContext(internalUserId);
    } catch (err) {
      logger.warn('[POST /api/hoo/chat] DAW log context fetch failed', { err });
    }

    // Build system prompt with memory, MUEDlobe profile, and optional session context
    let systemPrompt = getHooSystemPromptWithMemory(customInstructions, sessionContext, muedlobeInstructions);

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
