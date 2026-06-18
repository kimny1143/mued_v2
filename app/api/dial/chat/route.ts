/**
 * MUEDial Chat API (Dialogue Mode)
 * POST /api/dial/chat
 * GET  /api/dial/chat
 *
 * Hoo guides the user through mixing parameter adjustments.
 * Uses tool calling for structured parameter changes (no JSON in text).
 *
 * Flow:
 *   1. User sends message ("ボーカルもう少し前に出して")
 *   2. Hoo responds with text + tool call (propose_mix_action)
 *   3. Client receives action + parameterChanges separately from text
 */

import { z } from 'zod';
import { eq, asc, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership, verifyDialSessionReadAccess } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { sendHooChat, type HooChatMessage } from '@/lib/ai/providers';
import { buildDialSystemPrompt, selectToolsByState, type DialPromptInput } from '@/lib/ai/prompts/dial';
import { detectPhase } from '@/lib/dial/phase';
import { isMasteringToolPhase, type DialState } from '@/lib/dial/session-state';
import { syntheticToolResultContent, deriveChatTaskState, textProposesPreview } from '@/lib/dial/chat-tool-results';
import { createRoExClient, compareMixes } from '@/lib/roex';
import type { AnalysisResult, ComparisonResult } from '@/lib/roex';
import { db } from '@/db';
import { dialSessions, dialTracks, dialMessages, dialTasks } from '@/db/schema';

// Allow up to 60s for AI responses (Vercel Pro limit)
export const maxDuration = 60;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParameterChange {
  track: string;
  changes: Record<string, unknown>;
  reason: string;
}

interface MixActionInput {
  action: 'adjust_preview' | 'request_mix_check' | 'request_final';
  parameter_changes?: ParameterChange[];
}

interface MasteringActionInput {
  action: 'set_mastering_params' | 'request_mastering_final';
  desiredLoudness?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ─── Request Validation ─────────────────────────────────────────────────────

const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  locale: z.enum(['en', 'ja']).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildFxSummary(fxSettings: unknown): string | undefined {
  if (!fxSettings || typeof fxSettings !== 'object') return undefined;

  try {
    const settings = fxSettings as Record<string, unknown>;
    const entries = Object.entries(settings);
    if (entries.length === 0) return undefined;

    return JSON.stringify(fxSettings, null, 2).slice(0, 2000);
  } catch {
    return undefined;
  }
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export const POST = withDialAuth(async (auth) => {
  try {
    // Rate limit: 20 chat messages per minute
    const rateLimitResponse = await rateLimit(auth.request, "dial");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await auth.request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, message, locale: bodyLocale } = parsed.data;

    // Resolve locale: body > NEXT_LOCALE cookie > default 'ja'
    const cookies = auth.request.headers.get('cookie') ?? '';
    const cookieLocale = cookies.split('; ').find((c) => c.startsWith('NEXT_LOCALE='))?.split('=')[1] as 'en' | 'ja' | undefined;
    const locale: 'en' | 'ja' = bodyLocale ?? (cookieLocale === 'en' || cookieLocale === 'ja' ? cookieLocale : 'ja');

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    const isOmakase = session.mode === 'omakase';

    // Load tracks for context
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, sessionId),
    });

    // Load latest completed task (for FX summary + preview URL)
    const latestTask = await db.query.dialTasks.findFirst({
      where: eq(dialTasks.sessionId, sessionId),
      orderBy: [desc(dialTasks.createdAt)],
    });

    // Load all tasks for phase detection
    const allTasks = await db.query.dialTasks.findMany({
      where: eq(dialTasks.sessionId, sessionId),
    });

    // Detect phase using extracted pure function
    const phaseResult = detectPhase(session, allTasks);
    const { phase, hasMasteringPreview, masteringPreviewCount, mixFinalTask } = phaseResult;

    // Tier3 Phase 1b read-side (minimal cut): the mastering gate now reads the explicit, durable
    // session `state` (isMasteringToolPhase) instead of detectPhase's task-inferred isMasteringPhase.
    // This is behavior-preserving — isMasteringToolPhase mirrors legacy isMasteringPhase across all
    // three modes (conductor-verified) — and drives both the mastering prompt and tool gate from the
    // state column. `phase` (1/2/3) stays on detectPhase for this cut.
    const isMasteringPhase = isMasteringToolPhase(
      session.state as DialState,
      session.mode,
      session.masteringMode,
    );

    // Check if any completed preview exists (latestTask is ordered by createdAt desc)
    const hasPreview = latestTask?.taskType === 'preview' && latestTask?.status === 'completed'
      || session.mixCheckCount > 0;

    // Build system prompt with session context (including retake info)
    const promptInput: DialPromptInput = {
      mode: (session.mode as 'omakase' | 'dialogue') ?? (session.masteringMode as 'omakase' | 'dialogue') ?? 'omakase',
      previewCount: session.previewCount ?? 0,
      previewLimit: isOmakase ? 5 : 0,
      musicalStyle: session.musicalStyle,
      tracks: tracks.map((t) => ({
        filename: t.originalFilename,
        instrumentGroup: t.instrumentGroup,
        presenceSetting: t.presenceSetting,
        panPreference: t.panPreference,
        reverbPreference: t.reverbPreference,
      })),
      currentFxSummary: latestTask?.fxSettings
        ? buildFxSummary(latestTask.fxSettings)
        : undefined,
      previewUrl: latestTask?.previewUrl ?? undefined,
      hasPreview: !!hasPreview,
      phase,
      mixCheckCount: session.mixCheckCount,
      paidCycleCount: session.paidCycleCount,
      baseCycleLimit: session.baseCycleLimit,
      additionalCyclesPurchased: session.additionalCyclesPurchased,
      additionalCycleLimit: session.additionalCycleLimit,
      // Mastering
      masteringMode: (session.masteringMode as 'omakase' | 'dialogue') ?? null,
      isMasteringPhase,
      masteringPreviewCount,
      hasMasteringPreview,
      masteringFinalUrl: allTasks.find((t) => t.taskType === 'mastering' && t.finalUrl)?.finalUrl ?? undefined,
      mixFinalUrl: mixFinalTask?.finalUrl ?? undefined,
      // Analysis
      analysisResult: session.analysisResult as DialPromptInput['analysisResult'] ?? null,
      // Reference track
      referenceAnalysis: session.referenceAnalysisResult as AnalysisResult | null ?? null,
      referenceFilename: session.referenceTrackFilename ?? null,
      comparisonResult: null as ComparisonResult | null, // populated below if applicable
      locale,
    };

    // If reference track exists and a preview is available, run comparison inline.
    // Free campaign sessions never set referenceTrackUrl (reference upload is blocked),
    // but guard explicitly so /mixcomparison can never bill the RoEx pool for a free session.
    if (!session.isFreeCampaign && session.referenceTrackUrl && latestTask?.previewUrl) {
      try {
        const roexClient = createRoExClient();
        const comparison = await compareMixes(
          roexClient,
          session.referenceTrackUrl,
          latestTask.previewUrl,
          session.musicalStyle,
        );
        promptInput.comparisonResult = comparison;
      } catch {
        // Comparison is best-effort — don't block chat if it fails
      }
    }

    let systemPrompt = buildDialSystemPrompt(promptInput);

    // Save user message
    await db.insert(dialMessages).values({
      sessionId,
      role: 'user',
      content: message,
    });

    // Load message history for AI context
    const existingMessages = await db.query.dialMessages.findMany({
      where: eq(dialMessages.sessionId, sessionId),
      orderBy: [asc(dialMessages.createdAt)],
    });

    // Inject last assistant action context for session restoration
    // This helps Hoo understand what UI state the user sees after page reload
    const lastAssistantMsg = existingMessages
      .filter((m) => m.role === 'assistant')
      .at(-1);
    if (lastAssistantMsg?.action) {
      const taskForAction = allTasks
        .filter((t) => t.status === 'processing' || t.status === 'completed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const taskStatus = taskForAction?.status ?? 'unknown';
      systemPrompt += locale === 'en'
        ? `\n\n---\n\n## Session Restore Context\nLast assistant action: ${lastAssistantMsg.action} (task status: ${taskStatus}).\n${taskStatus === 'processing' ? 'Task is still processing. No need to re-submit. Tell the user "still working on it, hang tight".' : taskStatus === 'completed' ? 'Previous action is complete. Continue the conversation about results. No need to call the same tool again.' : ''}`
        : `\n\n---\n\n## セッション復元コンテキスト\n直前のアシスタントアクション: ${lastAssistantMsg.action}（タスク状態: ${taskStatus}）。\n${taskStatus === 'processing' ? 'タスクは処理中。ボタンの再送信は不要。「処理中だよ、もう少し待ってね」等で対応。' : taskStatus === 'completed' ? '前回のアクションは完了済み。結果について会話を続ける。同じツールの再呼び出しは不要。' : ''}`;
    }

    // Current task reality — used to ground replayed tool_results (below) AND the suppress guard.
    // A hardcoded 'ok' tool_result made Hoo believe a failed/never-minted preview had succeeded, so
    // it refused to re-generate and the user dead-ended (no preview → no Final button). See
    // lib/dial/chat-tool-results.ts (Yuu incident, session e3688b24).
    const taskState = deriveChatTaskState(allTasks);

    // Reconstruct chat history — include tool_use/tool_result pairs so Hoo remembers past actions
    const chatMessages: HooChatMessage[] = [];
    for (const m of existingMessages) {
      if (m.role !== 'user' && m.role !== 'assistant') continue;
      const blocks = m.toolUseBlocks as Array<{ id: string; name: string; input: unknown }> | null;
      if (m.role === 'assistant' && blocks && blocks.length > 0) {
        // Assistant turn: text + tool_use blocks
        chatMessages.push({
          role: 'assistant',
          content: [
            { type: 'text', text: m.content },
            ...blocks.map((b) => ({ type: 'tool_use' as const, id: b.id, name: b.name, input: b.input })),
          ],
        });
        // Synthetic user turn: tool_result for each block (required by Anthropic API). The content
        // reflects the session's REAL task state so Hoo can't be fooled into thinking a preview /
        // render exists when it doesn't.
        chatMessages.push({
          role: 'user',
          content: blocks.map((b) => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: syntheticToolResultContent(b, taskState),
          })),
        });
      } else {
        chatMessages.push({ role: m.role as 'user' | 'assistant', content: m.content });
      }
    }

    // Send to AI with locale-aware tool definitions, gated by the explicit session state.
    // Pass the RAW session.mode (null for mastering-only) + masteringMode — NOT promptInput.mode
    // (which coalesces mastering-only's mode to masteringMode) — so isMasteringToolPhase distinguishes
    // mastering-only from mix+master. Mix dialogue no longer leaks the mastering tool (getDialTools
    // :1389) — it's offered only in the mastering tool-phase.
    const tools = selectToolsByState({
      state: session.state as DialState,
      mode: session.mode,
      masteringMode: session.masteringMode,
      locale,
    });

    const startTime = Date.now();
    // Hoo dialogue runs on Haiku (kimny cost policy). A prior PR (#38) switched this to Sonnet;
    // that dated Sonnet snapshot was later retired by Anthropic → 404 on every preview request.
    const aiResponse = await sendHooChat('claude-haiku', chatMessages, {
      systemPrompt,
      tools,
    });
    const latencyMs = Date.now() - startTime;

    // Extract tool call results (structured, not regex)
    const mixToolCall = aiResponse.toolCalls?.find((t) => t.name === 'propose_mix_action');
    const mixToolInput = mixToolCall?.input as MixActionInput | undefined;

    let action = mixToolInput?.action ?? null;
    const parameterChanges = mixToolInput?.parameter_changes ?? null;

    // Handle set_musical_style tool call — update session directly
    const styleToolCall = aiResponse.toolCalls?.find((t) => t.name === 'set_musical_style');
    let styleSet: string | null = null;
    if (styleToolCall) {
      const styleInput = styleToolCall.input as { style: string; reason?: string };
      if (styleInput.style) {
        await db.update(dialSessions)
          .set({ musicalStyle: styleInput.style, updatedAt: new Date() })
          .where(eq(dialSessions.id, sessionId));
        styleSet = styleInput.style;
      }
    }

    // Handle mastering tool call
    const masteringToolCall = aiResponse.toolCalls?.find((t) => t.name === 'propose_mastering_action');
    const masteringToolInput = masteringToolCall?.input as MasteringActionInput | undefined;
    let masteringAction = masteringToolInput?.action ?? null;
    const desiredLoudness = masteringToolInput?.desiredLoudness ?? null;

    // ─── Server-side guard: prevent invalid/duplicate paid actions ────────
    // 1. Block request_final/request_mix_check when no preview exists (AI hallucination)
    // 2. Block duplicate paid actions based on task existence
    const hasCompletedPreview = taskState.hasCompletedPreview;
    // forcePreview = the server is (re)directing/injecting a base preview. The response text is then
    // overridden below so Hoo never promises a Final/Mix button that can't render yet.
    let forcePreview = false;
    const currentAction = masteringAction ?? action;
    if (currentAction) {
      const hasFinalTask = allTasks.some((t) =>
        (t.taskType === 'final_basic' || t.taskType === 'final_advanced')
        && t.status !== 'failed',
      );
      const hasMasteringTask = allTasks.some((t) =>
        t.taskType === 'mastering' && t.status !== 'failed',
      );
      if ((currentAction === 'request_final' || currentAction === 'request_mix_check') && !hasCompletedPreview) {
        // No preview yet → a final/mix_check is premature. Don't just drop the action: that leaves
        // Hoo's "press the button below" text promising a button that never renders (the exact Yuu
        // symptom). Redirect to adjust_preview so the required base preview actually gets minted
        // (the client mints on adjust_preview regardless of parameter_changes).
        action = 'adjust_preview';
        masteringAction = null;
        forcePreview = true;
      } else if (
        // Duplicate paid actions — deliverable already exists; drop it (limits enforced downstream).
        (currentAction === 'request_final' && hasFinalTask)
        || (currentAction === 'request_mastering_final' && hasMasteringTask)
      ) {
        if (masteringAction === currentAction) masteringAction = null;
        if (action === currentAction) action = null;
      }
    }

    // ─── Auto-inject adjust_preview: Hoo narrated making a preview but forgot the tool ──
    // Haiku ~15% writes "プレビューを作るね" (or hallucinates "既に作成済み") without calling the tool,
    // so no preview ever mints and the user dead-ends. When no preview/mix task exists yet and Hoo's
    // text is about a preview, inject adjust_preview so the client reliably mints the first preview.
    if (!action && !masteringAction && !isMasteringPhase && !hasCompletedPreview && aiResponse.content) {
      const hasAnyMixTask = allTasks.some((t) =>
        (t.taskType === 'preview' || t.taskType === 'mix_check'
          || t.taskType === 'final_basic' || t.taskType === 'final_advanced')
        && t.status !== 'failed',
      );
      if (!hasAnyMixTask && textProposesPreview(aiResponse.content)) {
        action = 'adjust_preview';
        forcePreview = true;
      }
    }

    // ─── Auto-inject: if Hoo wrote about a button but forgot the tool call ──
    // haiku sometimes writes "下にボタンが表示されるから" without actually calling
    // the tool. Detect this and inject the appropriate action based on phase.
    // Regex is narrow to avoid false positives from explanatory text.
    if (!action && !masteringAction && aiResponse.content) {
      const text = aiResponse.content;
      // Only match the specific "button will appear" pattern Hoo uses when proposing actions
      const proposesAction = /ボタン.{0,5}(表示|押して|出る)|生成するね|生成するよ/.test(text);
      if (proposesAction) {
        const hasFinalTask = allTasks.some((t) =>
          (t.taskType === 'final_basic' || t.taskType === 'final_advanced')
          && t.status !== 'failed',
        );

        // R-1b (Tier3 Phase 1b): removed the text → request_mastering_final auto-promote. A paid
        // mastering commit (220cr) must be an explicit user click — same fail-closed principle as
        // R-1's request_final. The mastering final button still renders via the normal tool path
        // (Hoo's request_mastering_final tool call); set_mastering_params auto-inject + the server
        // guards (above) are unchanged.
        // R-1 (Tier3 Phase 1b): likewise never auto-promote text → request_final. Mix Check (not a
        // billable final) keeps its auto-inject so Hoo's "button will appear" UX still works.
        if (!isMasteringPhase && hasCompletedPreview && !hasFinalTask) {
          if (phase >= 2 && !/ファイナル|確定|final/i.test(text)) {
            action = 'request_mix_check';
          }
        }
      }
    }

    // Guard: if AI returned tool-only response (no text), insert contextual fallback
    let responseContent = aiResponse.content;
    if (!responseContent || responseContent.trim() === '') {
      const styleTool = aiResponse.toolCalls?.find((t) => t.name === 'set_musical_style');
      const mixTool = aiResponse.toolCalls?.find((t) => t.name === 'propose_mix_action');
      const masteringTool = aiResponse.toolCalls?.find((t) => t.name === 'propose_mastering_action');
      if (styleTool) {
        responseContent = locale === 'en'
          ? 'Genre set. Now, what vibe are you going for?'
          : 'ジャンルを設定したよ。どんな雰囲気に仕上げたいか教えてね。';
      } else if (mixTool) {
        const act = (mixTool.input as MixActionInput)?.action;
        if (act === 'adjust_preview') {
          responseContent = locale === 'en'
            ? 'Parameters applied. A new preview is being generated — give it a listen.'
            : 'パラメータを設定したよ。プレビューが生成されるから聴いてみて。';
        } else if (act === 'request_mix_check') {
          responseContent = locale === 'en'
            ? 'Mix Check requested. A button will appear below — press it to start generation.'
            : 'OK、Mix Checkを用意するね。下にボタンが表示されるから、良ければ押してね。';
        } else if (act === 'request_final') {
          responseContent = locale === 'en'
            ? 'Final Mix requested. A button will appear below — press it to start generation.'
            : 'Final Mixを用意するね。下にボタンが表示されるから、良ければ押してね。';
        } else {
          responseContent = locale === 'en' ? 'On it — give me a moment.' : '調整するね。もう少し待ってて。';
        }
      } else if (masteringTool) {
        const act = (masteringTool.input as MasteringActionInput)?.action;
        if (act === 'request_mastering_final') {
          responseContent = locale === 'en'
            ? 'Mastering Final requested. A button will appear below — press it to start generation.'
            : 'マスタリングを開始するね。下にボタンが表示されるから、良ければ押してね。';
        } else {
          responseContent = locale === 'en'
            ? 'Mastering parameters set. A new preview is being generated — have a listen.'
            : 'マスタリングパラメータを設定したよ。プレビューが生成されるから聴いてみて。';
        }
      } else {
        responseContent = locale === 'en' ? 'Let me check on that — just a moment.' : '少し確認中だよ。もう少し待ってて。';
      }
    }

    // When the server forced a base preview (premature-final redirect or preview auto-inject), make
    // the text say exactly that — never promise a Final/Mix button that won't render without a preview.
    if (forcePreview) {
      responseContent = locale === 'en'
        ? "Let's get a preview going first so you can hear the mix — generating it now."
        : 'まず今の設定でプレビューを作って聴いてもらうね。今すぐ生成するから少し待ってて。';
    }

    // Save assistant message — persist tool_use blocks for history reconstruction
    const effectiveAction = masteringAction ?? action;
    const toolUseBlocks = aiResponse.toolCalls && aiResponse.toolCalls.length > 0
      ? aiResponse.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, input: tc.input }))
      : null;
    await db.insert(dialMessages).values({
      sessionId,
      role: 'assistant',
      content: responseContent,
      parameterChanges: parameterChanges ?? undefined,
      action: effectiveAction ?? undefined,
      toolUseBlocks: toolUseBlocks ?? undefined,
    });

    return apiSuccess({
      content: responseContent,
      action: masteringAction ?? action,
      parameterChanges,
      styleSet,
      masteringAction,
      desiredLoudness,
      model: aiResponse.model,
      usage: {
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
      },
      latencyMs,
    });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Chat failed',
    );
  }
});

// ─── GET: Load message history ──────────────────────────────────────────────

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return apiValidationError('sessionId is required');
    }

    // Read-only: owner OR allow-listed admin (load conversation history). POST stays owner-only.
    const access = await verifyDialSessionReadAccess(sessionId, auth, 'chat');
    if (!access) {
      return apiNotFound('Session not found');
    }

    const messages = await db.query.dialMessages.findMany({
      where: eq(dialMessages.sessionId, sessionId),
      orderBy: [asc(dialMessages.createdAt)],
    });

    return apiSuccess({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parameterChanges: m.parameterChanges,
        action: m.action,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Failed to load messages',
    );
  }
});
