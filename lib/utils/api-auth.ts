/**
 * API Authentication Helper
 *
 * Centralized authentication logic for API routes
 * Eliminates code duplication across 10+ API endpoints
 *
 * Phase 1.3 Code Quality: Issue 4 Resolution
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { getUserIdFromClerkId } from '@/lib/utils/auth-helpers';

// ========================================
// Types
// ========================================

/**
 * Authenticated request data
 * Contains both Clerk user ID and internal database user ID
 */
export interface AuthenticatedRequest {
  clerkUserId: string;
  internalUserId: string;
}

// ========================================
// Authentication Helpers
// ========================================

/**
 * Authenticate API request and get user IDs
 *
 * @param routeName - Name of the route for logging (e.g., "POST /api/interview/questions")
 * @returns AuthenticatedRequest if successful, NextResponse with 401/500 if failed
 *
 * @example
 * ```typescript
 * const authResult = await authenticateApiRequest('POST /api/interview/questions');
 *
 * if (!isAuthenticated(authResult)) {
 *   return authResult; // Return 401 or 500 response
 * }
 *
 * const { internalUserId } = authResult;
 * // Continue with authenticated logic...
 * ```
 */
export async function authenticateApiRequest(
  routeName: string
): Promise<AuthenticatedRequest | NextResponse> {
  const session = await auth();

  if (!session?.userId) {
    logger.warn(`[${routeName}] Unauthorized request`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const internalUserId = await getUserIdFromClerkId(session.userId);

    return {
      clerkUserId: session.userId,
      internalUserId,
    };
  } catch (error) {
    logger.error(`[${routeName}] Failed to resolve user ID`, { error });
    return NextResponse.json(
      { error: 'User authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Type guard to check if authentication succeeded
 *
 * @param result - Result from authenticateApiRequest
 * @returns true if authentication succeeded, false if it's an error response
 *
 * @example
 * ```typescript
 * const authResult = await authenticateApiRequest('POST /api/example');
 *
 * if (!isAuthenticated(authResult)) {
 *   return authResult; // Early return with error response
 * }
 *
 * // TypeScript now knows authResult is AuthenticatedRequest
 * const { internalUserId } = authResult;
 * ```
 */
export function isAuthenticated(
  result: AuthenticatedRequest | NextResponse
): result is AuthenticatedRequest {
  return !(result instanceof NextResponse);
}
