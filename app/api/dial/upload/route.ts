/**
 * MUEDial Upload API
 * POST /api/dial/upload
 *
 * Returns a RoEx signed URL for direct client-side upload.
 * Browser PUTs the WAV/FLAC file directly to GCS (bypasses Vercel 4.5MB limit).
 *
 * Flow:
 *   1. Client → POST /api/dial/upload { sessionId, fileName, instrumentGroup }
 *   2. Server → verifies session ownership + payment
 *   3. Server → RoEx /upload → { signedUrl, readableUrl }
 *   4. Server → saves dial_tracks row with readableUrl
 *   5. Client → PUT file to signedUrl directly
 */

import { z } from 'zod';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { createRoExClient, getUploadUrl } from '@/lib/roex';
import { db } from '@/db';
import { dialTracks } from '@/db/schema';

const uploadRequestSchema = z.object({
  sessionId: z.string().uuid(),
  fileName: z.string().min(1),
  instrumentGroup: z.string(),
  presenceSetting: z.string().optional(),
  panPreference: z.string().optional(),
  reverbPreference: z.string().optional(),
});

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, fileName, instrumentGroup, presenceSetting, panPreference, reverbPreference } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Verify payment completed
    if (session.paymentStatus !== 'paid') {
      return apiForbidden('Payment required before uploading');
    }

    // Get signed URL from RoEx
    const client = createRoExClient();
    const { signedUrl, readableUrl } = await getUploadUrl(client, fileName);

    // Save track record with readableUrl (file not yet uploaded)
    const [track] = await db.insert(dialTracks).values({
      sessionId,
      originalFilename: fileName,
      roexUploadUrl: readableUrl,
      instrumentGroup,
      presenceSetting: presenceSetting ?? 'NORMAL',
      panPreference: panPreference ?? 'NO_PREFERENCE',
      reverbPreference: reverbPreference ?? 'NONE',
    }).returning();

    return apiSuccess({
      trackId: track.id,
      signedUrl,
      readableUrl,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Upload failed');
  }
});
