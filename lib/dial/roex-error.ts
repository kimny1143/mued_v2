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
function infraError(message: string): NextResponse<ApiErrorResponse> {
  return apiError(message, { code: 'INFRA_ERROR', status: 503 });
}

export function sanitizeUpstreamRoExError(
  error: unknown,
  logTag: string,
): NextResponse<ApiErrorResponse> | null {
  if (!isRoExUpstreamError(error)) return null;
  console.error(`${logTag} RoEx upstream error:`, error instanceof Error ? error.message : error);
  return infraError('Generation temporarily failed. Please try again.');
}

/**
 * Upload-route counterpart of {@link sanitizeUpstreamRoExError}.
 *
 * The upload / presign routes call RoEx `/upload` and PUT to the returned GCS signed URL, so
 * besides the generic `RoEx API …` HTTP errors they can throw two upload-specific upstream
 * failures that do NOT carry the `RoEx API ` prefix (from `lib/roex/upload.ts`):
 *   - "RoEx /upload did not return expected URLs"   (RoEx 2xx but missing signedUrl/readableUrl)
 *   - "Upload to signed URL failed (<status>)"      (GCS PUT non-2xx)
 * Both are infrastructure failures the user can't act on, so they get the same friendly
 * `INFRA_ERROR`. We match these by their exact thrown prefixes rather than broadening
 * `isRoExUpstreamError` to a bare `RoEx ` prefix, which would risk sanitizing future
 * intentional user-facing copy (keeping the generation-route matcher narrow).
 *
 * App-side actionable errors on these routes (missing fields, payment required, track lock)
 * are returned BEFORE the try/catch, so they never reach here — only upstream/unexpected
 * throws do. Returns `null` for anything non-upstream so callers preserve their fallback.
 */
export function sanitizeUploadError(
  error: unknown,
  logTag: string,
): NextResponse<ApiErrorResponse> | null {
  const isUploadUpstream =
    isRoExUpstreamError(error) ||
    (error instanceof Error &&
      (error.message.startsWith('RoEx /upload ') ||
        error.message.startsWith('Upload to signed URL failed')));
  if (!isUploadUpstream) return null;
  console.error(`${logTag} upstream upload error:`, error instanceof Error ? error.message : error);
  return infraError('Upload temporarily failed. Please try again.');
}
