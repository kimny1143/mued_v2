/**
 * MUEDial Mastering Final API
 * POST /api/dial/mastering/final — Trigger final mastered file retrieval (220cr)
 * GET  /api/dial/mastering/final — Poll mastering final task status
 *
 * Requires a completed mastering preview task.
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { createRoExClient, masterFinal, isRoExDevKey } from '@/lib/roex';
import { copyToR2 } from '@/lib/dial/r2-storage';
import { db } from '@/db';
import { dialTasks, dialSessions } from '@/db/schema';

export const maxDuration = 120;

const masteringFinalSchema = z.object({
  taskId: z.string().uuid(), // The dial_tasks.id of the completed mastering preview
});

export const POST = withDialAuth(async (auth) => {
  try {
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

    let masterResult;

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

    // Save mastering final task
    const [task] = await db.insert(dialTasks).values({
      sessionId: previewTask.sessionId,
      roexTaskId: masterResult.taskId || previewTask.roexTaskId,
      taskType: 'mastering',
      status: 'processing',
      finalUrl: masterResult.finalUrl,
      completedAt: null,
    }).returning();

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

    // Update session status to completed
    if (masterResult.finalUrl) {
      await db.update(dialSessions)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(dialSessions.id, previewTask.sessionId));
    }

    return apiSuccess({
      taskId: task.id,
      status: masterResult.finalUrl ? 'completed' : 'processing',
      finalUrl: masterResult.finalUrl,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Mastering final failed');
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

    if (task.status === 'completed') {
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

    const client = createRoExClient();
    const pollResult = await masterFinal(client, task.roexTaskId);

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
      }).where(eq(dialTasks.id, taskId));

      const session = await db.query.dialSessions.findFirst({
        where: eq(dialSessions.id, task.sessionId),
      });
      if (session) {
        await db.update(dialSessions)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(dialSessions.id, task.sessionId));
      }
    } else if (pollResult.status === 'failed') {
      await db.update(dialTasks).set({ status: 'failed' }).where(eq(dialTasks.id, taskId));
    }

    return apiSuccess({
      status: pollResult.finalUrl ? 'completed' : (pollResult.status === 'failed' ? 'failed' : 'processing'),
      finalUrl: pollResult.finalUrl,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Mastering final poll failed');
  }
});
