/**
 * MUEDial Ownership Verification
 *
 * Verifies that the authenticated user (or guest) owns the requested resource.
 * Supports both Clerk-authenticated users and guest token access.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dialSessions, dialTasks } from '@/db/schema';
import type { DialAuthContext } from './with-dial-auth';

type DialSession = typeof dialSessions.$inferSelect;
type DialTask = typeof dialTasks.$inferSelect;

/**
 * Verify that the authenticated user/guest owns the given session.
 * Returns the session if authorized, null otherwise.
 */
export async function verifyDialSessionOwnership(
  sessionId: string,
  auth: DialAuthContext,
): Promise<DialSession | null> {
  const session = await db.query.dialSessions.findFirst({
    where: eq(dialSessions.id, sessionId),
  });

  if (!session) return null;

  if (auth.isGuest) {
    // Guest: token must match
    return session.guestToken === auth.guestToken ? session : null;
  }

  // Logged-in user: userId must match
  return session.userId === auth.userId ? session : null;
}

/**
 * Verify ownership through task → session chain.
 * Returns { task, session } if authorized, null otherwise.
 */
export async function verifyDialTaskOwnership(
  taskId: string,
  auth: DialAuthContext,
): Promise<{ task: DialTask; session: DialSession } | null> {
  const task = await db.query.dialTasks.findFirst({
    where: eq(dialTasks.id, taskId),
  });

  if (!task) return null;

  const session = await verifyDialSessionOwnership(task.sessionId, auth);
  if (!session) return null;

  return { task, session };
}
