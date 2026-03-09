/**
 * MUEDial Final Mix API
 * POST /api/dial/final
 *
 * Handles both Mix Check and Final Mix generation.
 *
 * Dialogue mode flow:
 *   Mix Check (type: 'mix_check')  — 250cr, WAV, EQ/comp applied, user listens
 *   Final Mix (type: 'final')      — 250cr, WAV + stems, micro-adjustments
 *
 * Omakase mode:
 *   Final Basic (type: 'final')    — 250cr, WAV, gain-only
 *
 * Max 2 mix checks per session. 3rd call must be type: 'final'.
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { createRoExClient, isRoExDevKey, mixFinalBasic, mixFinalAdvanced, pollMixPreview } from '@/lib/roex';
import type { AdvancedTrackAdjustment } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks, dialSessions, dialTracks, dialMessages } from '@/db/schema';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EqBand {
  freq: number;
  gainDb: number;
  q: number;
}

interface ParameterChanges {
  track: string;
  changes: {
    gainDb?: number;
    compRatio?: number;
    compThresholdDb?: number;
    compAttackMs?: number;
    compReleaseMs?: number;
    eqBands?: EqBand[];
    panAngleDegrees?: number;
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

const finalRequestSchema = z.object({
  taskId: z.string().uuid(),          // The dial_tasks.id of the completed preview
  type: z.enum(['mix_check', 'final']).default('final'),
  parameterChanges: z.any().optional(), // Advanced params from Hoo chat (Phase 2/3)
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find the latest assistant message with parameterChanges for this session.
 * Used as fallback when client doesn't send parameterChanges explicitly.
 */
async function getLatestParameterChanges(sessionId: string): Promise<ParameterChanges[] | null> {
  const messages = await db.query.dialMessages.findMany({
    where: eq(dialMessages.sessionId, sessionId),
  });

  // Walk backwards to find the latest assistant message with parameter_changes
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && msg.parameterChanges) {
      return msg.parameterChanges as ParameterChanges[];
    }
  }
  return null;
}

/**
 * Build advanced track data from Hoo's parameter changes + track info.
 */
function buildAdvancedTrackData(
  tracks: { roexUploadUrl: string; originalFilename: string }[],
  paramChanges: ParameterChanges[],
): AdvancedTrackAdjustment[] {
  return tracks.map((t) => {
    // Match parameter changes to track by filename
    const pc = paramChanges.find((p) =>
      t.originalFilename.toLowerCase().includes(p.track.toLowerCase()) ||
      p.track.toLowerCase().includes(t.originalFilename.toLowerCase().replace(/\.[^.]+$/, '')),
    );

    const changes = pc?.changes ?? {};

    return {
      trackUrl: t.roexUploadUrl,
      gainDb: changes.gainDb ?? 0,
      eqBands: changes.eqBands?.map((b) => ({
        frequency: b.freq,
        gain: b.gainDb,
        q: b.q,
      })),
      compressor: changes.compRatio != null ? {
        ratio: changes.compRatio,
        threshold: changes.compThresholdDb ?? -20,
        attack: changes.compAttackMs ?? 10,
        release: changes.compReleaseMs ?? 100,
      } : undefined,
      panAngleDegrees: changes.panAngleDegrees,
    };
  });
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = finalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { taskId, type, parameterChanges: clientParams } = parsed.data;

    // Verify task ownership (preview task → session → user)
    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Preview task not found');
    }

    const { task: previewTask } = result;

    if (previewTask.status !== 'completed') {
      return apiValidationError('Preview must be completed before generating mix');
    }

    // Get session
    const sessionRow = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, previewTask.sessionId),
    });
    if (!sessionRow) {
      return apiNotFound('Session not found');
    }

    // Omakase mode: Mix Check is not available
    if (type === 'mix_check' && sessionRow.mode === 'omakase') {
      return apiError('Mix Check is not available in Omakase mode.', {
        code: 'INVALID_MODE',
        status: 400,
      });
    }

    // Enforce mix check limit (max 2)
    if (type === 'mix_check' && sessionRow.mixCheckCount >= 2) {
      return apiError('Mix check limit reached (max 2). Please generate Final Mix instead.', {
        code: 'MIX_CHECK_LIMIT',
        status: 400,
      });
    }

    // Enforce paid cycle limit (mix_check + final count toward paidCycleCount)
    const totalCycleLimit = sessionRow.baseCycleLimit + sessionRow.additionalCyclesPurchased;
    if (sessionRow.paidCycleCount >= totalCycleLimit) {
      return apiError('Cycle limit reached. Purchase additional cycles or finalize.', {
        code: 'CYCLE_LIMIT_REACHED',
        status: 402,
        details: {
          paidCycleCount: sessionRow.paidCycleCount,
          baseCycleLimit: sessionRow.baseCycleLimit,
          additionalCyclesPurchased: sessionRow.additionalCyclesPurchased,
          additionalCycleLimit: sessionRow.additionalCycleLimit,
          canPurchaseMore: sessionRow.additionalCyclesPurchased < sessionRow.additionalCycleLimit,
        },
      });
    }

    // Get tracks
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, previewTask.sessionId),
    });

    // ─── Build mix request ────────────────────────────────────────────────

    const isDialogue = sessionRow.mode === 'dialogue';
    const isAdvanced = isDialogue && (type === 'mix_check' || type === 'final');

    let mixResult;

    if (isRoExDevKey()) {
      // Dev key mock — generate stem URLs from actual track names
      const mockStems: Record<string, string> = {};
      for (const t of tracks) {
        const name = t.originalFilename.replace(/\.[^.]+$/, '');
        mockStems[name] = `https://example.com/dev-stem-${name}.wav`;
      }
      mixResult = {
        taskId: `dev-${type}-${Date.now()}`,
        finalUrl: `https://example.com/dev-${type}.wav`,
        previewUrl: null,
        fxSettings: null,
        stemsUrl: mockStems,
      };
    } else if (isAdvanced) {
      // Dialogue mode: use advanced params from Hoo chat
      const paramChanges = (clientParams as ParameterChanges[] | undefined)
        ?? await getLatestParameterChanges(previewTask.sessionId);

      if (!paramChanges || paramChanges.length === 0) {
        return apiValidationError('No parameter changes found. Ask Hoo for mixing suggestions first.');
      }

      const advancedTrackData = buildAdvancedTrackData(tracks, paramChanges);

      const client = createRoExClient();
      mixResult = await mixFinalAdvanced(client, {
        taskId: previewTask.roexTaskId,
        trackData: advancedTrackData,
      });
    } else {
      // Omakase mode: basic final (gain only)
      // Retrieve FX settings for gain values if not cached
      let fxSettings = previewTask.fxSettings as Record<string, Record<string, unknown>> | null;

      if (!fxSettings) {
        const client2 = createRoExClient();
        const fxResult = await pollMixPreview(client2, previewTask.roexTaskId, {
          retrieveFxSettings: true,
        });
        fxSettings = fxResult.fxSettings ?? null;
        if (fxSettings) {
          await db.update(dialTasks).set({ fxSettings }).where(eq(dialTasks.id, previewTask.id));
        }
      }

      const trackData = tracks.map((t) => {
        const urlKey = t.roexUploadUrl.split('/').pop()?.split('?')[0] ?? '';
        const fx = fxSettings?.[urlKey];
        const gainDb = (fx?.gain_settings as Record<string, number>)?.gain_db ?? 0;
        return { trackUrl: t.roexUploadUrl, gainDb };
      });

      const client = createRoExClient();
      mixResult = await mixFinalBasic(client, {
        taskId: previewTask.roexTaskId,
        trackData,
      });
    }

    // ─── Save task & update session ───────────────────────────────────────

    const taskType = type === 'mix_check' ? 'mix_check' as const : (isAdvanced ? 'final_advanced' as const : 'final_basic' as const);

    const [task] = await db.insert(dialTasks).values({
      sessionId: previewTask.sessionId,
      roexTaskId: mixResult.taskId || previewTask.roexTaskId,
      taskType,
      status: mixResult.finalUrl ? 'completed' : 'processing',
      finalUrl: mixResult.finalUrl,
      fxSettings: mixResult.fxSettings ?? null,
      stemsUrls: mixResult.stemsUrl ?? null,
      completedAt: mixResult.finalUrl ? new Date() : null,
    }).returning();

    // Update session — increment paid cycle count + type-specific counters
    if (type === 'mix_check') {
      await db.update(dialSessions)
        .set({
          mixCheckCount: sessionRow.mixCheckCount + 1,
          paidCycleCount: sessionRow.paidCycleCount + 1,
          status: 'mixing',
          updatedAt: new Date(),
        })
        .where(eq(dialSessions.id, previewTask.sessionId));
    } else if (mixResult.finalUrl) {
      await db.update(dialSessions)
        .set({
          paidCycleCount: sessionRow.paidCycleCount + 1,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(dialSessions.id, previewTask.sessionId));
    } else {
      await db.update(dialSessions)
        .set({
          paidCycleCount: sessionRow.paidCycleCount + 1,
          status: 'mixing',
          updatedAt: new Date(),
        })
        .where(eq(dialSessions.id, previewTask.sessionId));
    }

    const newPaidCycleCount = sessionRow.paidCycleCount + 1;
    const newTotalLimit = sessionRow.baseCycleLimit + sessionRow.additionalCyclesPurchased;

    return apiSuccess({
      taskId: task.id,
      type: taskType,
      status: task.status,
      finalUrl: mixResult.finalUrl,
      stemsUrls: mixResult.stemsUrl,
      fxSettings: mixResult.fxSettings,
      retake: {
        paidCycleCount: newPaidCycleCount,
        totalLimit: newTotalLimit,
        remaining: newTotalLimit - newPaidCycleCount,
        canPurchaseMore: sessionRow.additionalCyclesPurchased < sessionRow.additionalCycleLimit,
      },
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Mix generation failed');
  }
});
