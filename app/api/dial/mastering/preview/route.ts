/**
 * MUEDial Mastering Preview API
 * POST /api/dial/mastering/preview — Submit mastering preview request (FREE)
 *
 * Input: mix final URL (from completed mix) or uploaded 2-mix file
 * Output: mastering preview task
 */

import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { createRoExClient, masterPreview, isRoExDevKey } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks, dialTracks, dialSessions } from '@/db/schema';

/** Map UI musical style values to RoEx API enum values */
const MUSICAL_STYLE_MAP: Record<string, string> = {
  pop: 'POP',
  rock: 'ROCK_INDIE',
  hiphop: 'HIPHOP_GRIME',
  electronic: 'ELECTRONIC',
  acoustic: 'ACOUSTIC',
  jazz: 'OTHER',
  classical: 'ORCHESTRAL',
  rnb: 'POP',
  country: 'ACOUSTIC',
  metal: 'METAL',
  reggae: 'REGGAE_DUB',
  other: 'OTHER',
};

const masteringPreviewSchema = z.object({
  sessionId: z.string().uuid(),
  desiredLoudness: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = masteringPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, desiredLoudness } = parsed.data;

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
        trackUrl = tracks[0].roexUploadUrl;
      }
    }

    if (!trackUrl) {
      return apiError('No audio file available for mastering. Complete mixing first or upload a 2-mix.', {
        code: 'NO_TRACK',
        status: 400,
      });
    }

    const roexMusicalStyle = MUSICAL_STYLE_MAP[session.musicalStyle] ?? 'OTHER';

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
        desiredLoudness: desiredLoudness ?? 'MEDIUM',
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
