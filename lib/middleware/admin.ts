/**
 * Admin Role Utilities
 *
 * Lightweight helpers for checking admin status via Clerk publicMetadata.
 * Use `isAdmin()` for conditional logic within routes.
 * Use `withAdminAuth()` from with-auth.ts for full route protection.
 *
 * Setup: Clerk Dashboard → Users → Public Metadata → { "role": "admin" }
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Check if the current user has admin role.
 * Returns false if not authenticated or not admin.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { sessionClaims } = await auth();
    if (!sessionClaims) return false;
    const publicMetadata = sessionClaims.metadata as Record<string, unknown> | undefined;
    return publicMetadata?.role === 'admin';
  } catch {
    return false;
  }
}
