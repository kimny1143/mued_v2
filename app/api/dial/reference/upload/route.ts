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

    // Free campaign: reference-track is disabled (free sessions are paymentStatus=paid,
    // so the gate above does not catch them). A reference track makes chat run
    // /mixcomparison on every message — a hidden per-message RoEx cost we exclude from
    // the free tier. Reference comparison stays a paid differentiator.
    if (session.isFreeCampaign) {
      return apiForbidden('Reference track comparison is not available on the free trial.');
    }

    const client = createRoExClient();
    const { signedUrl, readableUrl } = await getUploadUrl(client, fileName);

    return apiSuccess({ signedUrl, readableUrl });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Reference upload presign failed');
  }
});
