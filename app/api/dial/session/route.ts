/**
 * MUEDial Session API
 * POST  /api/dial/session     — Create new session (guest or logged-in)
 * GET   /api/dial/session     — List/get sessions
 * PATCH /api/dial/session     — Update session parameters (musicalStyle, title)
 */

import { randomBytes } from 'crypto';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { createRoExClient, isRoExDevKey, pollMixPreview, pollMixFinal, pollMasterPreview, masterFinal } from '@/lib/roex';
import { copyToR2 } from '@/lib/dial/r2-storage';
import { db } from '@/db';
import { dialSessions, dialTasks, dialTracks } from '@/db/schema';

// ─── POST: Create session ───────────────────────────────────────────────────

const createSessionSchema = z.object({
  mode: z.enum(['omakase', 'dialogue']),
  musicalStyle: z.string(),
  title: z.string().optional(),
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

    const [session] = await db.insert(dialSessions).values({
      userId: userId ?? undefined,
      mode: parsed.data.mode,
      musicalStyle: parsed.data.musicalStyle,
      title: parsed.data.title,
      guestToken,
      guestTokenExpiresAt,
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
      // Single session with ownership check
      const session = await verifyDialSessionOwnership(sessionId, auth);
      if (!session) {
        return apiNotFound('Session not found');
      }

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

      // Poll RoEx for any processing tasks and update DB
      if (full?.tasks) {
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

              if (result.previewUrl || result.status === 'completed') {
                await db.update(dialTasks).set({
                  status: 'completed',
                  previewUrl: result.previewUrl,
                  completedAt: new Date(),
                }).where(eq(dialTasks.id, task.id));

                await db.update(dialSessions).set({
                  status: 'uploading',
                  updatedAt: new Date(),
                }).where(eq(dialSessions.id, sessionId));
              } else if (result.status === 'failed') {
                await db.update(dialTasks).set({
                  status: 'failed',
                }).where(eq(dialTasks.id, task.id));
              }
            } else if (task.taskType === 'final_basic' || task.taskType === 'final_advanced' || task.taskType === 'mix_check') {
              // Dev key: dummy track URLs cause /retrievefinalmix to fail — skip polling
              if (isRoExDevKey()) continue;

              const tracks = await db.query.dialTracks.findMany({
                where: eq(dialTracks.sessionId, sessionId),
              });
              const trackUrls = tracks.map((t) => t.roexUploadUrl);

              const result = await pollMixFinal(client, task.roexTaskId, trackUrls);

              if (result.finalUrl || result.status === 'completed') {
                await db.update(dialTasks).set({
                  status: 'completed',
                  finalUrl: result.finalUrl,
                  stemsUrls: result.stemsUrl ?? null,
                  completedAt: new Date(),
                }).where(eq(dialTasks.id, task.id));

                // Fire-and-forget: copy deliverable to R2 for stable download URL
                if (result.finalUrl) {
                  copyToR2({
                    sourceUrl: result.finalUrl,
                    sessionId: sessionId,
                    taskId: task.id,
                    taskType: task.taskType,
                  }).then((r2Result) => {
                    if (r2Result) {
                      db.update(dialTasks).set({
                        r2FinalUrl: r2Result.r2Url,
                        r2ExpiresAt: r2Result.expiresAt,
                      }).where(eq(dialTasks.id, task.id));
                    }
                  }).catch(() => {});
                }

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
                }).where(eq(dialSessions.id, sessionId));
              } else if (result.status === 'failed') {
                await db.update(dialTasks).set({
                  status: 'failed',
                }).where(eq(dialTasks.id, task.id));
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

              if (result.previewUrl || result.status === 'completed') {
                await db.update(dialTasks).set({
                  status: 'completed',
                  previewUrl: result.previewUrl,
                  completedAt: new Date(),
                }).where(eq(dialTasks.id, task.id));
              } else if (result.status === 'failed') {
                await db.update(dialTasks).set({
                  status: 'failed',
                }).where(eq(dialTasks.id, task.id));
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

              const result = await masterFinal(client, task.roexTaskId);

              if (result.finalUrl || result.status === 'completed') {
                await db.update(dialTasks).set({
                  status: 'completed',
                  finalUrl: result.finalUrl,
                  completedAt: new Date(),
                }).where(eq(dialTasks.id, task.id));

                // Fire-and-forget: copy deliverable to R2 for stable download URL
                if (result.finalUrl) {
                  copyToR2({
                    sourceUrl: result.finalUrl,
                    sessionId: sessionId,
                    taskId: task.id,
                    taskType: 'mastering',
                  }).then((r2Result) => {
                    if (r2Result) {
                      db.update(dialTasks).set({
                        r2FinalUrl: r2Result.r2Url,
                        r2ExpiresAt: r2Result.expiresAt,
                      }).where(eq(dialTasks.id, task.id));
                    }
                  }).catch(() => {});
                }

                await db.update(dialSessions).set({
                  status: 'completed',
                  updatedAt: new Date(),
                }).where(eq(dialSessions.id, sessionId));
              } else if (result.status === 'failed') {
                await db.update(dialTasks).set({
                  status: 'failed',
                }).where(eq(dialTasks.id, task.id));
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
