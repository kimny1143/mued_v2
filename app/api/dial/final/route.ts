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
import { createRoExClient, mixFinalBasic, mixFinalAdvanced } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks, dialSessions } from '@/db/schema';

const eqBandSchema = z.object({
  frequency: z.number(),
  gain: z.number(),
  q: z.number(),
});

const compressorSchema = z.object({
  attack: z.number(),
  release: z.number(),
  threshold: z.number(),
  ratio: z.number(),
});

const basicTrackSchema = z.object({
  trackUrl: z.string().url(),
  gainDb: z.number(),
});

const advancedTrackSchema = basicTrackSchema.extend({
  eqBands: z.array(eqBandSchema).optional(),
  compressor: compressorSchema.optional(),
  panAngleDegrees: z.number().optional(),
});

const finalRequestSchema = z.object({
  previewTaskId: z.string().uuid(), // The dial_tasks.id of the preview
  mode: z.enum(['basic', 'advanced']),
  trackData: z.array(z.union([basicTrackSchema, advancedTrackSchema])).min(1),
});

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = finalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { previewTaskId, mode, trackData } = parsed.data;

    // Verify task ownership (preview task → session → user)
    const result = await verifyDialTaskOwnership(previewTaskId, auth);
    if (!result) {
      return apiNotFound('Preview task not found');
    }

    const { task: previewTask } = result;

    const client = createRoExClient();

    const mixResult = mode === 'basic'
      ? await mixFinalBasic(client, {
          taskId: previewTask.roexTaskId,
          trackData: trackData.map((t) => ({
            trackUrl: t.trackUrl,
            gainDb: t.gainDb,
          })),
        })
      : await mixFinalAdvanced(client, {
          taskId: previewTask.roexTaskId,
          trackData: trackData as z.infer<typeof advancedTrackSchema>[],
        });

    // Save final task
    const taskType = mode === 'basic' ? 'final_basic' as const : 'final_advanced' as const;
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
