/**
 * MUEDial Mastering Preview API
 * POST /api/dial/mastering/preview — Submit mastering preview request (FREE)
 * GET  /api/dial/mastering/preview — Poll mastering preview status
 *
 * Input: mix final URL (from completed mix) or uploaded 2-mix file
 * Output: mastering preview task
 */

import { z } from 'zod';
import { and, desc, eq, ne } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { createRoExClient, masterPreview, pollMasterPreview, isRoExDevKey, mapMusicalStyle } from '@/lib/roex';
import { resolveTrackUrl } from '@/lib/dial/resolve-track-url';
import { getDialBackstopMs, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';
import { db } from '@/db';
import { dialTasks, dialTracks, dialSessions } from '@/db/schema';
import { DELIVERY_TARGETS, DELIVERY_TARGET_LUFS, mapLufsToDesiredLoudness } from '@/lib/dial/lufs-presets';

const masteringPreviewSchema = z.object({
  sessionId: z.string().uuid(),
  desiredLoudness: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  deliveryTarget: z.enum(DELIVERY_TARGETS as [string, ...string[]]).optional(),
});

export const POST = withDialAuth(async (auth) => {
  try {
    // Rate limit: 5 mastering requests per minute (RoEx credit operations)
    const rateLimitResponse = await rateLimit(auth.request, "dial-process");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await auth.request.json();
    const parsed = masteringPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, desiredLoudness, deliveryTarget } = parsed.data;
    const resolvedLoudness = deliveryTarget
      ? mapLufsToDesiredLoudness(DELIVERY_TARGET_LUFS[deliveryTarget as keyof typeof DELIVERY_TARGET_LUFS])
      : (desiredLoudness ?? 'MEDIUM');

    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    if (!session.masteringMode) {
      return apiError('Mastering not included in this session', { code: 'NO_MASTERING', status: 400 });
    }

    // Find the mastering input: mix final URL or uploaded 2-mix track
    let trackUrl: string | null = null;

    // Look for a completed mix final task
    const allTasks = await db.query.dialTasks.findMany({
      where: eq(dialTasks.sessionId, sessionId),
      orderBy: [desc(dialTasks.createdAt)],
    });

    const finalTask = allTasks.find(
      (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
    );

    if (finalTask?.finalUrl) {
      trackUrl = finalTask.finalUrl;
    } else {
      // Mastering-only: use the first uploaded track as 2-mix
      const tracks = await db.query.dialTracks.findMany({
        where: eq(dialTracks.sessionId, sessionId),
      });
      if (tracks.length > 0) {
        trackUrl = resolveTrackUrl(tracks[0]);
      }
    }

    if (!trackUrl) {
      return apiError('No audio file available for mastering. Complete mixing first or upload a 2-mix.', {
        code: 'NO_TRACK',
        status: 400,
      });
    }

    const roexMusicalStyle = mapMusicalStyle(session.musicalStyle);

    let result: { taskId: string; previewUrl?: string | null };

    if (isRoExDevKey()) {
      // Dev key: skip real API call (dummy URLs cause 400 errors)
      result = {
        taskId: `dev-mastering-preview-${Date.now()}`,
        previewUrl: 'https://dev-dummy.roexaudio.com/mastering-preview.mp3',
      };
    } else {
      const client = createRoExClient();
      result = await masterPreview(client, {
        trackUrl,
        musicalStyle: roexMusicalStyle as Parameters<typeof masterPreview>[1]['musicalStyle'],
        desiredLoudness: resolvedLoudness,
      });
    }

    // Save mastering preview task
    const [task] = await db.insert(dialTasks).values({
      sessionId,
      roexTaskId: result.taskId,
      taskType: 'mastering_preview',
      status: result.previewUrl ? 'completed' : 'processing',
      previewUrl: result.previewUrl,
    }).returning();

    // Update session status to mastering
    await db.update(dialSessions)
      .set({ status: 'mastering', updatedAt: new Date() })
      .where(eq(dialSessions.id, sessionId));

    return apiSuccess({
      taskId: task.id,
      roexTaskId: result.taskId,
      status: task.status,
      previewUrl: result.previewUrl,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Mastering preview failed');
  }
});

// ─── GET: Poll mastering preview status ──────────────────────────────────────
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

    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Task not found');
    }

    const { task } = result;

    if (task.status === 'completed' && task.previewUrl) {
      return apiSuccess({
        status: 'completed',
        previewUrl: task.previewUrl,
      });
    }

    if (task.status === 'failed') {
      return apiSuccess({ status: 'failed' });
    }

    if (isRoExDevKey()) {
      return apiSuccess({ status: task.status });
    }

    // Check if task has been processing long enough to warrant RoEx fallback
    const elapsed = Date.now() - new Date(task.createdAt).getTime();
    if (elapsed < POLLING_FALLBACK_THRESHOLD_MS) {
      return apiSuccess({ status: 'processing' });
    }
    // Backstop-before-poll: past the generous backstop, fail WITHOUT polling RoEx.
    if (elapsed > getDialBackstopMs(task.taskType)) {
      const r = await markDialTaskFailedWithReconcile(taskId, 'mastering-preview processing backstop');
      return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
    }

    // Fallback: poll RoEx for mastering preview result
    const client = createRoExClient();
    try {
      const pollResult = await pollMasterPreview(client, task.roexTaskId);

      if (pollResult.previewUrl) {
        await db.update(dialTasks).set({
          status: 'completed',
          previewUrl: pollResult.previewUrl,
          completedAt: new Date(),
        }).where(and(eq(dialTasks.id, taskId), ne(dialTasks.status, 'failed')));
        return apiSuccess({ status: 'completed', previewUrl: pollResult.previewUrl });
      }

      // Explicit RoEx failure → fail. Otherwise keep processing (backstop above + cron).
      if (pollResult.status === 'failed') {
        const r = await markDialTaskFailedWithReconcile(taskId, 'RoEx reported mastering-preview failure');
        return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
      }

      return apiSuccess({ status: 'processing' });
    } catch (pollErr) {
      // Transient (comm-timeout abort / HTTP error). Keep processing.
      console.warn(`[mastering/preview/GET] transient poll error: ${pollErr instanceof Error ? pollErr.message : 'unknown'}`);
      return apiSuccess({ status: 'processing' });
    }
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Poll failed');
  }
});
