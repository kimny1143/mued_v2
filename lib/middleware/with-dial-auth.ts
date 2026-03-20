/**
 * MUEDial Authentication Middleware
 *
 * Supports both Clerk-authenticated users and guest access via X-Dial-Guest-Token.
 * Guest tokens are validated against dial_sessions table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { resolveClerkUserId } from './with-auth';
import { apiUnauthorized } from '@/lib/api-response';
import { db } from '@/db';
import { dialSessions } from '@/db/schema';
import { logger } from '@/lib/utils/logger';

export interface DialAuthContext {
  /** Clerk user ID (null for guests) */
  userId: string | null;
  /** Guest token (null for logged-in users) */
  guestToken: string | null;
  /** Whether this is a guest session */
  isGuest: boolean;
  /** Original request */
  request: NextRequest;
}

export type DialAuthenticatedHandler = (
  context: DialAuthContext
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers with MUEDial authentication.
 * Supports both Clerk auth and guest token (X-Dial-Guest-Token header).
 */
export function withDialAuth(
  handler: DialAuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Try Clerk auth (Bearer JWT or cookie)
      const clerkUserId = await resolveClerkUserId(request).catch(() => null);

      if (clerkUserId) {
        return await handler({
          userId: clerkUserId,
          guestToken: null,
          isGuest: false,
          request,
        });
      }

      // 2. Try guest token from header or query parameter
      // Query param fallback needed for browser link clicks (e.g. download links)
      // where custom headers cannot be sent
      const guestToken = request.headers.get('X-Dial-Guest-Token')
        || new URL(request.url).searchParams.get('token');
      if (guestToken) {
        // Validate token against DB
        const session = await db.query.dialSessions.findFirst({
          where: and(
            eq(dialSessions.guestToken, guestToken),
            gt(dialSessions.guestTokenExpiresAt, new Date()),
          ),
        });

        if (session) {
          return await handler({
            userId: null,
            guestToken,
            isGuest: true,
            request,
          });
        }

        logger.warn('[withDialAuth] Invalid or expired guest token');
      }

      // 3. Neither — unauthorized
      return apiUnauthorized('Authentication required');
    } catch (error) {
      logger.error('[withDialAuth] Authentication error:', { error });
      return apiUnauthorized();
    }
  };
}
