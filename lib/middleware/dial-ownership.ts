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
import {
  resolveRequesterEmail,
  isDialSessionAdmin,
  recordAdminAccess,
  type AdminAccessType,
} from '@/lib/dial/admin-access';

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

// ─── Read-only access (owner OR allow-listed dial admin) ─────────────────────
//
// Used ONLY by read routes (GET session / download / stems / chat). Write & credit
// routes keep verifyDial*Ownership (owner-only) UNCHANGED — so an admin can never
// modify or trigger a billed operation. Every admin read of a non-owned session is
// audited. `viaAdmin` lets the route skip owner-only side-effects (e.g. RoEx polling).

/**
 * Owner OR allow-listed admin may READ this session. Returns { session, viaAdmin }.
 * Non-owner, non-admin → null (same as before for everyone else). Admin reads are logged.
 */
export async function verifyDialSessionReadAccess(
  sessionId: string,
  auth: DialAuthContext,
  accessType: AdminAccessType = 'view',
): Promise<{ session: DialSession; viaAdmin: boolean } | null> {
  const owned = await verifyDialSessionOwnership(sessionId, auth);
  if (owned) return { session: owned, viaAdmin: false };

  // Not owner — fall through to admin read (signed-in + allow-listed email only).
  if (auth.isGuest || !auth.userId) return null;
  const email = await resolveRequesterEmail(auth.userId);
  if (!email || !isDialSessionAdmin(email)) return null;

  const session = await db.query.dialSessions.findFirst({
    where: eq(dialSessions.id, sessionId),
  });
  if (!session) return null;

  recordAdminAccess({
    adminUserId: auth.userId,
    adminEmail: email,
    targetSessionId: session.id,
    accessType,
  });
  return { session, viaAdmin: true };
}

/** Read access through task → session chain (owner OR admin). */
export async function verifyDialTaskReadAccess(
  taskId: string,
  auth: DialAuthContext,
  accessType: AdminAccessType = 'view',
): Promise<{ task: DialTask; session: DialSession; viaAdmin: boolean } | null> {
  const task = await db.query.dialTasks.findFirst({
    where: eq(dialTasks.id, taskId),
  });
  if (!task) return null;

  const access = await verifyDialSessionReadAccess(task.sessionId, auth, accessType);
  if (!access) return null;

  return { task, session: access.session, viaAdmin: access.viaAdmin };
}
