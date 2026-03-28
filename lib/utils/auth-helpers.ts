/**
 * Authentication Helper Functions
 *
 * Shared utilities for API routes to handle Clerk authentication
 * and session ownership verification.
 *
 * Phase 1.3: Extracted from duplicated code in interview API routes
 */

import { db } from '@/db';
import { users, sessions, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/lib/utils/logger';

/**
 * Get internal user UUID from Clerk ID.
 * If the user doesn't exist in DB (webhook missed or DB record deleted),
 * fetches user info from Clerk and creates the record automatically.
 *
 * @param clerkId - Clerk user ID from auth()
 * @returns Internal user UUID
 */
export async function getUserIdFromClerkId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (user) {
    return user.id;
  }

  // Auto-create: fetch from Clerk and insert
  logger.info('[getUserIdFromClerkId] User not in DB, auto-creating', { clerkId });

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? 'unknown';
  const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || 'Unknown';

  const [newUser] = await db.transaction(async (tx) => {
    const created = await tx.insert(users).values({
      clerkId,
      email,
      name,
      profileImageUrl: clerkUser.imageUrl,
      role: 'student',
    }).returning();

    await tx.insert(subscriptions).values({
      userId: created[0].id,
      tier: 'free',
      status: 'active',
    });

    return created;
  });

  logger.info('[getUserIdFromClerkId] User auto-created', { clerkId, internalId: newUser.id, email });
  return newUser.id;
}

/**
 * Verify that a session belongs to a specific user
 *
 * @param sessionId - Session UUID
 * @param userId - Internal user UUID
 * @returns true if session belongs to user, false otherwise
 */
export async function verifySessionOwnership(sessionId: string, userId: string): Promise<boolean> {
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    return false;
  }

  return session.userId === userId;
}
