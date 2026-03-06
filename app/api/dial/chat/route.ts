/**
 * MUEDial Chat API (Dialogue Mode)
 * POST /api/dial/chat
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
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api-response';
import { sendHooChat, type HooChatMessage } from '@/lib/ai/providers';
import { buildDialSystemPrompt, type DialPromptInput } from '@/lib/ai/prompts/dial';
import { db } from '@/db';
import { dialSessions, dialTracks, dialMessages, dialTasks } from '@/db/schema';

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

/**
 * Extract parameter_changes JSON from Hoo's response.
 * Hoo embeds a JSON block at the end of the message.
 */
function extractParameterChanges(content: string): ParameterChange[] | null {
  // Match ```json ... ``` block containing parameter_changes
  const jsonBlockMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (!jsonBlockMatch) return null;

  try {
    const parsed = JSON.parse(jsonBlockMatch[1]);
    if (parsed.parameter_changes && Array.isArray(parsed.parameter_changes)) {
      return parsed.parameter_changes;
    }
  } catch {
    // JSON parse failed — not a valid parameter_changes block
  }

  return null;
}

/**
 * Build current FX summary from the latest completed task.
 */
function buildFxSummary(fxSettings: unknown): string | undefined {
  if (!fxSettings || typeof fxSettings !== 'object') return undefined;

  // fxSettings is the full RoEx FX response — summarize key parameters
  try {
    const settings = fxSettings as Record<string, unknown>;
    const entries = Object.entries(settings);
    if (entries.length === 0) return undefined;

    return JSON.stringify(fxSettings, null, 2).slice(0, 2000); // Truncate for prompt
  } catch {
    return undefined;
  }
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, message } = parsed.data;

    // Load session with tracks
    const session = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, sessionId),
    });
    if (!session || session.userId !== userId) {
      return apiError('Session not found', { code: 'NOT_FOUND', status: 404 });
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

    // Send to AI (Claude Haiku for cost efficiency)
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

export const GET = withAuth(async ({ userId, request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return apiValidationError('sessionId is required');
    }

    // Verify session ownership
    const session = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, sessionId),
    });
    if (!session || session.userId !== userId) {
      return apiError('Session not found', { code: 'NOT_FOUND', status: 404 });
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
