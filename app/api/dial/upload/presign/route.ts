/**
 * MUEDial Upload Presign API
 * POST /api/dial/upload/presign
 *
 * Returns a signed URL for the client to PUT the file directly to RoEx GCS.
 * No file body — only metadata (fileName, sessionId).
 * This avoids Vercel's 4.5MB body size limit.
 */

import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden, apiError } from '@/lib/api-response';
import { createRoExClient, getUploadUrl } from '@/lib/roex';
import { isDialSessionTrackEditable, dialTrackLockReason } from '@/lib/dial/session-edit-lock';
import { sanitizeUploadError } from '@/lib/dial/roex-error';

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const { fileName, sessionId } = body as { fileName?: string; sessionId?: string };

    if (!fileName || !sessionId) {
      return apiValidationError('fileName and sessionId are required');
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
    // Covers both add and replace, since replace also presigns before re-uploading.
    if (!isDialSessionTrackEditable(session.status)) {
      const lock = dialTrackLockReason(session.status)!;
      return apiError(lock.message, { code: lock.code, status: 409 });
    }

    // Get signed URL from RoEx
    const client = createRoExClient();
    const { signedUrl, readableUrl } = await getUploadUrl(client, fileName);

    return apiSuccess({ signedUrl, readableUrl });
  } catch (error) {
    return sanitizeUploadError(error, '[upload/presign/POST]')
      ?? apiServerError(error instanceof Error ? error.message : 'Presign failed');
  }
});
