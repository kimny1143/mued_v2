import type { NextResponse } from 'next/server';
import { isRoExUpstreamError } from '@/lib/roex';
import { apiError, type ApiErrorResponse } from '@/lib/api-response';

/**
 * Sanitize a caught error before it reaches the user on a dial generation route.
 *
 * RoEx upstream failures surface through our client as `RoEx API <path> failed (<status>):
 * <body>`, where the body is RoEx's RAW operator-facing copy — e.g.
 *   "Service completed but did not return results. Your credits have been used - please
 *    contact support."  /  info: "Missing download URL from service"
 * Leaking that to an end user is misleading: "Your credits have been used" refers to RoEx's
 * *account* credits (our pool), not the user's, yet it reads as if the user was charged and
 * must email support. (Reported by a free-campaign user, session fd7ef7a2, 2026-06-12.)
 *
 * When the error is a RoEx upstream error, log the raw detail server-side (for debugging)
 * and return a generic `INFRA_ERROR` response. The dial UI localizes `INFRA_ERROR` via
 * `t.dial.session.errorInfra` / `errorInfraHint` ("Temporary server error / please wait a
 * moment and try again…"), so the user gets a friendly, retryable, i18n-correct message.
 *
 * Returns `null` for app-side errors (e.g. "Stem URL expired — please re-upload your
 * stems"), which are intentionally user-facing and actionable. Callers fall through to
 * their existing `apiServerError(error.message)` handling so those messages are preserved.
 *
 * NOTE: this only sanitizes the *message*. It does not alter billing/cycle behaviour — a
 * failed paid-final still keeps its reserved cycle (reserve-before-charge, see
 * `app/api/dial/final/route.ts`); cycle restoration is a separate, deliberate flow.
 */
export function sanitizeUpstreamRoExError(
  error: unknown,
  logTag: string,
): NextResponse<ApiErrorResponse> | null {
  if (!isRoExUpstreamError(error)) return null;
  console.error(`${logTag} RoEx upstream error:`, error instanceof Error ? error.message : error);
  return apiError('Generation temporarily failed. Please try again.', {
    code: 'INFRA_ERROR',
    status: 503,
  });
}
