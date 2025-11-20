/**
 * Authentication Helper Functions
 *
 * Shared utilities for API routes to handle Clerk authentication
 * and session ownership verification.
 *
 * Phase 1.3: Extracted from duplicated code in interview API routes
 */

import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get internal user UUID from Clerk ID
 *
 * @param clerkId - Clerk user ID from auth()
 * @returns Internal user UUID
 * @throws Error if user not found (webhook not configured)
 */
export async function getUserIdFromClerkId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error(
      `User ${clerkId} not found in database. Please ensure Clerk webhooks are properly configured.`
    );
  }

  return user.id;
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
