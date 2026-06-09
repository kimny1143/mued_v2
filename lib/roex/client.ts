import type { RoExConfig } from './types';

const DEFAULT_BASE_URL = 'https://tonn.roexaudio.com';

/**
 * Per-HTTP-call timeout for RoEx requests. RoEx submit/poll endpoints return in
 * seconds (the 8–34 min job processing time is consumed across REPEATED polls), so 45s
 * is well above any healthy round-trip yet far below the routes' maxDuration (≤300s).
 * Without this, a hung TCP connection blocks the serverless function until Vercel kills
 * it — so the task never gets reconciled. This is the PRIMARY hang protection.
 */
const ROEX_HTTP_TIMEOUT_MS = 45_000;

/**
 * Thrown when a RoEx HTTP call exceeds ROEX_HTTP_TIMEOUT_MS. Callers MUST treat this as
 * TRANSIENT (the async job may still be processing) — keep the task `processing` and let
 * the next poll / cron retry. It is NOT a job failure (that is an explicit `status:'failed'`).
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

  private async fetchWithTimeout(url: string, init: RequestInit, path: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ROEX_HTTP_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RoExCommTimeoutError(`RoEx API ${path} timed out after ${ROEX_HTTP_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}?key=${this.apiKey}`;
    const res = await this.fetchWithTimeout(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      path,
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RoEx API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}key=${this.apiKey}`;
    const res = await this.fetchWithTimeout(url, { method: 'GET' }, path);

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
