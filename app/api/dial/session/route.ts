/**
 * MUEDial Session API
 * POST  /api/dial/session     — Create new session (guest or logged-in)
 * GET   /api/dial/session     — List/get sessions
 * PATCH /api/dial/session     — Update session parameters (musicalStyle, title)
 */

import { randomBytes } from 'crypto';
import { after } from 'next/server';
import { z } from 'zod';
import { eq, desc, max, and, ne } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership, verifyDialSessionReadAccess } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { createRoExClient, isRoExDevKey, pollMixPreview, pollMixFinal, pollMasterPreview, masterFinal } from '@/lib/roex';
import { persistDeliverableToR2 } from '@/lib/dial/r2-persist';
import { resolveTrackUrl } from '@/lib/dial/resolve-track-url';
import { markDialTaskFailedWithReconcile, isUnchargedMasteringReservation } from '@/lib/dial/task-timeout';
import { db } from '@/db';
import { dialSessions, dialTasks, dialTracks } from '@/db/schema';
import { buildFirstTouch, firstTouchInputSchema } from '@/lib/dial/first-touch';

// The GET's inline poll hands an R2 copy to after(), which runs inside this function's lifetime.
// One copy can take up to 90s (COPY_TIMEOUT_MS in lib/dial/r2-storage.ts); mastering/final runs the
// same copy under the same bound.
export const maxDuration = 120;

// ─── POST: Create session ───────────────────────────────────────────────────

const createSessionSchema = z.object({
  mode: z.enum(['omakase', 'dialogue']),
  musicalStyle: z.string(),
  title: z.string().optional(),
  firstTouch: firstTouchInputSchema,
});

export const POST = withDialAuth(async ({ userId, isGuest, request }) => {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    // Generate guest token if guest user
    const guestToken = isGuest ? randomBytes(32).toString('hex') : null;
    const guestTokenExpiresAt = isGuest
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : null;

    // Per-user draft number: MAX(draft_number) + 1 per userId; guests always 1
    let draftNumber = 1;
    if (userId && !isGuest) {
      const [row] = await db
        .select({ maxDraft: max(dialSessions.draftNumber) })
        .from(dialSessions)
        .where(eq(dialSessions.userId, userId));
      draftNumber = (row?.maxDraft ?? 0) + 1;
    }

    // First-touch attribution (best-effort, never blocks creation; null when nothing is known).
    const firstTouch = buildFirstTouch(request.headers, parsed.data.firstTouch);

    const [session] = await db.insert(dialSessions).values({
      userId: userId ?? undefined,
      mode: parsed.data.mode,
      musicalStyle: parsed.data.musicalStyle,
      title: parsed.data.title,
      draftNumber,
      guestToken,
      guestTokenExpiresAt,
      firstTouch: firstTouch ?? undefined,
    }).returning();

    return apiSuccess({
      ...session,
      // Return guest token only on creation (client stores in localStorage)
      ...(guestToken ? { guestToken } : {}),
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Session creation failed');
  }
});

// ─── GET: List sessions or get single ───────────────────────────────────────

export const GET = withDialAuth(async (auth) => {
  try {
    const { searchParams } = new URL(auth.request.url);
    const sessionId = searchParams.get('id');

    if (sessionId) {
      // Single session: owner OR allow-listed admin (read-only). viaAdmin skips polling side-effects.
      const access = await verifyDialSessionReadAccess(sessionId, auth, 'view');
      if (!access) {
        return apiNotFound('Session not found');
      }
      const { viaAdmin } = access;

      // Load with tracks, tasks, and latest parameterChanges from assistant
      const full = await db.query.dialSessions.findFirst({
        where: eq(dialSessions.id, sessionId),
        with: {
          tracks: true,
          tasks: {
            orderBy: [desc(dialTasks.createdAt)],
          },
          messages: {
            where: (m, { and, isNotNull, eq: eqFn }) =>
              and(isNotNull(m.parameterChanges), eqFn(m.role, 'assistant')),
            orderBy: (m, { desc: descFn }) => [descFn(m.createdAt)],
            limit: 1,
          },
        },
      });

      // Poll RoEx for any processing tasks and update DB.
      // Skipped for admin reads (viaAdmin) — admin viewing must be zero-cost & read-only
      // (no RoEx calls, no task/session state mutation).
      if (!viaAdmin && full?.tasks) {
        const processingTasks = full.tasks.filter(
          (t) => t.status === 'processing' || t.status === 'pending',
        );

        for (const task of processingTasks) {
          try {
            const client = createRoExClient();

            if (task.taskType === 'preview') {
              const result = await pollMixPreview(client, task.roexTaskId, {
                retrieveFxSettings: false,
              });

              if (result.previewUrl) {
                await db.update(dialTasks).set({
                  status: 'completed',
                  previewUrl: result.previewUrl,
                  // PR-R3 (守り #1): persist stems too — the sibling mix_check/final poll writes
                  // stemsUrls (below) but this preview-completion path omitted it, so when the
                  // session GET poll (not the POST/webhook) is what completes a preview, the client
                  // had no stem URLs → stem decode stalled ("Decoding…" forever). pollMixPreview
                  // returns stemsUrl regardless of retrieveFxSettings.
                  stemsUrls: result.stemsUrl ?? null,
                  completedAt: new Date(),
                }).where(and(eq(dialTasks.id, task.id), ne(dialTasks.status, 'failed')));

                await db.update(dialSessions).set({
                  status: 'uploading',
                  updatedAt: new Date(),
                }).where(and(eq(dialSessions.id, sessionId), ne(dialSessions.status, 'completed')));
              } else if (result.status === 'failed') {
                // Race-safe failure write (never clobbers a completed task) + session/
                // previewCount reconcile. Replaces the prior unconditional id-update.
                await markDialTaskFailedWithReconcile(task.id, 'session-poll: RoEx reported failure');
              }
            } else if (task.taskType === 'final_basic' || task.taskType === 'final_advanced' || task.taskType === 'mix_check') {
              // Dev key: dummy track URLs cause /retrievefinalmix to fail — skip polling
              if (isRoExDevKey()) continue;

              const tracks = await db.query.dialTracks.findMany({
                where: eq(dialTracks.sessionId, sessionId),
              });
              // Resolve to the live URL (GCS→R2 fallback) like every sibling poll path
              // (final/route.ts, webhooks/roex, download) — the raw roexUploadUrl is a ~1h GCS
              // signed URL, so this inline poll would otherwise feed RoEx a dead URL for any
              // returning/copied session whose GCS upload has expired.
              const trackUrls = tracks.map((t) => resolveTrackUrl(t) ?? t.roexUploadUrl);

              // Free campaign: poll must not re-request the (+50cr) stems the free submit skipped.
              const result = await pollMixFinal(client, task.roexTaskId, trackUrls, {
                returnStems: !full.isFreeCampaign,
              });

              if (result.finalUrl) {
                await db.update(dialTasks).set({
                  status: 'completed',
                  finalUrl: result.finalUrl,
                  stemsUrls: result.stemsUrl ?? null,
                  completedAt: new Date(),
                }).where(and(eq(dialTasks.id, task.id), ne(dialTasks.status, 'failed')));

                // Copy the deliverable to R2 for a stable download URL. after() keeps the function
                // alive until the copy AND its row update finish, without holding this poll response.
                // (It used to be fire-and-forget with the update built inside .then() but never
                // awaited — a Drizzle query only runs when awaited, so r2_final_url was never written.)
                const finalUrl = result.finalUrl;
                after(() =>
                  persistDeliverableToR2({
                    sourceUrl: finalUrl,
                    sessionId,
                    taskId: task.id,
                    taskType: task.taskType,
                  }).catch((err) => console.error('[session/GET] R2 copy failed:', err)),
                );

                // Mix check: stay in mixing state. Final: check if mastering follows.
                const sessionRow = await db.query.dialSessions.findFirst({
                  where: eq(dialSessions.id, sessionId),
                });
                const newStatus = task.taskType === 'mix_check'
                  ? 'mixing' as const
                  : sessionRow?.masteringMode
                    ? 'mastering' as const
                    : 'completed' as const;
                await db.update(dialSessions).set({
                  status: newStatus,
                  updatedAt: new Date(),
                }).where(and(eq(dialSessions.id, sessionId), ne(dialSessions.status, 'completed')));
              } else if (result.status === 'failed') {
                // Race-safe failure write (never clobbers a completed task) + session/
                // previewCount reconcile. Replaces the prior unconditional id-update.
                await markDialTaskFailedWithReconcile(task.id, 'session-poll: RoEx reported failure');
              }
            } else if (task.taskType === 'mastering_preview') {
              // Dev key: dummy URLs cause mastering preview poll to never complete
              if (isRoExDevKey()) {
                await db.update(dialTasks).set({
                  status: 'completed',
                  previewUrl: 'https://dev-dummy.roexaudio.com/mastering-preview.mp3',
                  completedAt: new Date(),
                }).where(eq(dialTasks.id, task.id));
                continue;
              }

              const result = await pollMasterPreview(client, task.roexTaskId);

              if (result.previewUrl) {
                await db.update(dialTasks).set({
                  status: 'completed',
                  previewUrl: result.previewUrl,
                  completedAt: new Date(),
                }).where(and(eq(dialTasks.id, task.id), ne(dialTasks.status, 'failed')));
              } else if (result.status === 'failed') {
                // Race-safe failure write (never clobbers a completed task) + session/
                // previewCount reconcile. Replaces the prior unconditional id-update.
                await markDialTaskFailedWithReconcile(task.id, 'session-poll: RoEx reported failure');
              }
            } else if (task.taskType === 'mastering') {
              // Dev key: auto-complete with dummy URL to allow full flow testing
              if (isRoExDevKey()) {
                await db.update(dialTasks).set({
                  status: 'completed',
                  finalUrl: 'https://dev-dummy.roexaudio.com/mastering-final.wav',
                  completedAt: new Date(),
                }).where(eq(dialTasks.id, task.id));

                await db.update(dialSessions).set({
                  status: 'completed',
                  updatedAt: new Date(),
                }).where(eq(dialSessions.id, sessionId));
                continue;
              }

              // Reserved-but-not-yet-charged row: the mastering POST has not run its single
              // 220cr charge yet — never poll /retrievefinalmaster on it.
              if (isUnchargedMasteringReservation(task)) continue;

              const result = await masterFinal(client, task.roexTaskId, { poll: true });

              if (result.finalUrl) {
                await db.update(dialTasks).set({
                  status: 'completed',
                  finalUrl: result.finalUrl,
                  completedAt: new Date(),
                }).where(and(eq(dialTasks.id, task.id), ne(dialTasks.status, 'failed')));

                // Same as the final branch above: copy + record, both awaited, after the response.
                const finalUrl = result.finalUrl;
                after(() =>
                  persistDeliverableToR2({
                    sourceUrl: finalUrl,
                    sessionId,
                    taskId: task.id,
                    taskType: 'mastering',
                  }).catch((err) => console.error('[session/GET] R2 copy failed:', err)),
                );

                await db.update(dialSessions).set({
                  status: 'completed',
                  updatedAt: new Date(),
                }).where(eq(dialSessions.id, sessionId));
              } else if (result.status === 'failed') {
                // Race-safe failure write (never clobbers a completed task) + session/
                // previewCount reconcile. Replaces the prior unconditional id-update.
                await markDialTaskFailedWithReconcile(task.id, 'session-poll: RoEx reported failure');
              }
            }
          } catch {
            // RoEx poll failed — leave task as processing, retry next poll
          }
        }

        // Re-fetch after updates
        if (processingTasks.length > 0) {
          const updated = await db.query.dialSessions.findFirst({
            where: eq(dialSessions.id, sessionId),
            with: {
              tracks: true,
              tasks: { orderBy: [desc(dialTasks.createdAt)] },
              messages: {
                where: (m, { and, isNotNull, eq: eqFn }) =>
                  and(isNotNull(m.parameterChanges), eqFn(m.role, 'assistant')),
                orderBy: (m, { desc: descFn }) => [descFn(m.createdAt)],
                limit: 1,
              },
            },
          });
          return apiSuccess(updated);
        }
      }

      return apiSuccess(full);
    }

    // List sessions for user (guests can only access single sessions)
    if (auth.isGuest) {
      return apiValidationError('Session ID required for guest access');
    }

    const sessions = await db.query.dialSessions.findMany({
      where: eq(dialSessions.userId, auth.userId!),
      orderBy: [desc(dialSessions.createdAt)],
    });

    return apiSuccess(sessions);
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to fetch sessions');
  }
});

// ─── PATCH: Update session parameters ────────────────────────────────────────

const updateSessionSchema = z.object({
  id: z.string().uuid(),
  musicalStyle: z.string().optional(),
  title: z.string().optional(),
});

export const PATCH = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { id, musicalStyle, title } = parsed.data;

    const session = await verifyDialSessionOwnership(id, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (musicalStyle !== undefined) updateData.musicalStyle = musicalStyle;
    if (title !== undefined) updateData.title = title;

    const [updated] = await db.update(dialSessions)
      .set(updateData)
      .where(eq(dialSessions.id, id))
      .returning();

    return apiSuccess(updated);
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Session update failed');
  }
});
