/**
 * MUEDial Reference Track Upload Presign
 * POST /api/dial/reference/upload
 *
 * Returns a signed URL for uploading a reference track to RoEx GCS.
 * Same pattern as /api/dial/upload/presign.
 */

import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { createRoExClient, getUploadUrl } from '@/lib/roex';

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const { fileName, sessionId } = body as { fileName?: string; sessionId?: string };

    if (!fileName || !sessionId) {
      return apiValidationError('fileName and sessionId are required');
    }

    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    if (session.paymentStatus !== 'paid') {
      return apiForbidden('Payment required before uploading');
    }

    const client = createRoExClient();
    const { signedUrl, readableUrl } = await getUploadUrl(client, fileName);

    return apiSuccess({ signedUrl, readableUrl });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Reference upload presign failed');
  }
});
