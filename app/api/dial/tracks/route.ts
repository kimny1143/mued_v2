/**
 * MUEDial Tracks API
 * PATCH  /api/dial/tracks   — Update track parameters (apply Hoo's suggestions)
 * DELETE /api/dial/tracks   — Remove a track
 * GET    /api/dial/tracks   — List tracks for a session
 *
 * Mutations (PATCH/DELETE) are blocked once the session's track set is locked
 * (final mix/mastering started) — enforced server-side, see lib/dial/session-edit-lock.
 * Add/replace go through /api/dial/upload/presign + /confirm (confirm takes an optional
 * trackId to replace in place) — that path streams the file via the Worker proxy to avoid
 * Vercel's 4.5MB request-body limit, so it is NOT done here.
 */

import { z } from 'zod';
import { boundedArray } from "@/lib/validation/bounded-array";
import { eq, and } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { isDialSessionTrackEditable, dialTrackLockReason } from '@/lib/dial/session-edit-lock';
import { db } from '@/db';
import { dialTracks } from '@/db/schema';

/** 409 response when a session's track set is locked (final started). Null when editable. */
function trackLockResponse(status: string | null | undefined) {
  if (isDialSessionTrackEditable(status)) return null;
  const lock = dialTrackLockReason(status)!;
  return apiError(lock.message, { code: lock.code, status: 409 });
}

// ─── PATCH: Update track parameters ────────────────────────────────────────

const trackUpdateSchema = z.object({
  trackId: z.string().uuid(),
  presenceSetting: z.enum(['NORMAL', 'LEAD', 'BACKGROUND']).optional(),
  panPreference: z.enum(['NO_PREFERENCE', 'LEFT', 'CENTRE', 'RIGHT']).optional(),
  reverbPreference: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  instrumentGroup: z.string().optional(),
});

const batchUpdateSchema = z.object({
  sessionId: z.string().uuid(),
  updates: boundedArray(trackUpdateSchema, { min: 1, max: 50 }),
});

export const PATCH = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = batchUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, updates } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Track set frozen once a final mix/master started (server-side lock — not cosmetic).
    const locked = trackLockResponse(session.status);
    if (locked) return locked;

    // Apply each update
    const results = await Promise.all(
      updates.map(async ({ trackId, ...changes }) => {
        const updateData: Record<string, string> = {};
        if (changes.presenceSetting) updateData.presenceSetting = changes.presenceSetting;
        if (changes.panPreference) updateData.panPreference = changes.panPreference;
        if (changes.reverbPreference) updateData.reverbPreference = changes.reverbPreference;
        if (changes.instrumentGroup) updateData.instrumentGroup = changes.instrumentGroup;

        if (Object.keys(updateData).length === 0) return null;

        const [updated] = await db
          .update(dialTracks)
          .set(updateData)
          .where(
            and(
              eq(dialTracks.id, trackId),
              eq(dialTracks.sessionId, sessionId),
            ),
          )
          .returning();

        return updated ?? null;
      }),
    );

    const updated = results.filter(Boolean);

    return apiSuccess({
      updatedCount: updated.length,
      tracks: updated,
    });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Track update failed',
    );
  }
});

// ─── DELETE: Remove a track ──────────────────────────────────────────────────

const trackDeleteSchema = z.object({
  sessionId: z.string().uuid(),
  trackId: z.string().uuid(),
});

export const DELETE = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = trackDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, trackId } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Track set frozen once a final mix/master started (server-side lock — not cosmetic).
    const locked = trackLockResponse(session.status);
    if (locked) return locked;

    // Delete track (only if it belongs to this session)
    const [deleted] = await db
      .delete(dialTracks)
      .where(
        and(
          eq(dialTracks.id, trackId),
          eq(dialTracks.sessionId, sessionId),
        ),
      )
      .returning();

    if (!deleted) {
      return apiNotFound('Track not found');
    }

    return apiSuccess({ deletedTrackId: deleted.id });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Track delete failed',
    );
  }
});

// ─── GET: List tracks for a session ─────────────────────────────────────────

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return apiValidationError('sessionId is required');
    }

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, sessionId),
    });

    return apiSuccess({ tracks });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Failed to load tracks',
    );
  }
});
