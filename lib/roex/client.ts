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
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

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
