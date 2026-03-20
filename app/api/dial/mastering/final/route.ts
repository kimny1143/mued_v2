/**
 * MUEDial Mastering Final API
 * POST /api/dial/mastering/final — Retrieve final mastered file (220cr)
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
