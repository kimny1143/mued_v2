/**
 * MUEDial Upload API
 * POST /api/dial/upload
 *
 * Returns a RoEx signed URL for direct client-side upload.
 * Browser PUTs the WAV/FLAC file directly to GCS (bypasses Vercel 4.5MB limit).
 *
 * Flow:
 *   1. Client → POST /api/dial/upload { sessionId, fileName, instrumentGroup }
 *   2. Server → RoEx /upload → { signedUrl, readableUrl }
 *   3. Server → saves dial_tracks row with readableUrl
 *   4. Client → PUT file to signedUrl directly
 */

import { z } from 'zod';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
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

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, fileName, instrumentGroup, presenceSetting, panPreference, reverbPreference } = parsed.data;

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
