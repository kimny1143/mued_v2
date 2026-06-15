/**
 * Bounded retry for TRANSIENT RoEx upstream failures.
 *
 * Incident 2026-06-15: a one-off transient RoEx 5xx at preview *submit* surfaced as
 * INFRA_ERROR ("一時的なサーバーエラー") and dead-ended the user — the preview POST has no
 * retry (and no comm-timeout, by design, to avoid re-charging a charged submit; see
 * lib/roex/client.ts). The submit returned non-2xx, the route threw immediately, no task was
 * created, and the user had to manually retry (and didn't). A short auto-retry on transient
 * errors heals the blip transparently.
 *
 * SAFETY: use this ONLY around RoEx submits that DON'T charge (preview = 0cr). Retrying a
 * *charging* submit (final / mastering) could double-spend — those paths use reserve-before-
 * charge guards instead and are intentionally out of scope here.
 */
import { RoExCommTimeoutError } from '@/lib/roex';

// Network-level rejections from fetch (no HTTP status) that are safe to retry.
const TRANSIENT_NETWORK_RE =
  /fetch failed|network|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|terminated|aborted/i;

/**
 * True when `error` is a transient RoEx failure worth retrying: a 5xx / 429 HTTP error, a
 * comm-timeout, or a raw network rejection. A 4xx (bad request / auth / not-found) is NOT
 * transient — retrying it would just fail again, so it returns false and propagates.
 */
export function isTransientRoExError(error: unknown): boolean {
  if (error instanceof RoExCommTimeoutError) return true;
  if (!(error instanceof Error)) return false;
  // RoEx HTTP error shape: "RoEx API <path> failed (<status>): <body>" (lib/roex/client.ts).
  const m = error.message.match(/^RoEx API .* failed \((\d{3})\):/);
  if (m) {
    const status = Number(m[1]);
    return status >= 500 || status === 429;
  }
  // No parseable HTTP status → a raw fetch/network rejection (transient blip). App-side errors
  // (e.g. "No tracks uploaded") are thrown before the RoEx call, so they never reach here.
  return TRANSIENT_NETWORK_RE.test(error.message);
}

export interface RoExRetryOpts {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /** Backoff base in ms; delay before attempt i+1 is baseDelayMs * 2^(i-1) (default 400). */
  baseDelayMs?: number;
  /** Override the retryable classifier (default isTransientRoExError). */
  isRetryable?: (error: unknown) => boolean;
  /** Side-effect hook fired before each retry sleep (e.g. logging). */
  onRetry?: (error: unknown, attempt: number) => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying on transient RoEx errors with exponential backoff. Re-throws the last
 * error once attempts are exhausted, and re-throws a non-retryable (4xx / app) error
 * immediately. Returns `fn`'s result on the first success.
 */
export async function withRoExRetry<T>(fn: () => Promise<T>, opts: RoExRetryOpts = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseDelayMs = opts.baseDelayMs ?? 400;
  const isRetryable = opts.isRetryable ?? isTransientRoExError;

  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i >= attempts || !isRetryable(error)) throw error;
      opts.onRetry?.(error, i);
      await sleep(baseDelayMs * 2 ** (i - 1));
    }
  }
  throw lastError; // unreachable: the final attempt throws inside the loop
}
