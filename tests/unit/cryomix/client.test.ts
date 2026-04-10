import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CryoMixClient, createCryoMixClient } from '@/lib/cryomix/client';

// ─── Helper ─────────────────────────────────────────────────────────────────

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

function cryoResponse<T>(data: T) {
  return { data, message: 'Api success', status: 'success', code: 200 };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CryoMixClient', () => {
  const originalFetch = globalThis.fetch;
  let client: CryoMixClient;

  beforeEach(() => {
    client = new CryoMixClient({ apiKey: 'test-api-key' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ─── Constructor ────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('throws if apiKey is empty', () => {
      expect(() => new CryoMixClient({ apiKey: '' })).toThrow('API key is required');
    });

    it('uses default base URL', () => {
      expect(client.baseUrl).toBe('https://platform.cryo-mix.com');
    });

    it('accepts custom base URL', () => {
      const custom = new CryoMixClient({ apiKey: 'k', baseUrl: 'https://test.example.com' });
      expect(custom.baseUrl).toBe('https://test.example.com');
    });
  });

  // ─── Session ID ─────────────────────────────────────────────────────────

  describe('sessionId', () => {
    it('starts as null', () => {
      expect(client.getSessionId()).toBeNull();
    });

    it('can be set manually', () => {
      client.setSessionId('my-session');
      expect(client.getSessionId()).toBe('my-session');
    });
  });

  // ─── Headers ────────────────────────────────────────────────────────────

  describe('request headers', () => {
    it('sends required headers on every request', async () => {
      const fetchMock = mockFetch(cryoResponse({ status: 'pending', percentage_complete: 0 }));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-123');

      await client.pollProgress();

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toMatchObject({
        'X-Api-Key': 'test-api-key',
        'Source': 'Mastering API',
        'Session-Id': 'sess-123',
      });
    });

    it('auto-generates Session-Id for upload (first request)', async () => {
      const fetchMock = mockFetch(cryoResponse({
        upload_folder_name: 'folder-1',
        upload_object_names: { 'test.wav': 'https://signed.url/test.wav' },
      }));
      globalThis.fetch = fetchMock;

      await client.upload({ objectNames: ['test.wav'], contentType: 'audio/wav' });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['Session-Id']).toBeDefined();
      expect(typeof init.headers['Session-Id']).toBe('string');
      expect(init.headers['Session-Id'].length).toBeGreaterThan(0);
    });

    it('sends Origin header when configured', async () => {
      const clientWithOrigin = new CryoMixClient({ apiKey: 'test-api-key', origin: 'mued.jp' });
      const fetchMock = mockFetch(cryoResponse({
        upload_folder_name: 'folder-1',
        upload_object_names: { 'test.wav': 'https://signed.url/test.wav' },
      }));
      globalThis.fetch = fetchMock;

      await clientWithOrigin.upload({ objectNames: ['test.wav'], contentType: 'audio/wav' });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['Origin']).toBe('mued.jp');
    });
  });

  // ─── Upload ─────────────────────────────────────────────────────────────

  describe('upload', () => {
    it('calls multi-upload endpoint with auto-generated sessionId', async () => {
      const fetchMock = mockFetch(cryoResponse({
        upload_folder_name: 'server-folder-abc',
        upload_object_names: { 'track.wav': 'https://storage.googleapis.com/signed/track.wav' },
      }));
      globalThis.fetch = fetchMock;

      const res = await client.upload({ objectNames: ['track.wav'], contentType: 'audio/wav' });

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe('https://platform.cryo-mix.com/api/signed-url/multi-upload');
      expect(res.data.upload_folder_name).toBe('server-folder-abc');
      // Session-Id is auto-generated, NOT the upload_folder_name
      const sessionId = client.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId).not.toBe('server-folder-abc');
    });

    it('includes expirationSeconds when provided', async () => {
      const fetchMock = mockFetch(cryoResponse({
        upload_folder_name: 's1',
        upload_object_names: {},
      }));
      globalThis.fetch = fetchMock;

      await client.upload({ objectNames: ['a.wav'], contentType: 'audio/wav', expirationSeconds: 3600 });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.expiration_seconds).toBe(3600);
    });
  });

  // ─── Upload to Signed URL ─────────────────────────────────────────────

  describe('uploadToSignedUrl', () => {
    it('PUTs file content with correct content type', async () => {
      const fetchMock = mockFetch(null, 200);
      globalThis.fetch = fetchMock;
      const buffer = new ArrayBuffer(1024);

      await client.uploadToSignedUrl('https://signed.url/file', buffer, 'audio/wav');

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://signed.url/file');
      expect(init.method).toBe('PUT');
      expect(init.headers['Content-Type']).toBe('audio/wav');
      expect(init.headers['x-goog-content-length-range']).toBe('0,262144000');
    });

    it('throws on non-ok response', async () => {
      globalThis.fetch = mockFetch(null, 403);

      await expect(
        client.uploadToSignedUrl('https://signed.url/file', new ArrayBuffer(0), 'audio/wav'),
      ).rejects.toThrow('upload PUT failed (403)');
    });
  });

  // ─── Run Mastering ────────────────────────────────────────────────────

  describe('runMastering', () => {
    it('throws if sessionId not set', async () => {
      await expect(client.runMastering()).rejects.toThrow('Session ID is not set');
    });

    it('sends mastering request with default params', async () => {
      const fetchMock = mockFetch(cryoResponse(null));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      await client.runMastering();

      expect(fetchMock.mock.calls[0][0]).toBe('https://platform.cryo-mix.com/api/mastering');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({});
    });

    it('sends mastering request with custom params', async () => {
      const fetchMock = mockFetch(cryoResponse(null));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      await client.runMastering({ mwa: 3, meq: 7, mha: -2, mma: 1, mla: 0, mca: 4 });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ mwa: 3, meq: 7, mha: -2, mma: 1, mla: 0, mca: 4 });
    });
  });

  // ─── Poll Progress ────────────────────────────────────────────────────

  describe('pollProgress', () => {
    it('throws if sessionId not set', async () => {
      await expect(client.pollProgress()).rejects.toThrow('Session ID is not set');
    });

    it('returns progress data', async () => {
      const fetchMock = mockFetch(cryoResponse({
        status: 'processing',
        percentage_complete: 45,
      }));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      const res = await client.pollProgress();

      expect(res.data.status).toBe('processing');
      expect(res.data.percentage_complete).toBe(45);
    });

    it('returns completed status with processed filenames', async () => {
      const fetchMock = mockFetch(cryoResponse({
        status: 'completed',
        percentage_complete: 100,
        processedFolderName: 'output-folder',
        processedObjectNames: { 'FinalMaster.wav': 'final.wav' },
      }));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      const res = await client.pollProgress();

      expect(res.data.status).toBe('completed');
      expect(res.data.processedFolderName).toBe('output-folder');
    });
  });

  // ─── Cancel ───────────────────────────────────────────────────────────

  describe('cancelMastering', () => {
    it('sends cancel request', async () => {
      const fetchMock = mockFetch(cryoResponse(null));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      await client.cancelMastering();

      expect(fetchMock.mock.calls[0][0]).toBe('https://platform.cryo-mix.com/api/mastering/cancel');
    });
  });

  // ─── Purchase ─────────────────────────────────────────────────────────

  describe('purchase', () => {
    it('sends purchase request with required fields', async () => {
      const fetchMock = mockFetch(cryoResponse({ status: 'Api success, purchase successfully' }));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      await client.purchase({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
      });
    });

    it('includes marketing_consent when provided', async () => {
      const fetchMock = mockFetch(cryoResponse(null));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      await client.purchase({
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        marketingConsent: true,
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.marketing_consent).toBe(true);
    });
  });

  // ─── Download ─────────────────────────────────────────────────────────

  describe('download', () => {
    it('returns signed download URLs', async () => {
      const urls = {
        'FinalMaster.mp3': 'https://storage.googleapis.com/final.mp3',
        'FinalMaster.wav': 'https://storage.googleapis.com/final.wav',
        'MasteringReport.json': 'https://storage.googleapis.com/report.json',
      };
      const fetchMock = mockFetch(cryoResponse({ download_audio_urls: urls }));
      globalThis.fetch = fetchMock;
      client.setSessionId('sess-1');

      const res = await client.download(3600);

      expect(res.data.download_audio_urls).toEqual(urls);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.expiration_seconds).toBe(3600);
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws on non-ok API response', async () => {
      globalThis.fetch = mockFetch({ error: 'Unauthorized' }, 401);
      client.setSessionId('sess-1');

      await expect(client.pollProgress()).rejects.toThrow('Cryo Mix API /api/percentage failed (401)');
    });
  });
});

// ─── createCryoMixClient ────────────────────────────────────────────────────

describe('createCryoMixClient', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when CRYOMIX_API_KEY is not set', () => {
    process.env = { ...originalEnv };
    delete process.env.CRYOMIX_API_KEY;
    expect(() => createCryoMixClient()).toThrow('CRYOMIX_API_KEY');
  });

  it('creates client from env var', () => {
    process.env = { ...originalEnv, CRYOMIX_API_KEY: 'env-key-123' };
    const c = createCryoMixClient();
    expect(c.apiKey).toBe('env-key-123');
  });
});
