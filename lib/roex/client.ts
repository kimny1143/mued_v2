import type { RoExConfig } from './types';

const DEFAULT_BASE_URL = 'https://tonn.roexaudio.com';

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

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RoEx API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}key=${this.apiKey}`;
    const res = await fetch(url);

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
