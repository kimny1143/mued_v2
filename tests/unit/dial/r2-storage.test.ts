import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToR2, isRetryableR2Status } from '@/lib/dial/r2-storage';

// Response-like stub for the mocked worker fetch.
function res(status: number, body = 'ok') {
  return { ok: status >= 200 && status < 300, status, text: async () => body } as unknown as Response;
}
function abortError() {
  return Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
}

const PARAMS = { sourceUrl: 'https://gcs/x.wav', sessionId: 's1', taskId: 't1', taskType: 'final_advanced' };
// No real backoff delay in tests.
const NO_DELAY = { backoffMs: [0, 0] };

describe('isRetryableR2Status', () => {
  it('retries 429 and 5xx, not 4xx', () => {
    expect(isRetryableR2Status(429)).toBe(true);
    expect(isRetryableR2Status(500)).toBe(true);
    expect(isRetryableR2Status(503)).toBe(true);
    expect(isRetryableR2Status(400)).toBe(false);
    expect(isRetryableR2Status(404)).toBe(false);
    expect(isRetryableR2Status(403)).toBe(false);
  });
});

describe('copyToR2 retry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('DIAL_R2_WORKER_URL', 'https://worker.example');
    vi.stubEnv('DIAL_R2_SECRET', 'secret');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns r2Url on first-attempt success (no retry)', async () => {
    fetchMock.mockResolvedValueOnce(res(200));
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).not.toBeNull();
    expect(r!.r2Url).toBe('https://worker.example/download/sessions/s1/final_advanced_t1.wav');
    expect(r!.expiresAt).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transient 503 then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(res(503, 'busy')).mockResolvedValueOnce(res(200));
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries 429 up to max attempts then returns null', async () => {
    fetchMock.mockResolvedValue(res(429, 'rate limited'));
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3); // backoff.length(2) + 1
  });

  it('does NOT retry a 4xx (client error)', async () => {
    fetchMock.mockResolvedValueOnce(res(400, 'bad request'));
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a timeout (AbortError) — slow source would just time out again', async () => {
    fetchMock.mockRejectedValueOnce(abortError());
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transient network error then succeeds', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(res(200));
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null without fetching when env is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('DIAL_R2_WORKER_URL', '');
    const r = await copyToR2(PARAMS, NO_DELAY);
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
