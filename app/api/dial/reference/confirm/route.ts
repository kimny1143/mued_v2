/**
 * MUEDial Reference Track Confirm + Analyze
 * POST /api/dial/reference/confirm
 *
 * After client uploads the reference track to GCS, this endpoint:
 * 1. Copies to R2 for permanent URL
 * 2. Runs analyzeMix on the reference track
 * 3. Saves URL, filename, and analysis result to dial_sessions
 * 4. Returns the analysis result
 */

import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { createRoExClient, analyzeMix } from '@/lib/roex';
import type { MusicalStyle } from '@/lib/roex';
import { copyToR2 } from '@/lib/dial/r2-storage';
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

    // Free campaign: reference-track disabled (hidden /mixcomparison per-message cost).
    if (session.isFreeCampaign) {
      return apiForbidden('Reference track comparison is not available on the free trial.');
    }

    // Copy to R2 for permanent URL (GCS signed URLs expire in 1h)
    const r2Result = await copyToR2({
      sourceUrl: readableUrl,
      sessionId,
      taskId: 'reference',
      taskType: 'reference',
      originalFilename: fileName,
    });

    const permanentUrl = r2Result?.r2Url ?? readableUrl;
    if (!r2Result) {
      console.warn('[reference/confirm] R2 copy failed, using GCS URL (1h expiry)');
    }

    // Run RoEx analysis on the reference track (use GCS URL — still valid)
    const client = createRoExClient();
    const analysisResult = await analyzeMix(client, {
      audioUrl: readableUrl,
      musicalStyle: session.musicalStyle as MusicalStyle,
      isMaster: false,
    });

    // Save to session with permanent R2 URL
    await db.update(dialSessions)
      .set({
        referenceTrackUrl: permanentUrl,
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
