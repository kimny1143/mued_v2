/**
 * MUEDial Reference Track Confirm + Analyze
 * POST /api/dial/reference/confirm
 *
 * After client uploads the reference track to GCS, this endpoint:
 * 1. Runs analyzeMix on the reference track
 * 2. Saves URL, filename, and analysis result to dial_sessions
 * 3. Returns the analysis result
 */

import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { createRoExClient, analyzeMix } from '@/lib/roex';
import type { MusicalStyle } from '@/lib/roex';
import { db } from '@/db';
import { dialSessions } from '@/db/schema';

export const maxDuration = 60;

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const { sessionId, readableUrl, fileName } = body as {
      sessionId?: string;
      readableUrl?: string;
      fileName?: string;
    };

    if (!sessionId || !readableUrl || !fileName) {
      return apiValidationError('sessionId, readableUrl, and fileName are required');
    }

    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    if (session.paymentStatus !== 'paid') {
      return apiForbidden('Payment required');
    }

    // Run RoEx analysis on the reference track
    const client = createRoExClient();
    const analysisResult = await analyzeMix(client, {
      audioUrl: readableUrl,
      musicalStyle: session.musicalStyle as MusicalStyle,
      isMaster: false,
    });

    console.log('[reference/confirm] Raw analysis result:', JSON.stringify(analysisResult.raw, null, 2));

    // Save to session
    await db.update(dialSessions)
      .set({
        referenceTrackUrl: readableUrl,
        referenceTrackFilename: fileName,
        referenceAnalysisResult: analysisResult,
        updatedAt: new Date(),
      })
      .where(eq(dialSessions.id, sessionId));

    return apiSuccess({ analysisResult });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Reference confirm failed');
  }
});
