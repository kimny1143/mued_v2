/**
 * MUEDial Final Mix API
 * POST /api/dial/final     — Submit final mix request (returns immediately)
 * GET  /api/dial/final      — Poll final mix status
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
 *
 * The POST handler submits the job to RoEx and returns immediately with
 * { taskId, status: 'processing' }. Client polls via GET or session fetch
 * picks up completion automatically.
 */

import { z } from 'zod';
import { and, eq, ne, sql } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { recordDialEvent } from '@/lib/analytics/dial-events';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { createRoExClient, isRoExDevKey, mixFinalBasic, mixFinalAdvanced, pollMixPreview, pollMixFinal, type MixResult } from '@/lib/roex';
import { buildAdvancedTrackData, type ParameterChanges } from '@/lib/dial/track-data';
import { copyToR2 } from '@/lib/dial/r2-storage';
import { resolveTrackUrl } from '@/lib/dial/resolve-track-url';
import { sanitizeUpstreamRoExError } from '@/lib/dial/roex-error';
import { getDialBackstopMs, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';
import { sessionStateForCompletedTask } from '@/lib/dial/session-state';
import { advanceDialSessionState } from '@/lib/dial/session-state-write';
import { db } from '@/db';
import { dialTasks, dialSessions, dialTracks, dialMessages } from '@/db/schema';

// Allow up to 300s for RoEx API calls — /applyaudioeffects can take 60s+ to respond
export const maxDuration = 300;

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

// ─── POST Handler ───────────────────────────────────────────────────────────

export const POST = withDialAuth(async (auth) => {
  try {
    // Rate limit: 5 final mix requests per minute (RoEx credit operations)
    const rateLimitResponse = await rateLimit(auth.request, "dial-process");
    if (rateLimitResponse) return rateLimitResponse;

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

    // Payment check — prevent unpaid sessions from consuming RoEx credits
    if (sessionRow.paymentStatus !== 'paid') {
      return apiError('Payment required before generating mix.', {
        code: 'PAYMENT_REQUIRED',
        status: 402,
      });
    }

    // Omakase mode: Mix Check is not available
    if (type === 'mix_check' && sessionRow.mode === 'omakase') {
      return apiError('Mix Check is not available in Omakase mode.', {
        code: 'INVALID_MODE',
        status: 400,
      });
    }

    // Get tracks
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, previewTask.sessionId),
    });

    // ─── Pre-charge: build the RoEx request (NO charge yet) ────────────────
    // Everything that can throw (missing params / expired stem URLs / fx retrieval)
    // happens BEFORE the cycle reservation, so a failed build never consumes a cycle.
    // `submit` is the single credit-bearing RoEx call, deferred until the slot is reserved.
    const isDialogue = sessionRow.mode === 'dialogue';
    const isAdvanced = isDialogue && (type === 'mix_check' || type === 'final');
    const taskType = type === 'mix_check' ? 'mix_check' as const : (isAdvanced ? 'final_advanced' as const : 'final_basic' as const);

    let submit: () => Promise<MixResult>;

    if (isRoExDevKey()) {
      // Dev key mock — generate stem URLs from actual track names
      const mockStems: Record<string, string> = {};
      for (const t of tracks) {
        const name = t.originalFilename.replace(/\.[^.]+$/, '');
        mockStems[name] = `https://example.com/dev-stem-${name}.wav`;
      }
      submit = async () => ({
        taskId: `dev-${type}-${Date.now()}`,
        status: 'completed',
        finalUrl: `https://example.com/dev-${type}.wav`,
        stemsUrl: mockStems,
      });
    } else if (isAdvanced) {
      // Dialogue mode: use advanced params from Hoo chat
      const paramChanges = (clientParams as ParameterChanges[] | undefined)
        ?? await getLatestParameterChanges(previewTask.sessionId);

      if (!paramChanges || paramChanges.length === 0) {
        return apiValidationError('No parameter changes found. Ask Hoo for mixing suggestions first.');
      }

      // buildAdvancedTrackData resolves each submit URL via resolveTrackUrl (GCS→R2 fallback) and
      // THROWS on a dead URL. This runs BEFORE the cycle reservation below, so a dialogue-final on
      // a returning/copied session whose GCS upload URL has expired falls back to r2_url (or fails
      // pre-charge) instead of handing RoEx a dead URL → 500 + a burned 250cr cycle. Incident 2026-06-15.
      const advancedTrackData = buildAdvancedTrackData(tracks, paramChanges);

      submit = async () => {
        const client = createRoExClient();
        return mixFinalAdvanced(client, {
          taskId: previewTask.roexTaskId,
          trackData: advancedTrackData,
          // Free campaign: skip stems (+50cr) — stems are a paid differentiator; keeps free journey ≈480cr.
          returnStems: !sessionRow.isFreeCampaign,
        });
      };
    } else {
      // Omakase mode: basic final (gain only). Validate stem URLs up-front (no charge), but
      // defer the FX retrieval — pollMixPreview(retrieveFxSettings:true) costs 125cr — AND the
      // mix charge into submit(), so a reservation race-loser never pays the 125cr for FX it
      // can't use (the FX retrieval used to run before the cycle reservation).
      for (const t of tracks) {
        if (!resolveTrackUrl(t)) {
          throw new Error(`Stem URL expired for "${t.originalFilename}". Please re-upload your stems.`);
        }
      }

      submit = async () => {
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
          const trackUrl = resolveTrackUrl(t);
          if (!trackUrl) {
            throw new Error(`Stem URL expired for "${t.originalFilename}". Please re-upload your stems.`);
          }
          return { trackUrl, gainDb };
        });

        const client = createRoExClient();
        return mixFinalBasic(client, {
          taskId: previewTask.roexTaskId,
          trackData,
          // Free campaign: skip stems (+50cr) — keeps free journey ≈480cr.
          returnStems: !sessionRow.isFreeCampaign,
        });
      };
    }

    // ─── Atomic cycle reservation (BEFORE charge) ─────────────────────────
    // One conditional UPDATE both enforces the limit AND consumes the slot. Postgres
    // serializes the two concurrent UPDATEs on the same row, so two final POSTs can never
    // both read a stale paidCycleCount, both pass, and both charge RoEx (Layer-II TOCTOU).
    // 0 rows updated → a limit is already reached → reject WITHOUT charging.
    const reserved = await db
      .update(dialSessions)
      .set({
        paidCycleCount: sql`${dialSessions.paidCycleCount} + 1`,
        ...(type === 'mix_check' ? { mixCheckCount: sql`${dialSessions.mixCheckCount} + 1` } : {}),
        status: 'mixing',
        updatedAt: new Date(),
      })
      .where(and(
        eq(dialSessions.id, previewTask.sessionId),
        sql`${dialSessions.paidCycleCount} < ${dialSessions.baseCycleLimit} + ${dialSessions.additionalCyclesPurchased}`,
        ...(type === 'mix_check' ? [sql`${dialSessions.mixCheckCount} < 2`] : []),
      ))
      .returning({ paidCycleCount: dialSessions.paidCycleCount });

    if (reserved.length === 0) {
      // Re-read to report which limit tripped precisely (no charge happened).
      const cur = await db.query.dialSessions.findFirst({ where: eq(dialSessions.id, previewTask.sessionId) });
      if (type === 'mix_check' && cur && cur.mixCheckCount >= 2) {
        return apiError('Mix check limit reached (max 2). Please generate Final Mix instead.', {
          code: 'MIX_CHECK_LIMIT',
          status: 400,
        });
      }
      const curAdditional = cur?.additionalCyclesPurchased ?? sessionRow.additionalCyclesPurchased;
      return apiError('Cycle limit reached. Purchase additional cycles or finalize.', {
        code: 'CYCLE_LIMIT_REACHED',
        status: 402,
        details: {
          paidCycleCount: cur?.paidCycleCount ?? sessionRow.paidCycleCount,
          baseCycleLimit: sessionRow.baseCycleLimit,
          additionalCyclesPurchased: curAdditional,
          additionalCycleLimit: sessionRow.additionalCycleLimit,
          canPurchaseMore: curAdditional < sessionRow.additionalCycleLimit,
        },
      });
    }

    const newPaidCycleCount = reserved[0].paidCycleCount;

    // ─── Charge: the single credit-bearing RoEx call ──────────────────────
    // The slot is already reserved. On failure we KEEP the slot consumed (refunding it
    // could let a re-submit double-charge — same false-abort-avoidance principle as the
    // #434 comm-timeout design) and only revert the session status off 'mixing' so the
    // dashboard isn't stuck. The spent cycle is remedied via the admin comp flow, never
    // silently refunded.
    let mixResult: MixResult;
    try {
      mixResult = await submit();
    } catch (chargeErr) {
      await db.update(dialSessions)
        .set({ status: 'previewing', updatedAt: new Date() })
        .where(and(eq(dialSessions.id, previewTask.sessionId), ne(dialSessions.status, 'completed')));
      throw chargeErr;
    }

    // ─── Save task & R2 copy ──────────────────────────────────────────────

    const [task] = await db.insert(dialTasks).values({
      sessionId: previewTask.sessionId,
      // Save the CHARGE id (= the multitrackTaskId we submitted with), NOT mixResult.taskId.
      // RoEx /retrieve* idempotency is per-task-id (client.ts): saving a divergent response id
      // would let poll paths (final GET / session / webhook) retrieve an un-charged id and risk
      // a second 250cr. The webhook lookup is also keyed by the submitted id.
      roexTaskId: previewTask.roexTaskId,
      taskType,
      status: 'processing',
      finalUrl: mixResult.finalUrl,
      fxSettings: mixResult.fxSettings ?? null,
      stemsUrls: mixResult.stemsUrl ?? null,
      completedAt: null,
    }).returning();

    // Await R2 copy before returning (Vercel serverless terminates after response)
    if (mixResult.finalUrl && task.id) {
      try {
        const r2Result = await copyToR2({
          sourceUrl: mixResult.finalUrl,
          sessionId: previewTask.sessionId,
          taskId: task.id,
          taskType: taskType,
        });
        await db.update(dialTasks).set({
          status: 'completed',
          completedAt: new Date(),
          ...(r2Result ? { r2FinalUrl: r2Result.r2Url, r2ExpiresAt: r2Result.expiresAt } : {}),
        }).where(eq(dialTasks.id, task.id));
      } catch (err) {
        console.error('[final/POST] R2 copy failed:', err);
        await db.update(dialTasks).set({
          status: 'completed',
          completedAt: new Date(),
        }).where(eq(dialTasks.id, task.id));
      }
    }

    // Advance session status only. The cycle counter is already incremented at reservation;
    // mix_check / not-yet-complete final stay 'mixing'. N2 guard: never downgrade a session a
    // concurrent poll/webhook already moved to 'completed'.
    const taskCompleted = !!mixResult.finalUrl;
    if (type !== 'mix_check' && taskCompleted) {
      await db.update(dialSessions)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(and(eq(dialSessions.id, previewTask.sessionId), ne(dialSessions.status, 'completed')));
    }

    // Tier3 state machine (Phase 1b): advance workflow `state` forward on completion — for ALL
    // task types (mix_check → mix_review, final_* → mix_final), unlike the legacy `status` write
    // above which leaves mix_check on 'mixing'. Forward-only; the GET poll / webhook cover async.
    if (taskCompleted) {
      const st = sessionStateForCompletedTask(taskType);
      if (st) await advanceDialSessionState(db, previewTask.sessionId, st);
    }

    const newTotalLimit = sessionRow.baseCycleLimit + sessionRow.additionalCyclesPurchased;

    recordDialEvent({
      sessionId: previewTask.sessionId, eventType: 'final', userId: auth.userId, guestToken: auth.guestToken,
      mode: sessionRow.mode, metadata: { type: taskType },
    });

    return apiSuccess({
      taskId: task.id,
      type: taskType,
      status: taskCompleted ? 'completed' : 'processing',
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
    return sanitizeUpstreamRoExError(error, '[final/POST]')
      ?? apiServerError(error instanceof Error ? error.message : 'Mix generation failed');
  }
});

// ─── GET: Poll final mix status ──────────────────────────────────────────────
//
// DB-first: returns cached result if webhook already updated the task.
// Fallback: if task has been processing for 30s+, polls RoEx directly.

const POLLING_FALLBACK_THRESHOLD_MS = 30_000;

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return apiValidationError('taskId is required');
    }

    // Verify task ownership
    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Task not found');
    }

    const { task } = result;

    // Already completed? Return cached result.
    if (task.status === 'completed' && task.finalUrl) {
      return apiSuccess({
        status: 'completed',
        finalUrl: task.finalUrl,
        stemsUrls: task.stemsUrls,
        fxSettings: task.fxSettings,
      });
    }

    // Already failed? Return error status.
    if (task.status === 'failed') {
      return apiSuccess({ status: 'failed' });
    }

    // Dev key: dummy track URLs cause /retrievefinalmix to fail — skip polling
    if (isRoExDevKey()) {
      return apiSuccess({ status: task.status });
    }

    // Check if task has been processing long enough to warrant RoEx fallback
    const elapsed = Date.now() - new Date(task.createdAt).getTime();
    if (elapsed < POLLING_FALLBACK_THRESHOLD_MS) {
      // Trust webhook — too early to poll RoEx
      return apiSuccess({ status: 'processing' });
    }
    // Backstop-before-poll: past the generous backstop, fail WITHOUT calling the
    // credit-bearing /retrievefinalmix on a stuck task (avoids hitting a charge endpoint).
    if (elapsed > getDialBackstopMs(task.taskType)) {
      const r = await markDialTaskFailedWithReconcile(taskId, 'final-mix processing backstop');
      return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
    }

    // Fallback: poll RoEx for final mix result
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, task.sessionId),
    });
    const trackUrls = tracks.map((t) => resolveTrackUrl(t) ?? t.roexUploadUrl);
    const sessionRow = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, task.sessionId),
    });

    const client = createRoExClient();
    try {
      // Free campaign: poll must not re-request the (+50cr) stems the free submit skipped.
      const pollResult = await pollMixFinal(client, task.roexTaskId, trackUrls, {
        returnStems: !sessionRow?.isFreeCampaign,
      });

      if (pollResult.finalUrl) {
        await db.update(dialTasks).set({
          status: 'completed',
          finalUrl: pollResult.finalUrl,
          stemsUrls: pollResult.stemsUrl ?? null,
          fxSettings: pollResult.fxSettings ?? null,
          completedAt: new Date(),
        }).where(and(eq(dialTasks.id, taskId), ne(dialTasks.status, 'failed')));

        // R2 copy
        try {
          const r2Result = await copyToR2({
            sourceUrl: pollResult.finalUrl,
            sessionId: task.sessionId,
            taskId: taskId,
            taskType: task.taskType,
          });
          if (r2Result) {
            await db.update(dialTasks).set({
              r2FinalUrl: r2Result.r2Url,
              r2ExpiresAt: r2Result.expiresAt,
            }).where(eq(dialTasks.id, taskId));
          }
        } catch (err) {
          console.error('[final/GET] R2 copy failed:', err);
        }

        // Update session status — N2 guard: never downgrade a session a concurrent
        // poll/webhook already moved to 'completed'.
        const newStatus = task.taskType === 'mix_check'
          ? 'mixing' as const
          : sessionRow?.masteringMode
            ? 'mastering' as const
            : 'completed' as const;
        await db.update(dialSessions).set({
          status: newStatus,
          updatedAt: new Date(),
        }).where(and(eq(dialSessions.id, task.sessionId), ne(dialSessions.status, 'completed')));

        // Tier3 state machine (Phase 1b): sync-poll completion fallback (webhook may not fire —
        // 2026-06-15 Vercel-DDoS incident). Forward-only; mix_check → mix_review, final_* → mix_final.
        const st = sessionStateForCompletedTask(task.taskType);
        if (st) await advanceDialSessionState(db, task.sessionId, st);

        return apiSuccess({
          status: 'completed',
          finalUrl: pollResult.finalUrl,
          stemsUrls: pollResult.stemsUrl,
          fxSettings: pollResult.fxSettings,
        });
      }

      // Explicit RoEx failure → fail. Otherwise keep processing (backstop above is the
      // wall-clock catch; a comm-timeout abort is transient → handled in the catch).
      if (pollResult.status === 'failed') {
        const r = await markDialTaskFailedWithReconcile(taskId, 'RoEx reported final-mix failure');
        return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
      }

      return apiSuccess({ status: 'processing' });
    } catch (pollErr) {
      // Transient (comm-timeout abort / HTTP error). Keep processing; backstop + cron catch it.
      console.warn(`[final/GET] transient poll error: ${pollErr instanceof Error ? pollErr.message : 'unknown'}`);
      return apiSuccess({ status: 'processing' });
    }
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Poll failed');
  }
});
