/**
 * MUEDial Account Link API
 * POST /api/dial/link-account
 *
 * Links a guest session to a logged-in user account.
 * After a guest creates an account, they can link their existing sessions.
 */

import { z } from 'zod';
import { eq, and, gt } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { db } from '@/db';
import { dialSessions, dialPurchases } from '@/db/schema';

const linkSchema = z.object({
  guestToken: z.string().min(1),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { guestToken } = parsed.data;

    // Find session by guest token (must be valid/not expired)
    const session = await db.query.dialSessions.findFirst({
      where: and(
        eq(dialSessions.guestToken, guestToken),
        gt(dialSessions.guestTokenExpiresAt, new Date()),
      ),
    });

    if (!session) {
      return apiNotFound('Session not found or token expired');
    }

    // Link session and purchases to user account
    await db.transaction(async (tx) => {
      // Update session: set userId, clear guest token
      await tx.update(dialSessions)
        .set({
          userId,
          guestToken: null,
          guestTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(dialSessions.id, session.id));

      // Update purchases for this session
      await tx.update(dialPurchases)
        .set({ userId })
        .where(eq(dialPurchases.sessionId, session.id));
    });

    return apiSuccess({ linked: true, sessionId: session.id });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Account linking failed');
  }
});
