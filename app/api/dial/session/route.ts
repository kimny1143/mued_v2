/**
 * MUEDial Session API
 * POST /api/dial/session     — Create new session
 * GET  /api/dial/session      — List user's sessions / get single session
 */

import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { db } from '@/db';
import { dialSessions, dialTracks, dialTasks } from '@/db/schema';

// ─── POST: Create session ───────────────────────────────────────────────────

const createSessionSchema = z.object({
  mode: z.enum(['omakase', 'dialogue']),
  musicalStyle: z.string(),
  title: z.string().optional(),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const [session] = await db.insert(dialSessions).values({
      userId,
      mode: parsed.data.mode,
      musicalStyle: parsed.data.musicalStyle,
      title: parsed.data.title,
    }).returning();

    return apiSuccess(session);
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Session creation failed');
  }
});

// ─── GET: List sessions or get single ───────────────────────────────────────

export const GET = withAuth(async ({ userId, request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (sessionId) {
      // Single session with tracks and tasks
      const session = await db.query.dialSessions.findFirst({
        where: eq(dialSessions.id, sessionId),
        with: {
          tracks: true,
          tasks: {
            orderBy: [desc(dialTasks.createdAt)],
          },
        },
      });

      if (!session || session.userId !== userId) {
        return apiServerError('Session not found');
      }

      return apiSuccess(session);
    }

    // List all sessions for user
    const sessions = await db.query.dialSessions.findMany({
      where: eq(dialSessions.userId, userId),
      orderBy: [desc(dialSessions.createdAt)],
    });

    return apiSuccess(sessions);
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to fetch sessions');
  }
});
