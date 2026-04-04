/**
 * RoEx Client Unit Tests
 *
 * Tests client construction, webhook URL building, and dev key detection.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { RoExClient, createRoExClient, getRoExWebhookUrl, isRoExDevKey } from '@/lib/roex/client';

// ========================================
// Tests
// ========================================

describe('RoExClient', () => {
  it('creates client with API key', () => {
    const client = new RoExClient({ apiKey: 'test-key-123' });
    expect(client.apiKey).toBe('test-key-123');
    expect(client.baseUrl).toBe('https://tonn.roexaudio.com');
  });

  it('allows custom base URL', () => {
    const client = new RoExClient({ apiKey: 'key', baseUrl: 'https://custom.api.com' });
    expect(client.baseUrl).toBe('https://custom.api.com');
  });

  it('throws on empty API key', () => {
    expect(() => new RoExClient({ apiKey: '' })).toThrow('RoEx API key is required');
  });

  it('post includes API key in URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'ok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new RoExClient({ apiKey: 'my-key' });
    await client.post('/test', { data: true });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://tonn.roexaudio.com/test?key=my-key',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"data":true}',
      })
    );

    vi.unstubAllGlobals();
  });

  it('post throws on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new RoExClient({ apiKey: 'key' });
    await expect(client.post('/fail', {})).rejects.toThrow('RoEx API /fail failed (500)');

    vi.unstubAllGlobals();
  });

  it('get includes API key in URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new RoExClient({ apiKey: 'get-key' });
    await client.get('/status');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://tonn.roexaudio.com/status?key=get-key'
    );

    vi.unstubAllGlobals();
  });

  it('get appends key with & when URL already has query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new RoExClient({ apiKey: 'get-key' });
    await client.get('/status?filter=active');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://tonn.roexaudio.com/status?filter=active&key=get-key'
    );

    vi.unstubAllGlobals();
  });
});

describe('createRoExClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates client from ROEX_API_KEY env var', () => {
    process.env.ROEX_API_KEY = 'env-key-123';
    const client = createRoExClient();
    expect(client.apiKey).toBe('env-key-123');
  });

  it('throws when ROEX_API_KEY is not set', () => {
    delete process.env.ROEX_API_KEY;
    expect(() => createRoExClient()).toThrow('ROEX_API_KEY environment variable is not set');
  });
});

describe('getRoExWebhookUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns httpbin fallback when no env var set', () => {
    delete process.env.ROEX_WEBHOOK_URL;
    delete process.env.ROEX_WEBHOOK_SECRET;
    expect(getRoExWebhookUrl()).toBe('https://httpbin.org/post');
  });

  it('returns ROEX_WEBHOOK_URL when set', () => {
    process.env.ROEX_WEBHOOK_URL = 'https://mued.jp/api/webhooks/roex';
    delete process.env.ROEX_WEBHOOK_SECRET;
    expect(getRoExWebhookUrl()).toBe('https://mued.jp/api/webhooks/roex');
  });

  it('appends secret as query param when both are set', () => {
    process.env.ROEX_WEBHOOK_URL = 'https://mued.jp/api/webhooks/roex';
    process.env.ROEX_WEBHOOK_SECRET = 'my-secret-123';

    const url = getRoExWebhookUrl();
    expect(url).toContain('secret=my-secret-123');
    expect(url).toMatch(/^https:\/\/mued\.jp\/api\/webhooks\/roex/);
  });

  it('does not append secret when URL is httpbin', () => {
    process.env.ROEX_WEBHOOK_URL = 'https://httpbin.org/post';
    process.env.ROEX_WEBHOOK_SECRET = 'secret';
    expect(getRoExWebhookUrl()).toBe('https://httpbin.org/post');
  });
});

describe('isRoExDevKey', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns false when ROEX_DEV_API_KEY is not set', () => {
    delete process.env.ROEX_DEV_API_KEY;
    process.env.ROEX_API_KEY = 'prod-key';
    expect(isRoExDevKey()).toBe(false);
  });

  it('returns true when API key matches dev key', () => {
    process.env.ROEX_DEV_API_KEY = 'dev-key-123';
    process.env.ROEX_API_KEY = 'dev-key-123';
    expect(isRoExDevKey()).toBe(true);
  });

  it('returns false when API key does not match dev key', () => {
    process.env.ROEX_DEV_API_KEY = 'dev-key-123';
    process.env.ROEX_API_KEY = 'prod-key-456';
    expect(isRoExDevKey()).toBe(false);
  });
});
