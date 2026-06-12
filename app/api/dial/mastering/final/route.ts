/**
 * MUEDial Mastering Final API
 * POST /api/dial/mastering/final — Trigger final mastered file retrieval (220cr)
 * GET  /api/dial/mastering/final — Poll mastering final task status
 *
 * Requires a completed mastering preview task.
 */

import { z } from 'zod';
import { and, eq, ne, sql } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { createRoExClient, masterFinal, isRoExDevKey } from '@/lib/roex';
import { copyToR2 } from '@/lib/dial/r2-storage';
import { sanitizeUpstreamRoExError } from '@/lib/dial/roex-error';
import { getDialBackstopMs, markDialTaskFailedWithReconcile, isUnchargedMasteringReservation } from '@/lib/dial/task-timeout';
import { db } from '@/db';
import { dialTasks, dialSessions } from '@/db/schema';

export const maxDuration = 120;

// Advisory-lock namespace for mastering submission (PR#426 style). Two-key form
// pg_advisory_xact_lock(CLASS, hashtext(session_id)) serializes concurrent mastering
// POSTs per session without blocking other sessions or the final-mix lock space.
const MASTERING_LOCK_CLASS = 4926082;

/** Signals an existing mastering task found inside the advisory-locked transaction. */
class MasteringExistsError extends Error {
  constructor(public existingStatus: string) {
    super('mastering already exists');
  }
}

/** Postgres unique_violation (23505) — the partial unique index tripped on a concurrent claim. */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  const causeCode = (err as { cause?: { code?: string } }).cause?.code;
  return code === '23505' || causeCode === '23505'
    || (err instanceof Error && /duplicate key value|unique constraint/i.test(err.message));
}

const masteringFinalSchema = z.object({
  taskId: z.string().uuid(), // The dial_tasks.id of the completed mastering preview
});

export const POST = withDialAuth(async (auth) => {
  try {
    // Rate limit: mastering final is a RoEx credit operation (220cr)
    const rateLimitResponse = await rateLimit(auth.request, 'dial-process');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await auth.request.json();
    const parsed = masteringFinalSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { taskId } = parsed.data;

    // Verify task ownership
    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Mastering preview task not found');
    }

    const { task: previewTask } = result;

    if (previewTask.taskType !== 'mastering_preview') {
      return apiError('Task is not a mastering preview', { code: 'INVALID_TASK_TYPE', status: 400 });
    }

    if (previewTask.status !== 'completed') {
      return apiError('Mastering preview must be completed first', { code: 'NOT_COMPLETED', status: 400 });
    }

    const session = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, previewTask.sessionId),
    });
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Payment check
    if (session.paymentStatus !== 'paid') {
      return apiError('Payment required before mastering.', {
        code: 'PAYMENT_REQUIRED',
        status: 402,
      });
    }

    // ─── Atomic single-mastering reservation (insert-before-charge) ───────
    // One mastering final per session. The advisory lock serializes concurrent POSTs for
    // this session (PR#426 style); the partial unique index dial_tasks(session_id) WHERE
    // task_type='mastering' is the DB backstop; and inserting the task row BEFORE the
    // 220cr charge means a second concurrent request is rejected (existing row / 23505)
    // BEFORE it can charge another 220cr. A 'failed' mastering also blocks (re-POST would
    // leak 220cr) → directed to support (consistent with #434 false-abort avoidance).
    let task: typeof dialTasks.$inferSelect;
    try {
      task = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${MASTERING_LOCK_CLASS}, hashtext(${previewTask.sessionId}))`);

        const existing = await tx.query.dialTasks.findFirst({
          where: and(
            eq(dialTasks.sessionId, previewTask.sessionId),
            eq(dialTasks.taskType, 'mastering'),
          ),
        });
        if (existing) {
          throw new MasteringExistsError(existing.status);
        }

        try {
          const [row] = await tx.insert(dialTasks).values({
            sessionId: previewTask.sessionId,
            // Sentinel: empty roexTaskId marks the row as RESERVED-but-not-yet-charged. All
            // mastering poll/webhook paths skip a row with no roexTaskId, so they can never
            // call /retrievefinalmaster on it (and double-charge) before this POST's single
            // charge runs. The real id is written below once the charge succeeds.
            roexTaskId: '',
            taskType: 'mastering',
            status: 'processing',
            completedAt: null,
          }).returning();
          return row;
        } catch (insErr) {
          if (isUniqueViolation(insErr)) {
            throw new MasteringExistsError('processing');
          }
          throw insErr;
        }
      });
    } catch (txErr) {
      if (txErr instanceof MasteringExistsError) {
        return apiError(
          txErr.existingStatus === 'failed'
            ? 'A previous mastering attempt did not complete. Please contact support@mued.jp.'
            : 'Mastering already generated for this session.',
          { code: 'MASTERING_ALREADY_DONE', status: 409 },
        );
      }
      throw txErr;
    }

    // ─── Charge (220cr) — the task row is already reserved; a concurrent POST cannot
    // reach here. On failure, mark the reserved task failed (dashboard not stuck) and keep
    // the unique row so a re-try is directed to support, never silently re-charged. ──────
    let masterResult: { taskId: string; status: string; finalUrl?: string | null };
    try {
      if (isRoExDevKey()) {
        masterResult = {
          taskId: `dev-mastering-final-${Date.now()}`,
          status: 'completed',
          finalUrl: `https://example.com/dev-mastered-final.wav`,
        };
      } else {
        const client = createRoExClient();
        masterResult = await masterFinal(client, previewTask.roexTaskId);
      }
    } catch (chargeErr) {
      await markDialTaskFailedWithReconcile(task.id, 'mastering charge failed').catch(() => {});
      throw chargeErr;
    }

    // Persist the result onto the reserved task. Save the CHARGE id (= the masteringTaskId we
    // submitted with), NOT masterResult.taskId: RoEx /retrieve* idempotency is per-task-id
    // (client.ts) — a poll re-retrieve is free ONLY for the same id that was charged. Saving a
    // divergent response id would let consumers (mastering GET / session / webhook) poll an
    // un-charged id and trigger a second 220cr.
    await db.update(dialTasks).set({
      roexTaskId: previewTask.roexTaskId,
      finalUrl: masterResult.finalUrl,
    }).where(eq(dialTasks.id, task.id));

    // Await R2 copy before returning (Vercel serverless terminates after response)
    if (masterResult.finalUrl && task.id) {
      try {
        const r2Result = await copyToR2({
          sourceUrl: masterResult.finalUrl,
          sessionId: previewTask.sessionId,
          taskId: task.id,
          taskType: 'mastering',
        });
        await db.update(dialTasks).set({
          status: 'completed',
          completedAt: new Date(),
          ...(r2Result ? { r2FinalUrl: r2Result.r2Url, r2ExpiresAt: r2Result.expiresAt } : {}),
        }).where(eq(dialTasks.id, task.id));
      } catch (err) {
        console.error('[mastering/final] R2 copy failed:', err);
        await db.update(dialTasks).set({
          status: 'completed',
          completedAt: new Date(),
        }).where(eq(dialTasks.id, task.id));
      }
    }

    // Update session status to completed (N2 guard: never re-touch a completed session)
    if (masterResult.finalUrl) {
      await db.update(dialSessions)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(and(eq(dialSessions.id, previewTask.sessionId), ne(dialSessions.status, 'completed')));
    }

    return apiSuccess({
      taskId: task.id,
      status: masterResult.finalUrl ? 'completed' : 'processing',
      finalUrl: masterResult.finalUrl,
    });
  } catch (error) {
    return sanitizeUpstreamRoExError(error, '[mastering/final/POST]')
      ?? apiServerError(error instanceof Error ? error.message : 'Mastering final failed');
  }
});

// ─── GET: Poll mastering final task status ───────────────────────────────────
//
// DB-first: returns cached result if webhook already completed the task.
// Fallback: if task has been processing 30s+, polls RoEx /retrievefinalmaster directly.

const POLLING_FALLBACK_THRESHOLD_MS = 30_000;

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return apiValidationError('taskId is required');
    }

    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Task not found');
    }

    const { task } = result;

    if (task.taskType !== 'mastering') {
      return apiError('Task is not a mastering final task', { code: 'INVALID_TASK_TYPE', status: 400 });
    }

    if (task.status === 'completed' && task.finalUrl) {
      return apiSuccess({ status: 'completed', finalUrl: task.finalUrl });
    }

    if (task.status === 'failed') {
      return apiSuccess({ status: 'failed' });
    }

    if (isRoExDevKey()) {
      return apiSuccess({ status: task.status });
    }

    const elapsed = Date.now() - new Date(task.createdAt).getTime();
    if (elapsed < POLLING_FALLBACK_THRESHOLD_MS) {
      return apiSuccess({ status: 'processing' });
    }
    // Backstop-before-poll: past the generous backstop, fail WITHOUT calling the
    // credit-bearing /retrievefinalmaster on a stuck task. Applies even to a reserved row
    // (empty roexTaskId) whose POST died mid-charge — markFailed makes no RoEx call.
    if (elapsed > getDialBackstopMs(task.taskType)) {
      const r = await markDialTaskFailedWithReconcile(taskId, 'mastering-final processing backstop');
      return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
    }
    // Reserved-but-not-yet-charged row: the POST handler has not run its single 220cr charge
    // yet — never poll /retrievefinalmaster on it.
    if (isUnchargedMasteringReservation(task)) {
      return apiSuccess({ status: 'processing' });
    }

    const client = createRoExClient();
    try {
      // POLL (retrieve) → comm-timeout on; this is NOT the initial 220cr submit.
      const pollResult = await masterFinal(client, task.roexTaskId, { poll: true });

      if (pollResult.finalUrl) {
        let r2FinalUrl: string | undefined;
        try {
          const r2Result = await copyToR2({
            sourceUrl: pollResult.finalUrl,
            sessionId: task.sessionId,
            taskId: task.id,
            taskType: 'mastering',
          });
          r2FinalUrl = r2Result?.r2Url;
        } catch { /* non-blocking */ }

        await db.update(dialTasks).set({
          status: 'completed',
          finalUrl: pollResult.finalUrl,
          completedAt: new Date(),
          ...(r2FinalUrl ? { r2FinalUrl } : {}),
        }).where(and(eq(dialTasks.id, taskId), ne(dialTasks.status, 'failed')));

        const session = await db.query.dialSessions.findFirst({
          where: eq(dialSessions.id, task.sessionId),
        });
        if (session) {
          await db.update(dialSessions)
            .set({ status: 'completed', updatedAt: new Date() })
            .where(eq(dialSessions.id, task.sessionId));
        }

        return apiSuccess({ status: 'completed', finalUrl: pollResult.finalUrl });
      }

      // Explicit RoEx failure → fail. Otherwise keep processing (backstop above + cron).
      if (pollResult.status === 'failed') {
        const r = await markDialTaskFailedWithReconcile(taskId, 'RoEx reported mastering-final failure');
        return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
      }

      return apiSuccess({ status: 'processing' });
    } catch (pollErr) {
      // Transient (comm-timeout abort / HTTP error). Keep processing.
      console.warn(`[mastering/final/GET] transient poll error: ${pollErr instanceof Error ? pollErr.message : 'unknown'}`);
      return apiSuccess({ status: 'processing' });
    }
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Mastering final poll failed');
  }
});
