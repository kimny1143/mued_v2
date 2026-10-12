/**
 * One gate for every Resend GET the funnel collector makes.
 *
 * Why: the collector fired its reads concurrently (the welcome-mail paging had no delay at all), and
 * Resend answers 429 once the account passes its per-second limit. On 2026-10-09 the daily run and its
 * rerun three hours later both died on `audience … list 429` (the day a broadcast went out), so the
 * data branch was not published. The limit is per account, not per script: anything else calling Resend
 * at the same moment (a broadcast being sent, a person reading its status) counts against it too. So
 * spacing our own calls is not enough — a 429 must also be waited out and retried.
 *
 * What it guarantees:
 *  - requests go out one at a time, at least `minIntervalMs` apart, no matter how many callers await
 *    it concurrently;
 *  - a 429 is retried up to `maxRetries` times, waiting `retry-after` seconds when Resend sends it
 *    (capped at `maxWaitMs`), otherwise 1s, 2s, 4s…;
 *  - when the retries run out the 429 response is RETURNED, not swallowed — callers keep their own
 *    `if (!r.ok) throw`, so a number is never built from a failed read.
 */
export interface PacedGetOptions {
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  minIntervalMs?: number;
  maxRetries?: number;
  maxWaitMs?: number;
  onRetry?: (info: { url: string; attempt: number; waitMs: number }) => void;
}

export type PacedGet = (url: string, init?: RequestInit) => Promise<Response>;

export function retryWaitMs(retryAfter: string | null, attempt: number, maxWaitMs: number): number {
  const seconds = retryAfter === null ? NaN : Number(retryAfter);
  const wanted = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 1000 * 2 ** attempt;
  return Math.min(Math.max(wanted, 0), maxWaitMs);
}

export function createPacedGet(options: PacedGetOptions = {}): PacedGet {
  const fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? (() => Date.now());
  const minIntervalMs = options.minIntervalMs ?? 250;
  const maxRetries = options.maxRetries ?? 4;
  const maxWaitMs = options.maxWaitMs ?? 10_000;

  let lastStart = -Infinity;
  let tail: Promise<unknown> = Promise.resolve();

  async function one(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const gap = lastStart + minIntervalMs - now();
      if (gap > 0) await sleep(gap);
      lastStart = now();
      const response = await fetchImpl(url, init);
      if (response.status !== 429 || attempt >= maxRetries) return response;
      const waitMs = retryWaitMs(response.headers.get("retry-after"), attempt, maxWaitMs);
      options.onRetry?.({ url, attempt: attempt + 1, waitMs });
      await sleep(waitMs);
    }
  }

  return (url, init) => {
    // Chain on the previous request whether it resolved or threw: one failed read must not stall the rest.
    const run = tail.then(() => one(url, init), () => one(url, init));
    tail = run.catch(() => undefined);
    return run;
  };
}
