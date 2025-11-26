import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { apiUnauthorized, apiServerError } from '@/lib/api-response';
import { getUserIdFromClerkId } from '@/lib/utils/auth-helpers';
import { logger } from '@/lib/utils/logger';

/**
 * Authentication context passed to authenticated route handlers
 */
export interface AuthContext {
  /** Clerk user ID */
  userId: string;
  /** Original request object */
  request: NextRequest;
}

/**
 * Type for authenticated route handlers
 */
export type AuthenticatedHandler = (
  context: AuthContext
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async ({ userId, request }) => {
 *   const materials = await getUserMaterials(userId);
 *   return apiSuccess({ materials });
 * });
 * ```
 *
 * @param handler - The authenticated route handler
 * @returns A Next.js route handler with authentication
 */
export function withAuth(
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authenticate user with Clerk
      const { userId } = await auth();

      // Check if user is authenticated
      if (!userId) {
        return apiUnauthorized();
      }

      // Call the handler with auth context
      return await handler({
        userId,
        request,
      });
    } catch (error) {
      console.error('[withAuth] Authentication error:', error);
      return apiUnauthorized();
    }
  };
}

/**
 * Variant for route handlers that need params (e.g., [id] routes)
 *
 * @example
 * ```typescript
 * export const GET = withAuthParams(async ({ userId, request, params }) => {
 *   const material = await getMaterialById(params.id, userId);
 *   return apiSuccess({ material });
 * });
 * ```
 */
export interface AuthContextWithParams<P = Record<string, string>> extends AuthContext {
  /** Route params */
  params: P;
}

export type AuthenticatedHandlerWithParams<P = Record<string, string>> = (
  context: AuthContextWithParams<P>
) => Promise<NextResponse>;

export function withAuthParams<P = Record<string, string>>(
  handler: AuthenticatedHandlerWithParams<P>
): (request: NextRequest, context: { params: Promise<P> }) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    context: { params: Promise<P> }
  ): Promise<NextResponse> => {
    try {
      // Authenticate user with Clerk
      const { userId } = await auth();

      // Check if user is authenticated
      if (!userId) {
        return apiUnauthorized();
      }

      // Await params (Next.js 15 compatibility)
      const resolvedParams = await context.params;

      // Call the handler with auth context and resolved params
      return await handler({
        userId,
        request,
        params: resolvedParams,
      });
    } catch (error) {
      console.error('[withAuthParams] Authentication error:', error);
      return apiUnauthorized();
    }
  };
}

/**
 * Variant for admin-only routes
 *
 * @example
 * ```typescript
 * export const GET = withAdminAuth(async ({ userId, request }) => {
 *   const metrics = await getRagMetrics();
 *   return apiSuccess({ metrics });
 * });
 * ```
 */
export function withAdminAuth(
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authenticate user with Clerk
      const { userId, sessionClaims } = await auth();

      // Check if user is authenticated
      if (!userId) {
        return apiUnauthorized();
      }

      // Check if user has admin role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (sessionClaims as any)?.metadata;
      const isAdmin = metadata?.role === 'admin';

      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      // Call the handler with auth context
      return await handler({
        userId,
        request,
      });
    } catch (error) {
      logger.error('[withAdminAuth] Authentication error:', { error });
      return apiUnauthorized();
    }
  };
}

// ========================================
// Extended Auth with Internal User ID Resolution
// ========================================

/**
 * Extended authentication context with internal database user ID
 */
export interface AuthContextResolved {
  /** Clerk user ID */
  clerkUserId: string;
  /** Internal database user UUID */
  internalUserId: string;
  /** Original request object */
  request: NextRequest;
}

export type AuthenticatedHandlerResolved = (
  context: AuthContextResolved
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers with authentication
 * AND resolves internal database user ID.
 *
 * Use this when you need to query the database with internal user UUID.
 *
 * @example
 * ```typescript
 * export const GET = withAuthResolved(async ({ internalUserId, request }) => {
 *   const questions = await getInterviewQuestions(internalUserId);
 *   return apiSuccess({ questions });
 * });
 * ```
 */
export function withAuthResolved(
  handler: AuthenticatedHandlerResolved
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authenticate user with Clerk
      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) {
        return apiUnauthorized();
      }

      // Resolve internal user ID from database
      let internalUserId: string;
      try {
        internalUserId = await getUserIdFromClerkId(clerkUserId);
      } catch (error) {
        logger.error('[withAuthResolved] Failed to resolve user ID', { error, clerkUserId });
        return apiServerError(new Error('User not found in database'));
      }

      // Call the handler with resolved auth context
      return await handler({
        clerkUserId,
        internalUserId,
        request,
      });
    } catch (error) {
      logger.error('[withAuthResolved] Authentication error:', { error });
      return apiUnauthorized();
    }
  };
}

/**
 * Variant with params support for [id] routes
 */
export interface AuthContextResolvedWithParams<P = Record<string, string>>
  extends AuthContextResolved {
  params: P;
}

export type AuthenticatedHandlerResolvedWithParams<P = Record<string, string>> = (
  context: AuthContextResolvedWithParams<P>
) => Promise<NextResponse>;

export function withAuthResolvedParams<P = Record<string, string>>(
  handler: AuthenticatedHandlerResolvedWithParams<P>
): (request: NextRequest, context: { params: Promise<P> }) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    context: { params: Promise<P> }
  ): Promise<NextResponse> => {
    try {
      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) {
        return apiUnauthorized();
      }

      let internalUserId: string;
      try {
        internalUserId = await getUserIdFromClerkId(clerkUserId);
      } catch (error) {
        logger.error('[withAuthResolvedParams] Failed to resolve user ID', { error, clerkUserId });
        return apiServerError(new Error('User not found in database'));
      }

      const resolvedParams = await context.params;

      return await handler({
        clerkUserId,
        internalUserId,
        request,
        params: resolvedParams,
      });
    } catch (error) {
      logger.error('[withAuthResolvedParams] Authentication error:', { error });
      return apiUnauthorized();
    }
  };
}
