/**
 * MUEDial Upload API
 * POST /api/dial/upload
 *
 * Accepts audio file via FormData and uploads to RoEx GCS via server-side proxy.
 * (Direct browser→GCS PUT fails due to CORS on RoEx's bucket.)
 *
 * Flow:
 *   1. Client → POST /api/dial/upload (FormData: file + sessionId + instrumentGroup)
 *   2. Server → verifies session ownership + payment
 *   3. Server → RoEx /upload → { signedUrl, readableUrl }
 *   4. Server → PUT file to signedUrl
 *   5. Server → saves dial_tracks row
 */

import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden, apiError } from '@/lib/api-response';
import { createRoExClient, getUploadUrl, uploadToSignedUrl } from '@/lib/roex';
import { isDialSessionTrackEditable, dialTrackLockReason } from '@/lib/dial/session-edit-lock';
import { db } from '@/db';
import { dialTracks } from '@/db/schema';

export const POST = withDialAuth(async (auth) => {
  try {
    const formData = await auth.request.formData();

    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const instrumentGroup = formData.get('instrumentGroup') as string | null;
    const presenceSetting = (formData.get('presenceSetting') as string) || 'NORMAL';
    const panPreference = (formData.get('panPreference') as string) || 'NO_PREFERENCE';
    const reverbPreference = (formData.get('reverbPreference') as string) || 'NONE';

    if (!file || !sessionId || !instrumentGroup) {
      return apiValidationError('file, sessionId, and instrumentGroup are required');
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

    // Track set is frozen once a final mix/master has started (server-side lock — not cosmetic).
    if (!isDialSessionTrackEditable(session.status)) {
      const lock = dialTrackLockReason(session.status)!;
      return apiError(lock.message, { code: lock.code, status: 409 });
    }

    // Get signed URL from RoEx
    const client = createRoExClient();
    const { signedUrl, readableUrl } = await getUploadUrl(client, file.name);

    // Upload file to GCS via signed URL (server-side)
    const contentType = file.type || 'audio/wav';
    const buffer = await file.arrayBuffer();
    await uploadToSignedUrl(signedUrl, buffer, contentType);

    // Save track record
    const [track] = await db.insert(dialTracks).values({
      sessionId,
      originalFilename: file.name,
      roexUploadUrl: readableUrl,
      instrumentGroup,
      presenceSetting,
      panPreference,
      reverbPreference,
    }).returning();

    return apiSuccess({
      trackId: track.id,
      readableUrl,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Upload failed');
  }
});
