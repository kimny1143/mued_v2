/**
 * MUEDial Audio Analysis API
 * POST /api/dial/analyze
 *
 * Runs RoEx Mix Analysis on the session's audio (2-mix or mix final).
 * Returns loudness, peak, stereo field, clipping, tonal profile.
 * Cost: ~10 credits per call.
 */

import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { createRoExClient, isRoExDevKey, analyzeMix, mapMusicalStyle } from '@/lib/roex';
import type { MusicalStyle } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks, dialTracks, dialSessions } from '@/db/schema';

const analyzeSchema = z.object({
  sessionId: z.string().uuid(),
});

/** Dummy analysis data for dev key testing */
const DEV_ANALYSIS_RESULT = {
  loudnessLufs: -18.2,
  peakDbfs: -1.3,
  stereoField: 'wide',
  monoCompatible: true,
  clipping: false,
  tonalProfile: { low: 0.3, mid: 0.45, high: 0.25 },
  raw: {},
};

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId } = parsed.data;

    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Already analyzed — return cached result
    if (session.analysisResult) {
      return apiSuccess({ analysisResult: session.analysisResult, cached: true });
    }

    // Find audio URL to analyze
    let audioUrl: string | null = null;
    const isMasteringOnly = !session.mode && !!session.masteringMode;

    if (isMasteringOnly) {
      // Mastering-only: use the first uploaded track (2-mix)
      const tracks = await db.query.dialTracks.findMany({
        where: eq(dialTracks.sessionId, sessionId),
      });
      if (tracks.length > 0) {
        audioUrl = tracks[0].roexUploadUrl;
      }
    } else {
      // Mix+mastering: use the completed mix final URL
      const allTasks = await db.query.dialTasks.findMany({
        where: eq(dialTasks.sessionId, sessionId),
        orderBy: [desc(dialTasks.createdAt)],
      });
      const finalTask = allTasks.find(
        (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
      );
      if (finalTask?.finalUrl) {
        audioUrl = finalTask.finalUrl;
      }
    }

    if (!audioUrl) {
      return apiError('No audio file available for analysis', { code: 'NO_TRACK', status: 400 });
    }

    // Dev key: return dummy data
    if (isRoExDevKey()) {
      await db.update(dialSessions)
        .set({ analysisResult: DEV_ANALYSIS_RESULT, updatedAt: new Date() })
        .where(eq(dialSessions.id, sessionId));

      return apiSuccess({ analysisResult: DEV_ANALYSIS_RESULT, cached: false });
    }

    // Use OTHER for analysis — LUFS/peak/stereo are genre-independent
    const roexStyle = mapMusicalStyle(session.musicalStyle);

    const client = createRoExClient();
    const result = await analyzeMix(client, {
      audioUrl,
      musicalStyle: roexStyle as MusicalStyle,
      isMaster: false,
    });

    // Save to session
    await db.update(dialSessions)
      .set({ analysisResult: result, updatedAt: new Date() })
      .where(eq(dialSessions.id, sessionId));

    return apiSuccess({ analysisResult: result, cached: false });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Analysis failed');
  }
});
