import type { RoExConfig } from './types';

const DEFAULT_BASE_URL = 'https://tonn.roexaudio.com';

/**
 * Comm-timeout for RoEx POLL calls. A hung POLL connection would otherwise block the
 * serverless function until Vercel kills it — so the task never gets reconciled. 45s is
 * far above a healthy poll round-trip (RoEx status retrieves return in seconds) and below
 * the routes' maxDuration. This is opt-in per call (`{ timeoutMs }`): POLL/retrieve calls
 * set it; SUBMIT/charge calls do NOT.
 *
 * BILLING SAFETY — RoEx /retrieve* endpoints are IDEMPOTENT per task id: the first
 * retrieve of a given multitrackTaskId / masteringTaskId charges once, every subsequent
 * retrieve returns the cached result for FREE (preview retrieves are always free).
 * [FACT: confirmed in writing by RoEx CEO David Ronan, 2026-03-23.] So a poll retry or a
 * comm-timeout-then-retry on the SAME task id never re-charges. The submit-vs-poll split
 * (no timeout on the initial charge submit) is belt-and-suspenders on top of that.
 */
export const ROEX_POLL_TIMEOUT_MS = 45_000;

export interface RoExRequestOpts {
  /** When set, abort the HTTP call after this many ms (poll calls only — never submits). */
  timeoutMs?: number;
}

/**
 * Thrown when a RoEx HTTP call exceeds its timeoutMs. Callers MUST treat this as TRANSIENT
 * (the async job may still be processing) — keep the task `processing` and let the next
 * poll / cron retry. It is NOT a job failure (that is an explicit `status:'failed'`).
 */
export class RoExCommTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoExCommTimeoutError';
  }
}

export class RoExClient {
  readonly apiKey: string;
  readonly baseUrl: string;

  constructor(config: RoExConfig) {
    if (!config.apiKey) {
      throw new Error('RoEx API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  private async doFetch(url: string, init: RequestInit, path: string, timeoutMs?: number): Promise<Response> {
    if (!timeoutMs) {
      // No comm-timeout (submit/charge calls): a false abort here would risk a re-charge.
      return fetch(url, init);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RoExCommTimeoutError(`RoEx API ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async post<T = unknown>(path: string, body: unknown, opts?: RoExRequestOpts): Promise<T> {
    const url = `${this.baseUrl}${path}?key=${this.apiKey}`;
    const res = await this.doFetch(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      path,
      opts?.timeoutMs,
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RoEx API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T = unknown>(path: string, opts?: RoExRequestOpts): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}key=${this.apiKey}`;
    const res = await this.doFetch(url, { method: 'GET' }, path, opts?.timeoutMs);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RoEx API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }
}

/** Create a RoExClient from environment variables. */
export function createRoExClient(): RoExClient {
  const apiKey = process.env.ROEX_API_KEY;
  if (!apiKey) {
    throw new Error('ROEX_API_KEY environment variable is not set');
  }
  return new RoExClient({ apiKey });
}

/**
 * Check if the current RoEx API key is the dev key.
 *
 * Dev key behavior:
 * - Upload/Preview/Poll all work but return dummy URLs (example.com)
 * - Final mix (/applyaudioeffects) fails because RoEx tries to read dummy track URLs
 * - No credit consumption
 *
 * When true, callers should mock final mix responses for UI testing.
 * On Vercel production, ROEX_DEV_API_KEY should not be set — this always returns false.
 */
/** Build the webhook URL with optional secret token for verification. */
export function getRoExWebhookUrl(): string {
  const base = process.env.ROEX_WEBHOOK_URL || 'https://httpbin.org/post';
  const secret = process.env.ROEX_WEBHOOK_SECRET;
  if (secret && base !== 'https://httpbin.org/post') {
    const url = new URL(base);
    url.searchParams.set('secret', secret);
    return url.toString();
  }
  return base;
}

export function isRoExDevKey(): boolean {
  const devKey = process.env.ROEX_DEV_API_KEY;
  if (!devKey) return false;
  return process.env.ROEX_API_KEY === devKey;
}

/**
 * True when `error` originates from the RoEx upstream (an HTTP non-2xx surfaced by
 * `post`/`get` as `RoEx API <path> failed (<status>): <body>`, or a poll comm-timeout).
 * These carry RoEx's raw operator-facing copy (e.g. "Your credits have been used - please
 * contact support") that must NOT be shown to end users. App-side errors thrown inside our
 * routes (e.g. "Stem URL expired — please re-upload") are intentionally user-facing and
 * actionable, so they return false and are left untouched.
 */
export function isRoExUpstreamError(error: unknown): boolean {
  if (error instanceof RoExCommTimeoutError) return true;
  return error instanceof Error && error.message.startsWith('RoEx API ');
}
