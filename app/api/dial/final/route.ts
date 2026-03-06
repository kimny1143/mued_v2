/**
 * MUEDial Final Mix API
 * POST /api/dial/final
 *
 * Submits a final mix request (basic or advanced).
 * - Basic: gain_db adjustments only (175-300cr)
 * - Advanced: gain + EQ + compressor + pan (175-300cr)
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { createRoExClient, mixFinalBasic } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks, dialSessions, dialTracks } from '@/db/schema';

const finalRequestSchema = z.object({
  taskId: z.string().uuid(), // The dial_tasks.id of the completed preview
});

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = finalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { taskId } = parsed.data;

    // Verify task ownership (preview task → session → user)
    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Preview task not found');
    }

    const { task: previewTask } = result;

    if (previewTask.status !== 'completed') {
      return apiValidationError('Preview must be completed before generating final mix');
    }

    // Get tracks for the session to build trackData with FX settings
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, previewTask.sessionId),
    });

    // Build trackData from tracks — use gainDb from FX settings if available
    const fxSettings = previewTask.fxSettings as Record<string, Record<string, unknown>> | null;
    const trackData = tracks.map((t) => {
      const urlKey = t.roexUploadUrl.split('/').pop()?.split('?')[0] ?? '';
      const fx = fxSettings?.[urlKey];
      const gainDb = (fx?.gain_settings as Record<string, number>)?.gain_db ?? 0;
      return { trackUrl: t.roexUploadUrl, gainDb };
    });

    const client = createRoExClient();
    const mixResult = await mixFinalBasic(client, {
      taskId: previewTask.roexTaskId,
      trackData,
    });

    // Save final task
    const [task] = await db.insert(dialTasks).values({
      sessionId: previewTask.sessionId,
      roexTaskId: mixResult.taskId || previewTask.roexTaskId,
      taskType: 'final_basic',
      status: mixResult.finalUrl ? 'completed' : 'processing',
      finalUrl: mixResult.finalUrl,
      fxSettings: mixResult.fxSettings ?? null,
      stemsUrls: mixResult.stemsUrl ?? null,
      completedAt: mixResult.finalUrl ? new Date() : null,
    }).returning();

    // Update session status
    if (mixResult.finalUrl) {
      await db.update(dialSessions)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(dialSessions.id, previewTask.sessionId));
    } else {
      await db.update(dialSessions)
        .set({ status: 'mixing', updatedAt: new Date() })
        .where(eq(dialSessions.id, previewTask.sessionId));
    }

    return apiSuccess({
      taskId: task.id,
      status: task.status,
      finalUrl: mixResult.finalUrl,
      stemsUrls: mixResult.stemsUrl,
      fxSettings: mixResult.fxSettings,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Final mix failed');
  }
});
