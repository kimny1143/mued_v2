/**
 * MUEDial Chat API (Dialogue Mode)
 * POST /api/dial/chat
 * GET  /api/dial/chat
 *
 * Hoo guides the user through mixing parameter adjustments.
 * Parses structured `parameter_changes` from Hoo's response.
 *
 * Flow:
 *   1. User sends message ("ボーカルもう少し前に出して")
 *   2. Hoo responds with advice + parameter_changes JSON
 *   3. Client applies changes → submits new Preview
 */

import { z } from 'zod';
import { eq, asc, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { sendHooChat, type HooChatMessage } from '@/lib/ai/providers';
import { buildDialSystemPrompt, type DialPromptInput } from '@/lib/ai/prompts/dial';
import { db } from '@/db';
import { dialTracks, dialMessages, dialTasks } from '@/db/schema';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParameterChange {
  track: string;
  changes: {
    presenceSetting?: string;
    gainDb?: number;
    panPreference?: string;
    reverbPreference?: string;
  };
  reason: string;
}

// ─── Request Validation ─────────────────────────────────────────────────────

const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(5000),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractParameterChanges(content: string): ParameterChange[] | null {
  const jsonBlockMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (!jsonBlockMatch) return null;

  try {
    const parsed = JSON.parse(jsonBlockMatch[1]);
    if (parsed.parameter_changes && Array.isArray(parsed.parameter_changes)) {
      return parsed.parameter_changes;
    }
  } catch {
    // JSON parse failed
  }

  return null;
}

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

    if (session.mode !== 'dialogue') {
      return apiError('Chat is only available in dialogue mode', {
        code: 'INVALID_MODE',
        status: 400,
      });
    }

    // Load tracks for context
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, sessionId),
    });

    // Load latest completed task (for FX summary + preview URL)
    const latestTask = await db.query.dialTasks.findFirst({
      where: eq(dialTasks.sessionId, sessionId),
      orderBy: [desc(dialTasks.createdAt)],
    });

    // Build system prompt with session context
    const promptInput: DialPromptInput = {
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

    // Send to AI
    const startTime = Date.now();
    const aiResponse = await sendHooChat('claude-haiku', chatMessages, {
      systemPrompt,
    });
    const latencyMs = Date.now() - startTime;

    // Extract parameter_changes from response
    const parameterChanges = extractParameterChanges(aiResponse.content);

    // Save assistant message with parameter_changes
    await db.insert(dialMessages).values({
      sessionId,
      role: 'assistant',
      content: aiResponse.content,
      parameterChanges: parameterChanges ?? undefined,
    });

    return apiSuccess({
      content: aiResponse.content,
      parameterChanges,
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
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Failed to load messages',
    );
  }
});
