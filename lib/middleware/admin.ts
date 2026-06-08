/**
 * Admin Role Utilities
 *
 * Lightweight helpers for checking admin status via Clerk publicMetadata.
 * Use `isAdmin()` for conditional logic within routes.
 * Use `withAdminAuth()` from with-auth.ts for full route protection.
 *
 * Setup: Clerk Dashboard → Users → Public Metadata → { "role": "admin" }
 *
 * Note: Uses clerkClient().users.getUser(userId) (Clerk Management API) rather than
 * currentUser(), because isAdmin() checks the role of an *arbitrary* userId (passed in),
 * not necessarily the current session user. Callers resolve the session userId via auth()
 * first, then pass it here.
 */

import { clerkClient } from '@clerk/nextjs/server';

/**
 * Check if the given userId has admin role.
 * Fetches publicMetadata directly via Clerk Management API.
 * Returns false if userId is null/undefined, user not found, or not admin.
 */
export async function isAdmin(userId?: string | null): Promise<boolean> {
  try {
    if (!userId) return false;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = user.publicMetadata as Record<string, unknown> | undefined;
    return publicMetadata?.role === 'admin';
  } catch {
    return false;
  }
}
