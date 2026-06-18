/**
 * MUEDial R2 Storage Utility
 *
 * Copies deliverable files (final mix, mastered audio) from GCS to R2
 * for stable download URLs with 30-day expiry.
 *
 * Graceful degradation: returns null on failure, caller falls back to GCS URL.
 *
 * Reliability (PR-R1, 守り #1): the GCS→R2 copy is the durability layer — when it
 * fails the task is left with only the ~1h GCS URL ("completed but download breaks
 * soon"). Most copy failures are transient (worker cold-start, 429/5xx, network blip),
 * so we retry those with a short backoff. We do NOT retry timeouts (a slow GCS source
 * would just time out again, and serverless functions await this before responding) or
 * 4xx (client errors won't succeed on retry). Persistent failures still return null —
 * recovery for those (re-copy / 30-day expiry) is handled by the cron sweep in PR-R2.
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const COPY_TIMEOUT_MS = 90_000;
/** Backoff (ms) before retry attempts 2 and 3. Total attempts = length + 1. */
const DEFAULT_BACKOFF_MS = [500, 1500];

/** Whether an HTTP status from the R2 worker is worth retrying (transient). */
export function isRetryableR2Status(status: number): boolean {
  return status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function copyToR2(
  params: {
    sourceUrl: string;
    sessionId: string;
    taskId: string;
    taskType: string;
    originalFilename?: string;
  },
  // Internal seam for tests (shorten/skip backoff). Callers never pass this.
  opts?: { backoffMs?: number[] },
): Promise<{ r2Url: string; expiresAt: Date } | null> {
  const workerUrl = process.env.DIAL_R2_WORKER_URL?.trim();
  const secret = process.env.DIAL_R2_SECRET?.trim();

  if (!workerUrl || !secret) {
    console.error('[r2-storage] Missing DIAL_R2_WORKER_URL or DIAL_R2_SECRET env vars');
    return null;
  }

  const key = params.originalFilename
    ? `sessions/${params.sessionId}/${params.originalFilename}`
    : `sessions/${params.sessionId}/${params.taskType}_${params.taskId}.wav`;

  const backoff = opts?.backoffMs ?? DEFAULT_BACKOFF_MS;
  const maxAttempts = backoff.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COPY_TIMEOUT_MS);
    try {
      const res = await fetch(`${workerUrl}/copy`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-R2-Secret': secret,
        },
        body: JSON.stringify({ sourceUrl: params.sourceUrl, key }),
      });

      if (res.ok) {
        return { r2Url: `${workerUrl}/download/${key}`, expiresAt: new Date(Date.now() + THIRTY_DAYS_MS) };
      }

      const text = await res.text().catch(() => 'unknown');
      const retryable = isRetryableR2Status(res.status);
      console.error(`[r2-storage] Copy failed (attempt ${attempt}/${maxAttempts}): ${res.status} ${text}`);
      // 4xx (client error) → won't succeed on retry; exhausted → give up.
      if (!retryable || attempt === maxAttempts) return null;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      console.error(
        `[r2-storage] Copy request failed (attempt ${attempt}/${maxAttempts})${isTimeout ? ` — timed out after ${COPY_TIMEOUT_MS / 1000}s` : ''}:`,
        error,
      );
      // Timeout = slow GCS source; retrying just times out again. Exhausted → give up.
      if (isTimeout || attempt === maxAttempts) return null;
    } finally {
      clearTimeout(timer);
    }

    // Transient failure with attempts remaining → short backoff, then retry.
    await sleep(backoff[attempt - 1] ?? 1500);
  }

  return null;
}
