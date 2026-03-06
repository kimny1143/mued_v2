/**
 * MUEDial Tracks API
 * PATCH /api/dial/tracks   — Update track parameters (apply Hoo's suggestions)
 * GET   /api/dial/tracks   — List tracks for a session
 *
 * Used in dialogue mode when Hoo suggests parameter changes
 * and the user approves them.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { db } from '@/db';
import { dialTracks } from '@/db/schema';

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
  updates: z.array(trackUpdateSchema).min(1).max(50),
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
