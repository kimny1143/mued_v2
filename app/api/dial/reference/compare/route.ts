/**
 * MUEDial Reference vs Preview Comparison
 * POST /api/dial/reference/compare
 *
 * Compares the reference track with the latest preview mix using RoEx /mixcomparison.
 * Does not persist — computed on demand.
 */

import { eq, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { createRoExClient, compareMixes } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks } from '@/db/schema';

export const maxDuration = 60;

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return apiValidationError('sessionId is required');
    }

    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    if (!session.referenceTrackUrl) {
      return apiValidationError('No reference track uploaded for this session');
    }

    // Find latest completed preview task with a preview URL
    const latestPreview = await db.query.dialTasks.findFirst({
      where: eq(dialTasks.sessionId, sessionId),
      orderBy: [desc(dialTasks.createdAt)],
    });

    const previewUrl = latestPreview?.previewUrl || latestPreview?.finalUrl;
    if (!previewUrl) {
      return apiValidationError('No preview mix available for comparison');
    }

    const client = createRoExClient();
    const comparisonResult = await compareMixes(
      client,
      session.referenceTrackUrl,
      previewUrl,
      session.musicalStyle,
    );

    return apiSuccess({ comparisonResult });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Comparison failed');
  }
});
