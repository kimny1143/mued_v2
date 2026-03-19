/**
 * MUEDial Upload Confirm API
 * POST /api/dial/upload/confirm
 *
 * Called after the client successfully PUTs the file to GCS.
 * Saves the track record in the database, then copies to R2 for permanent URL.
 */

import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden } from '@/lib/api-response';
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

    // TODO: R2 copy disabled — RoEx has trouble downloading from R2 Worker URLs
    // (テイク2: 17min, テイク3: 30min+ stalled vs テイク1 GCS: 8min)
    // Re-enable after investigating R2 Worker download performance for RoEx.
    // For now, use GCS signed URL directly (1h expiry).

    return apiSuccess({ trackId: track.id, readableUrl });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Confirm failed');
  }
});
