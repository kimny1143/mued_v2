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
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership, verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { createRoExClient, mixPreview, pollMixPreview } from '@/lib/roex';
import type { MixTrackInput } from '@/lib/roex';
import { db } from '@/db';
import { dialTracks, dialTasks, dialSessions } from '@/db/schema';

// ─── Mappings ────────────────────────────────────────────────────────────────

/** Map UI musical style values to RoEx API enum values */
const MUSICAL_STYLE_MAP: Record<string, string> = {
  pop: 'POP',
  rock: 'ROCK_INDIE',
  hiphop: 'HIPHOP_GRIME',
  electronic: 'ELECTRONIC',
  jazz: 'OTHER',
  classical: 'ORCHESTRAL',
  rnb: 'POP',
  country: 'ACOUSTIC',
  metal: 'METAL',
  other: 'OTHER',
};

/** Map UI instrument group values to RoEx API enum values */
const INSTRUMENT_GROUP_MAP: Record<string, string> = {
  VOCAL: 'VOCAL_GROUP',
  GUITAR: 'ACOUSTIC_GUITAR_GROUP',
  BASS: 'BASS_GROUP',
  DRUMS: 'DRUMS_GROUP',
  KEYS: 'KEYS_GROUP',
  SYNTH: 'SYNTH_GROUP',
  STRINGS: 'STRINGS_GROUP',
  BRASS: 'BRASS_GROUP',
  OTHER: 'OTHER_GROUP1',
};

// ─── POST: Submit preview request ───────────────────────────────────────────

const previewRequestSchema = z.object({
  sessionId: z.string().uuid(),
  retrieveFxSettings: z.boolean().optional(),
});

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = previewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, retrieveFxSettings } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, sessionId),
    });
    if (tracks.length === 0) {
      return apiServerError('No tracks uploaded');
    }

    // Build RoEx preview request with mapped enum values
    const trackInputs: MixTrackInput[] = tracks.map((t) => ({
      trackUrl: t.roexUploadUrl,
      instrumentGroup: (INSTRUMENT_GROUP_MAP[t.instrumentGroup] ?? 'OTHER_GROUP') as MixTrackInput['instrumentGroup'],
      presenceSetting: t.presenceSetting as MixTrackInput['presenceSetting'],
      panPreference: t.panPreference as MixTrackInput['panPreference'],
      reverbPreference: t.reverbPreference as MixTrackInput['reverbPreference'],
    }));

    const roexMusicalStyle = MUSICAL_STYLE_MAP[session.musicalStyle] ?? 'OTHER';

    const client = createRoExClient();
    const result = await mixPreview(client, {
      tracks: trackInputs,
      musicalStyle: roexMusicalStyle as Parameters<typeof mixPreview>[1]['musicalStyle'],
      returnStems: true,
      retrieveFxSettings,
    });

    // Snapshot params used for this preview (for dirty-state comparison UI)
    const previewParams = {
      musicalStyle: session.musicalStyle,
      tracks: tracks.map((t) => ({
        id: t.id,
        filename: t.originalFilename,
        instrumentGroup: t.instrumentGroup,
        presenceSetting: t.presenceSetting,
        panPreference: t.panPreference,
        reverbPreference: t.reverbPreference,
      })),
    };

    // Save task record
    const [task] = await db.insert(dialTasks).values({
      sessionId,
      roexTaskId: result.taskId,
      taskType: 'preview',
      status: result.previewUrl ? 'completed' : 'processing',
      previewUrl: result.previewUrl,
      fxSettings: result.fxSettings ?? null,
      stemsUrls: result.stemsUrl ?? null,
      previewParams,
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

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return apiValidationError('taskId is required');
    }

    // Verify task ownership
    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Task not found');
    }

    const { task } = result;

    // Already completed? Return cached result.
    if (task.status === 'completed') {
      return apiSuccess({
        status: 'completed',
        previewUrl: task.previewUrl,
        fxSettings: task.fxSettings,
        stemsUrls: task.stemsUrls,
      });
    }

    // Poll RoEx — do NOT request FX settings here (costs 125 credits).
    // FX settings are retrieved separately in /api/dial/final when needed (dialogue mode).
    const client = createRoExClient();
    const pollResult = await pollMixPreview(client, task.roexTaskId, {
      retrieveFxSettings: false,
    });

    const isCompleted = !!pollResult.previewUrl;

    if (isCompleted) {
      // Update task with results
      await db.update(dialTasks).set({
        status: 'completed',
        previewUrl: pollResult.previewUrl,
        fxSettings: pollResult.fxSettings ?? null,
        stemsUrls: pollResult.stemsUrl ?? null,
        completedAt: new Date(),
      }).where(eq(dialTasks.id, taskId));
    }

    return apiSuccess({
      status: isCompleted ? 'completed' : 'processing',
      previewUrl: pollResult.previewUrl,
      fxSettings: isCompleted ? pollResult.fxSettings : undefined,
      stemsUrls: isCompleted ? pollResult.stemsUrl : undefined,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Poll failed');
  }
});
