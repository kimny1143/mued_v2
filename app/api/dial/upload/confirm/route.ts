/**
 * MUEDial Upload Confirm API
 * POST /api/dial/upload/confirm
 *
 * Called after the client successfully PUTs the file to GCS.
 * Saves the track record in the database, then copies to R2 for permanent URL.
 *
 * Add vs replace: when `trackId` is supplied, the existing track row is REPLACED in place
 * (same trackId → same R2 key `stems/{sessionId}/{trackId}.{ext}`, so the new audio overwrites
 * the old one with no orphan stem). Otherwise a new track is inserted.
 *
 * Strategy: roexUploadUrl = GCS (for RoEx API), r2Url = R2 /stream/ (fallback when GCS expires)
 */

import { eq, and } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiForbidden, apiError } from '@/lib/api-response';
import { isDialSessionTrackEditable, dialTrackLockReason } from '@/lib/dial/session-edit-lock';
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
      trackId, // when present: replace this existing track in place
      presenceSetting = 'NORMAL',
      panPreference = 'NO_PREFERENCE',
      reverbPreference = 'NONE',
    } = body as {
      sessionId?: string;
      fileName?: string;
      readableUrl?: string;
      instrumentGroup?: string;
      trackId?: string;
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

    // Track set is frozen once a final mix/master has started (server-side lock — not cosmetic).
    if (!isDialSessionTrackEditable(session.status)) {
      const lock = dialTrackLockReason(session.status)!;
      return apiError(lock.message, { code: lock.code, status: 409 });
    }

    // Replace in place (same row/R2 key) when trackId is given, else insert a new track.
    let track: typeof dialTracks.$inferSelect;
    if (trackId) {
      const existing = await db.query.dialTracks.findFirst({
        where: and(eq(dialTracks.id, trackId), eq(dialTracks.sessionId, sessionId)),
      });
      if (!existing) {
        return apiNotFound('Track not found');
      }
      // Swap audio + filename (+ optional regroup); clear r2Url until the new copy lands below.
      [track] = await db
        .update(dialTracks)
        .set({ originalFilename: fileName, roexUploadUrl: readableUrl, instrumentGroup, r2Url: null })
        .where(and(eq(dialTracks.id, trackId), eq(dialTracks.sessionId, sessionId)))
        .returning();
    } else {
      // Save track record with GCS URL first
      [track] = await db.insert(dialTracks).values({
        sessionId,
        originalFilename: fileName,
        roexUploadUrl: readableUrl,
        instrumentGroup,
        presenceSetting,
        panPreference,
        reverbPreference,
      }).returning();
    }

    // Copy stem to R2 for permanent URL (GCS signed URLs expire in 1h)
    // Uses /stream/ path (no Content-Disposition) so RoEx can fetch it directly
    const workerUrl = process.env.DIAL_R2_WORKER_URL?.trim();
    const secret = process.env.DIAL_R2_SECRET?.trim();
    let r2Url: string | null = null;

    if (workerUrl && secret) {
      // ASCII-only R2 key: stems/{sessionId}/{trackId}.{ext}. The original filename is
      // NOT put in the key/URL. Previously the key was stems/{sessionId}/{fileName}, so a
      // non-ASCII (e.g. Japanese) filename produced an r2Url with raw non-ASCII bytes in
      // its path (`${workerUrl}/stream/${r2Key}`, no encoding). On GCS expiry the mix fell
      // back to that r2Url and RoEx could not fetch the malformed URL → those stems were
      // silently dropped from the mix (ASCII-named stems survived). trackId (UUID) gives
      // uniqueness; the filename stays in the DB (originalFilename) for display only.
      const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'wav';
      const r2Key = `stems/${sessionId}/${track.id}.${ext}`;
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
