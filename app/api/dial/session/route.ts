/**
 * MUEDial Session API
 * POST /api/dial/session     — Create new session (guest or logged-in)
 * GET  /api/dial/session      — List/get sessions
 */

import { randomBytes } from 'crypto';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { db } from '@/db';
import { dialSessions, dialTasks } from '@/db/schema';

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

      // Load with tracks and tasks
      const full = await db.query.dialSessions.findFirst({
        where: eq(dialSessions.id, sessionId),
        with: {
          tracks: true,
          tasks: {
            orderBy: [desc(dialTasks.createdAt)],
          },
        },
      });

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
