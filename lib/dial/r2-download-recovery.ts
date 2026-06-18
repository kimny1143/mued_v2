/**
 * R2 download recovery decisions (PR-R2a, 守り #1).
 *
 * The GCS→R2 copy is the durability layer. The R2 worker stores objects with no TTL
 * (workers/dial-r2 `/copy` = put), so an object normally persists and r2ExpiresAt is
 * just the daysRemaining bookkeeping. The download route therefore:
 *   1. tries the R2 URL, and on an R2 miss/non-ok falls back to the GCS URL (→ the
 *      route's existing GCS-expiry recovery re-polls RoEx, a free same-task re-retrieve)
 *      — sealing "completed but download broken" regardless of the R2 object lifecycle;
 *   2. refreshes the r2ExpiresAt bookkeeping when an owner streams a still-live R2
 *      deliverable near expiry, so returning users keep an honest countdown.
 *
 * These pure helpers hold the decisions so they can be unit-tested away from the I/O.
 */

/** R2 bookkeeping window — matches copyToR2's expiry (lib/dial/r2-storage). */
export const R2_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
/** Refresh the bookkeeping when this much (or less) is left, or it's already past. */
export const R2_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** True when `sourceUrl` is the task's R2 URL (i.e. we picked the durable copy). */
export function isR2Source(
  task: { r2FinalUrl: string | null } | null | undefined,
  sourceUrl: string,
): boolean {
  return !!task?.r2FinalUrl && sourceUrl === task.r2FinalUrl;
}

/** True when the r2ExpiresAt bookkeeping should be refreshed on this access. */
export function shouldRefreshR2Bookkeeping(
  r2ExpiresAt: Date | string | null,
  now: Date,
  windowMs: number = R2_REFRESH_WINDOW_MS,
): boolean {
  if (!r2ExpiresAt) return false;
  return new Date(r2ExpiresAt).getTime() - now.getTime() < windowMs;
}
