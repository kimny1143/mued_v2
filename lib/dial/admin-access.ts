/**
 * MUEDial admin read-only access — allow-list + audit.
 *
 * A narrow, dedicated permission (separate from the general Clerk `isAdmin` role):
 * an allow-listed email may VIEW + LISTEN to any user's dial session for support/debugging.
 * It is wired ONLY into read routes via verifyDialSession/TaskReadAccess — write/credit
 * routes are unchanged, so an admin can never modify or trigger a billed operation.
 *
 * fail-closed: if DIAL_ADMIN_EMAILS is unset/empty, the admin path is disabled entirely.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, dialAdminAccessLog } from '@/db/schema';
import { logger } from '@/lib/utils/logger';

export type AdminAccessType = 'view' | 'listen' | 'download' | 'stems' | 'chat';

/** Parse DIAL_ADMIN_EMAILS (comma-separated) → normalized lowercase list. Empty = admin off. */
export function getDialAdminEmails(): string[] {
  return (process.env.DIAL_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** Is this email an allow-listed dial admin? fail-closed on null/empty. */
export function isDialSessionAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = getDialAdminEmails();
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}

/** Resolve a Clerk userId to its email (mirrors GET /api/dial/credits/free-status). */
export async function resolveRequesterEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const [rec] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    return rec?.email ?? null;
  } catch (err) {
    logger.error('[admin-access] email resolution failed', { error: err, userId });
    return null;
  }
}

/**
 * Record an admin read of a non-owned session. Awaited by callers (security-sensitive —
 * the audit entry must be durably written before the read proceeds; serverless can drop
 * un-awaited writes). Never throws — a logging failure must not break the read path.
 */
export async function recordAdminAccess(input: {
  adminUserId: string;
  adminEmail: string;
  targetSessionId: string;
  accessType: AdminAccessType;
}): Promise<void> {
  try {
    await db.insert(dialAdminAccessLog).values({
      adminUserId: input.adminUserId,
      adminEmail: input.adminEmail,
      targetSessionId: input.targetSessionId,
      accessType: input.accessType,
    });
  } catch (err) {
    logger.error('[admin-access] audit log write failed', { error: err, ...input });
  }
}
