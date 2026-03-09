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
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { sendHooChat, type HooChatMessage } from '@/lib/ai/providers';
import { buildDialSystemPrompt, DIAL_MIX_ACTION_TOOL, DIAL_SET_STYLE_TOOL, DIAL_OMAKASE_MIX_ACTION_TOOL, DIAL_MASTERING_ACTION_TOOL, type DialPromptInput } from '@/lib/ai/prompts/dial';
import { db } from '@/db';
import { dialSessions, dialTracks, dialMessages, dialTasks } from '@/db/schema';

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
    const body = await auth.request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, message } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    const isMasteringOnly = !session.mode && !!session.masteringMode;
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

    // Determine current phase based on session state
    const hasMixCheck = session.mixCheckCount > 0;
    const hasMixFinal = allTasks.some(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
    );
    const hasMasteringPreview = allTasks.some(
      (t) => t.taskType === 'mastering_preview' && t.status === 'completed',
    );
    const hasMasteringFinal = allTasks.some(
      (t) => t.taskType === 'mastering' && t.finalUrl,
    );
    const masteringPreviewCount = allTasks.filter(
      (t) => t.taskType === 'mastering_preview',
    ).length;
    const mixFinalTask = allTasks.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
    );

    // Mastering phase: mastering-only (always until done), or mix+mastering (after mix final)
    const isMasteringPhase = isMasteringOnly
      ? !hasMasteringFinal
      : (!!(session.masteringMode) && hasMixFinal && !hasMasteringFinal);

    // Check if any completed preview exists (latestTask is ordered by createdAt desc)
    const hasPreview = latestTask?.taskType === 'preview' && latestTask?.status === 'completed'
      || session.mixCheckCount > 0;
    let phase: 1 | 2 | 3;
    if (isOmakase) {
      phase = hasMixFinal ? 3 : 1; // omakase has no Phase 2
    } else if (hasMixFinal) {
      phase = 3;
    } else if (hasMixCheck) {
      phase = 3;
    } else {
      phase = 1;
    }

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
    };

    const systemPrompt = buildDialSystemPrompt(promptInput);

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

    const chatMessages: HooChatMessage[] = existingMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Send to AI with tool definitions
    let tools;
    if (isMasteringPhase) {
      tools = [DIAL_MASTERING_ACTION_TOOL, DIAL_SET_STYLE_TOOL];
    } else if (isOmakase) {
      tools = [DIAL_OMAKASE_MIX_ACTION_TOOL];
    } else {
      tools = [DIAL_MIX_ACTION_TOOL, DIAL_SET_STYLE_TOOL];
    }

    const startTime = Date.now();
    const aiResponse = await sendHooChat('claude-haiku', chatMessages, {
      systemPrompt,
      tools,
    });
    const latencyMs = Date.now() - startTime;

    // Extract tool call results (structured, not regex)
    const mixToolCall = aiResponse.toolCalls?.find((t) => t.name === 'propose_mix_action');
    const mixToolInput = mixToolCall?.input as MixActionInput | undefined;

    const action = mixToolInput?.action ?? null;
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
    const masteringAction = masteringToolInput?.action ?? null;
    const desiredLoudness = masteringToolInput?.desiredLoudness ?? null;

    // Save assistant message (text only, no JSON in content)
    const effectiveAction = masteringAction ?? action;
    await db.insert(dialMessages).values({
      sessionId,
      role: 'assistant',
      content: aiResponse.content,
      parameterChanges: parameterChanges ?? undefined,
      action: effectiveAction ?? undefined,
    });

    return apiSuccess({
      content: aiResponse.content,
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

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
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
