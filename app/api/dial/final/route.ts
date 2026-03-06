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
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
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

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = finalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { previewTaskId, mode, trackData } = parsed.data;

    // Find preview task to get roexTaskId
    const previewTask = await db.query.dialTasks.findFirst({
      where: eq(dialTasks.id, previewTaskId),
    });
    if (!previewTask) {
      return apiServerError('Preview task not found');
    }

    const client = createRoExClient();

    const result = mode === 'basic'
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
      roexTaskId: result.taskId || previewTask.roexTaskId,
      taskType,
      status: result.finalUrl ? 'completed' : 'processing',
      finalUrl: result.finalUrl,
      fxSettings: result.fxSettings ?? null,
      stemsUrls: result.stemsUrl ?? null,
      completedAt: result.finalUrl ? new Date() : null,
    }).returning();

    // Update session status
    if (result.finalUrl) {
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
      finalUrl: result.finalUrl,
      stemsUrls: result.stemsUrl,
      fxSettings: result.fxSettings,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Final mix failed');
  }
});
