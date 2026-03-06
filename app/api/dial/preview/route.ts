/**
 * MUEDial Preview API
 * POST /api/dial/preview     — Submit preview mix request
 * GET  /api/dial/preview      — Poll preview status
 *
 * Client-side polling (5s intervals) for MVP.
 * Each GET request completes in <10s (Vercel Hobby compatible).
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { createRoExClient, mixPreview, pollMixPreview } from '@/lib/roex';
import type { MixTrackInput } from '@/lib/roex';
import { db } from '@/db';
import { dialTracks, dialTasks, dialSessions } from '@/db/schema';

// ─── POST: Submit preview request ───────────────────────────────────────────

const previewRequestSchema = z.object({
  sessionId: z.string().uuid(),
  retrieveFxSettings: z.boolean().optional(),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = previewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, retrieveFxSettings } = parsed.data;

    // Load session and its tracks
    const session = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, sessionId),
    });
    if (!session) {
      return apiServerError('Session not found');
    }

    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, sessionId),
    });
    if (tracks.length === 0) {
      return apiServerError('No tracks uploaded');
    }

    // Build RoEx preview request
    const trackInputs: MixTrackInput[] = tracks.map((t) => ({
      trackUrl: t.roexUploadUrl,
      instrumentGroup: t.instrumentGroup as MixTrackInput['instrumentGroup'],
      presenceSetting: t.presenceSetting as MixTrackInput['presenceSetting'],
      panPreference: t.panPreference as MixTrackInput['panPreference'],
      reverbPreference: t.reverbPreference as MixTrackInput['reverbPreference'],
    }));

    const client = createRoExClient();
    const result = await mixPreview(client, {
      tracks: trackInputs,
      musicalStyle: session.musicalStyle as Parameters<typeof mixPreview>[1]['musicalStyle'],
      returnStems: true,
      retrieveFxSettings,
    });

    // Save task record
    const [task] = await db.insert(dialTasks).values({
      sessionId,
      roexTaskId: result.taskId,
      taskType: 'preview',
      status: result.previewUrl ? 'completed' : 'processing',
      previewUrl: result.previewUrl,
      fxSettings: result.fxSettings ?? null,
      stemsUrls: result.stemsUrl ?? null,
    }).returning();

    // Update session status
    await db.update(dialSessions)
      .set({ status: 'previewing', updatedAt: new Date() })
      .where(eq(dialSessions.id, sessionId));

    return apiSuccess({
      taskId: task.id,
      roexTaskId: result.taskId,
      status: task.status,
      previewUrl: result.previewUrl,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Preview request failed');
  }
});

// ─── GET: Poll preview status ───────────────────────────────────────────────

export const GET = withAuth(async ({ userId, request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return apiValidationError('taskId is required');
    }

    // Find the task
    const task = await db.query.dialTasks.findFirst({
      where: eq(dialTasks.id, taskId),
    });
    if (!task) {
      return apiServerError('Task not found');
    }

    // Already completed? Return cached result.
    if (task.status === 'completed') {
      return apiSuccess({
        status: 'completed',
        previewUrl: task.previewUrl,
        fxSettings: task.fxSettings,
        stemsUrls: task.stemsUrls,
      });
    }

    // Poll RoEx
    const client = createRoExClient();
    const result = await pollMixPreview(client, task.roexTaskId, {
      retrieveFxSettings: true,
    });

    const isCompleted = !!result.previewUrl;

    if (isCompleted) {
      // Update task with results
      await db.update(dialTasks).set({
        status: 'completed',
        previewUrl: result.previewUrl,
        fxSettings: result.fxSettings ?? null,
        stemsUrls: result.stemsUrl ?? null,
        completedAt: new Date(),
      }).where(eq(dialTasks.id, taskId));
    }

    return apiSuccess({
      status: isCompleted ? 'completed' : 'processing',
      previewUrl: result.previewUrl,
      fxSettings: isCompleted ? result.fxSettings : undefined,
      stemsUrls: isCompleted ? result.stemsUrl : undefined,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Poll failed');
  }
});
