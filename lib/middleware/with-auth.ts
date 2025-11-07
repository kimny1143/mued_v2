import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { apiUnauthorized } from '@/lib/api-response';

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
): (request: NextRequest, context: { params: P }) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    context: { params: P }
  ): Promise<NextResponse> => {
    try {
      // Authenticate user with Clerk
      const { userId } = await auth();

      // Check if user is authenticated
      if (!userId) {
        return apiUnauthorized();
      }

      // Call the handler with auth context and params
      return await handler({
        userId,
        request,
        params: context.params,
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
      console.error('[withAdminAuth] Authentication error:', error);
      return apiUnauthorized();
    }
  };
}
