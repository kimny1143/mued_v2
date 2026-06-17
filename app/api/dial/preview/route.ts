/**
 * MUEDial Preview API
 * POST /api/dial/preview     — Submit preview mix request
 * GET  /api/dial/preview      — Poll preview status
 *
 * Client-side polling (5s intervals) for MVP.
 * Each GET request completes in <10s (Vercel Hobby compatible).
 */

import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership, verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { recordDialEvent } from '@/lib/analytics/dial-events';
import { createRoExClient, mixPreview, pollMixPreview, mapMusicalStyle, mapInstrumentGroup } from '@/lib/roex';
import type { MixTrackInput } from '@/lib/roex';
import { resolveTrackUrl } from '@/lib/dial/resolve-track-url';
import { sanitizeUpstreamRoExError } from '@/lib/dial/roex-error';
import { withRoExRetry } from '@/lib/dial/retry-roex';
import { getDialBackstopMs, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';
import { db } from '@/db';
import { dialTracks, dialTasks, dialSessions } from '@/db/schema';

// ─── POST: Submit preview request ───────────────────────────────────────────

const previewRequestSchema = z.object({
  sessionId: z.string().uuid(),
  retrieveFxSettings: z.boolean().optional(),
});

export const POST = withDialAuth(async (auth) => {
  try {
    // Rate limit: 5 preview requests per minute (RoEx credit operations)
    const rateLimitResponse = await rateLimit(auth.request, "dial-process");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await auth.request.json();
    const parsed = previewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId, retrieveFxSettings } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Omakase preview limit check
    if (session.mode === 'omakase' && (session.previewCount ?? 0) >= 5) {
      return apiError('Preview limit reached (max 5). Generate your final mix.', {
        code: 'PREVIEW_LIMIT',
        status: 400,
      });
    }

    const tracks = await db.query.dialTracks.findMany({
      where: eq(dialTracks.sessionId, sessionId),
    });
    if (tracks.length === 0) {
      return apiServerError('No tracks uploaded');
    }

    // Build RoEx preview request with mapped enum values
    // Resolve track URLs with GCS→R2 fallback for expired signed URLs
    const trackInputs: MixTrackInput[] = tracks.map((t) => {
      const trackUrl = resolveTrackUrl(t);
      if (!trackUrl) {
        throw new Error(`Stem URL expired and no R2 fallback for "${t.originalFilename}". Please re-upload your stems.`);
      }
      return {
        trackUrl,
        instrumentGroup: mapInstrumentGroup(t.instrumentGroup) as MixTrackInput['instrumentGroup'],
        presenceSetting: t.presenceSetting as MixTrackInput['presenceSetting'],
        panPreference: t.panPreference as MixTrackInput['panPreference'],
        reverbPreference: t.reverbPreference as MixTrackInput['reverbPreference'],
      };
    });

    // Guard: each stem must resolve to a distinct URL. A collision (e.g. legacy same-filename
    // R2 keys after GCS expiry) would send RoEx duplicate trackURLs, which it silently
    // dedupes → the mix loses stems. Fail loudly instead of producing a broken mix.
    const urlCounts = new Map<string, number>();
    for (const ti of trackInputs) urlCounts.set(ti.trackUrl, (urlCounts.get(ti.trackUrl) ?? 0) + 1);
    if ([...urlCounts.values()].some((n) => n > 1)) {
      return apiError(
        'Some stems resolved to the same file (URL collision). Please re-upload your stems with distinct filenames.',
        { code: 'STEM_URL_COLLISION', status: 409 },
      );
    }

    const roexMusicalStyle = mapMusicalStyle(session.musicalStyle);

    const client = createRoExClient();
    // Preview submit is 0cr, so a retry can never double-charge — auto-retry transient RoEx
    // failures (5xx / 429 / network blip) so a one-off upstream hiccup doesn't dead-end the user
    // with INFRA_ERROR (incident 2026-06-15). A non-transient 4xx still propagates immediately.
    const result = await withRoExRetry(
      () =>
        mixPreview(client, {
          tracks: trackInputs,
          musicalStyle: roexMusicalStyle as Parameters<typeof mixPreview>[1]['musicalStyle'],
          returnStems: true,
          retrieveFxSettings,
        }),
      {
        onRetry: (err, attempt) =>
          console.warn(
            `[preview/POST] transient RoEx submit error (attempt ${attempt}), retrying: ${err instanceof Error ? err.message : String(err)}`,
          ),
      },
    );

    // Snapshot params used for this preview (for dirty-state comparison UI)
    const previewParams = {
      musicalStyle: session.musicalStyle,
      tracks: tracks.map((t) => ({
        id: t.id,
        filename: t.originalFilename,
        instrumentGroup: t.instrumentGroup,
        presenceSetting: t.presenceSetting,
        panPreference: t.panPreference,
        reverbPreference: t.reverbPreference,
      })),
    };

    // Save task record
    const [task] = await db.insert(dialTasks).values({
      sessionId,
      roexTaskId: result.taskId,
      taskType: 'preview',
      // Honor RoEx's failure signal: parseMixResponse derives previewUrl and isFailed from disjoint
      // fields, so a failed response can still carry a previewUrl. Don't stamp such a task
      // 'completed' (the GET poll path already gates on the same signal).
      status: result.status === 'failed' ? 'failed' : (result.previewUrl ? 'completed' : 'processing'),
      previewUrl: result.status === 'failed' ? null : result.previewUrl,
      fxSettings: result.fxSettings ?? null,
      stemsUrls: result.stemsUrl ?? null,
      previewParams,
    }).returning();

    // Update session status + increment preview count
    await db.update(dialSessions)
      .set({
        status: 'previewing',
        previewCount: (session.previewCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(dialSessions.id, sessionId));

    recordDialEvent({
      sessionId, eventType: 'preview', userId: auth.userId, guestToken: auth.guestToken,
      mode: session.mode, metadata: { previewCount: (session.previewCount ?? 0) + 1 },
    });

    return apiSuccess({
      taskId: task.id,
      roexTaskId: result.taskId,
      status: task.status,
      previewUrl: result.previewUrl,
    });
  } catch (error) {
    return sanitizeUpstreamRoExError(error, '[preview/POST]')
      ?? apiServerError(error instanceof Error ? error.message : 'Preview request failed');
  }
});

// ─── GET: Poll preview status ───────────────────────────────────────────────
//
// DB-first: returns cached result if webhook already updated the task.
// Fallback: if task has been processing for 30s+, polls RoEx directly.

const POLLING_FALLBACK_THRESHOLD_MS = 30_000;

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return apiValidationError('taskId is required');
    }

    // Verify task ownership
    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) {
      return apiNotFound('Task not found');
    }

    const { task } = result;

    // Already completed? Return cached result.
    if (task.status === 'completed' && task.previewUrl) {
      return apiSuccess({
        status: 'completed',
        previewUrl: task.previewUrl,
        fxSettings: task.fxSettings,
        stemsUrls: task.stemsUrls,
      });
    }

    if (task.status === 'failed') {
      return apiSuccess({ status: 'failed' });
    }

    // Check if task has been processing long enough to warrant RoEx fallback
    const elapsed = Date.now() - new Date(task.createdAt).getTime();
    if (elapsed < POLLING_FALLBACK_THRESHOLD_MS) {
      // Trust webhook — too early to poll RoEx
      return apiSuccess({ status: 'processing' });
    }
    // Backstop-before-poll: past the generous wall-clock backstop (preview ~19min observed,
    // backstop biased large), fail WITHOUT polling RoEx so a stuck task can't hang the
    // function. (preview is free, but this keeps the pattern uniform with the paid routes.)
    if (elapsed > getDialBackstopMs(task.taskType)) {
      const r = await markDialTaskFailedWithReconcile(taskId, 'preview processing backstop');
      return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
    }

    // Fallback: poll RoEx directly. Do NOT request FX settings here (costs 125 credits).
    const client = createRoExClient();
    try {
      const pollResult = await pollMixPreview(client, task.roexTaskId, {
        retrieveFxSettings: false,
      });

      if (pollResult.previewUrl) {
        await db.update(dialTasks).set({
          status: 'completed',
          previewUrl: pollResult.previewUrl,
          fxSettings: pollResult.fxSettings ?? null,
          stemsUrls: pollResult.stemsUrl ?? null,
          completedAt: new Date(),
        }).where(and(eq(dialTasks.id, taskId), ne(dialTasks.status, 'failed')));

        return apiSuccess({
          status: 'completed',
          previewUrl: pollResult.previewUrl,
          fxSettings: pollResult.fxSettings,
          stemsUrls: pollResult.stemsUrl,
        });
      }

      // Explicit RoEx failure → fail now. Otherwise keep processing (the backstop above is
      // the wall-clock catch; a comm-timeout abort is transient → handled in the catch).
      if (pollResult.status === 'failed') {
        const r = await markDialTaskFailedWithReconcile(taskId, 'RoEx reported preview failure');
        return apiSuccess({ status: r.failed ? 'failed' : 'processing' });
      }

      return apiSuccess({ status: 'processing' });
    } catch (pollErr) {
      // Transient (comm-timeout abort / HTTP error). Keep processing; the backstop (next
      // request) and the cron catch a genuinely stuck task.
      console.warn(`[preview/GET] transient poll error: ${pollErr instanceof Error ? pollErr.message : 'unknown'}`);
      return apiSuccess({ status: 'processing' });
    }
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Poll failed');
  }
});
