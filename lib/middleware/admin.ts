/**
 * Admin Role Utilities
 *
 * Lightweight helpers for checking admin status via Clerk publicMetadata.
 * Use `isAdmin()` for conditional logic within routes.
 * Use `withAdminAuth()` from with-auth.ts for full route protection.
 *
 * Setup: Clerk Dashboard → Users → Public Metadata → { "role": "admin" }
 */

import { currentUser } from '@clerk/nextjs/server';

/**
 * Check if the current user has admin role.
 * Uses currentUser() (direct Clerk API call) instead of auth() sessionClaims
 * to avoid JWT cache issues where publicMetadata may not be present in the JWT.
 * Returns false if not authenticated or not admin.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await currentUser();
    if (!user) return false;
    const publicMetadata = user.publicMetadata as Record<string, unknown> | undefined;
    return publicMetadata?.role === 'admin';
  } catch {
    return false;
  }
}
