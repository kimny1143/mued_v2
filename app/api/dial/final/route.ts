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
import { createRoExClient, isRoExDevKey, mixFinalBasic, pollMixPreview } from '@/lib/roex';
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

    // Get tracks for the session
    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, previewTask.sessionId),
    });

    // Get session to check mode
    const sessionRow = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, previewTask.sessionId),
    });

    // For dialogue mode: retrieve FX settings if not already stored (125cr one-time)
    // For omakase mode: skip FX retrieval, use gainDb: 0 (RoEx applies preview settings)
    let fxSettings = previewTask.fxSettings as Record<string, Record<string, unknown>> | null;

    if (!fxSettings && sessionRow?.mode === 'dialogue' && !isRoExDevKey()) {
      const client2 = createRoExClient();
      const fxResult = await pollMixPreview(client2, previewTask.roexTaskId, {
        retrieveFxSettings: true,
      });
      fxSettings = fxResult.fxSettings ?? null;

      // Cache FX settings on the preview task for future use
      if (fxSettings) {
        await db.update(dialTasks).set({ fxSettings }).where(eq(dialTasks.id, previewTask.id));
      }
    }

    // Build trackData — use gainDb from FX settings if available (dialogue), otherwise 0 (omakase)
    const trackData = tracks.map((t) => {
      const urlKey = t.roexUploadUrl.split('/').pop()?.split('?')[0] ?? '';
      const fx = fxSettings?.[urlKey];
      const gainDb = (fx?.gain_settings as Record<string, number>)?.gain_db ?? 0;
      return { trackUrl: t.roexUploadUrl, gainDb };
    });

    // Dev key returns dummy URLs that RoEx can't process for final mix.
    // Mock the response so UI flow can be tested without real credits.
    // On production (no ROEX_DEV_API_KEY), this is always false.
    let mixResult;
    if (isRoExDevKey()) {
      mixResult = {
        taskId: `dev-final-${Date.now()}`,
        finalUrl: 'https://example.com/dev-final-mix.wav',
        previewUrl: null,
        fxSettings: null,
        stemsUrl: null,
      };
    } else {
      const client = createRoExClient();
      mixResult = await mixFinalBasic(client, {
        taskId: previewTask.roexTaskId,
        trackData,
      });
    }

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
