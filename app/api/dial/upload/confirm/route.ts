/**
 * MUEDial Upload Confirm API
 * POST /api/dial/upload/confirm
 *
 * Called after the client successfully PUTs the file to GCS.
 * Saves the track record in the database, then copies to R2 for permanent URL.
 */

import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { copyToR2 } from '@/lib/dial/r2-storage';
import { db } from '@/db';
import { dialTracks } from '@/db/schema';

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const {
      sessionId,
      fileName,
      readableUrl,
      instrumentGroup,
      presenceSetting = 'NORMAL',
      panPreference = 'NO_PREFERENCE',
      reverbPreference = 'NONE',
    } = body as {
      sessionId?: string;
      fileName?: string;
      readableUrl?: string;
      instrumentGroup?: string;
      presenceSetting?: string;
      panPreference?: string;
      reverbPreference?: string;
    };

    if (!sessionId || !fileName || !readableUrl || !instrumentGroup) {
      return apiValidationError('sessionId, fileName, readableUrl, and instrumentGroup are required');
    }

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Verify payment completed
    if (session.paymentStatus !== 'paid') {
      return apiForbidden('Payment required before uploading');
    }

    // Save track record with GCS URL first
    const [track] = await db.insert(dialTracks).values({
      sessionId,
      originalFilename: fileName,
      roexUploadUrl: readableUrl,
      instrumentGroup,
      presenceSetting,
      panPreference,
      reverbPreference,
    }).returning();

    // Copy to R2 for permanent URL (GCS signed URLs expire in 1h)
    const r2Result = await copyToR2({
      sourceUrl: readableUrl,
      sessionId,
      taskId: track.id,
      taskType: 'stem',
      originalFilename: fileName,
    });

    if (r2Result) {
      // Replace GCS URL with permanent R2 URL
      await db.update(dialTracks)
        .set({ roexUploadUrl: r2Result.r2Url })
        .where(eq(dialTracks.id, track.id));

      return apiSuccess({ trackId: track.id, readableUrl: r2Result.r2Url });
    }

    // R2 copy failed — fall back to GCS URL (will expire in 1h)
    console.warn('[upload/confirm] R2 copy failed, using GCS URL (1h expiry)');
    return apiSuccess({ trackId: track.id, readableUrl });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Confirm failed');
  }
});
