/**
 * MUEDial Upload Confirm API
 * POST /api/dial/upload/confirm
 *
 * Called after the client successfully PUTs the file to GCS.
 * Saves the track record in the database, then copies to R2 for permanent URL.
 *
 * Strategy: roexUploadUrl = GCS (for RoEx API), r2Url = R2 /stream/ (fallback when GCS expires)
 */

import { eq } from 'drizzle-orm';
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

    // Copy stem to R2 for permanent URL (GCS signed URLs expire in 1h)
    // Uses /stream/ path (no Content-Disposition) so RoEx can fetch it directly
    const workerUrl = process.env.DIAL_R2_WORKER_URL?.trim();
    const secret = process.env.DIAL_R2_SECRET?.trim();
    let r2Url: string | null = null;

    if (workerUrl && secret) {
      // Include the track UUID so the R2 key is unique even when two stems share a
      // filename (e.g. 4 vocal stems all named "vocal.wav"). Without this, same-named
      // stems collided on stems/{sessionId}/{fileName} → R2 overwrite → on GCS expiry
      // the fallback URL resolved all of them to one object → RoEx dropped the dupes.
      const r2Key = `stems/${sessionId}/${track.id}/${fileName}`;
      try {
        const res = await fetch(`${workerUrl}/copy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-R2-Secret': secret,
          },
          body: JSON.stringify({ sourceUrl: readableUrl, key: r2Key }),
        });
        if (res.ok) {
          r2Url = `${workerUrl}/stream/${r2Key}`;
          await db.update(dialTracks)
            .set({ r2Url })
            .where(eq(dialTracks.id, track.id));
        } else {
          const text = await res.text().catch(() => 'unknown');
          console.error(`[upload/confirm] R2 copy failed: ${res.status} ${text}`);
        }
      } catch (err) {
        console.error('[upload/confirm] R2 copy error:', err);
        // Non-fatal: GCS URL still works for ~1h, continue without R2
      }
    }

    return apiSuccess({ trackId: track.id, readableUrl, r2Url });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Confirm failed');
  }
});
