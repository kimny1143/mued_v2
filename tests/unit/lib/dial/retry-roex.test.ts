import { describe, it, expect, vi } from 'vitest';
import { isTransientRoExError, withRoExRetry } from '@/lib/dial/retry-roex';
import { RoExCommTimeoutError } from '@/lib/roex';

const roexHttp = (status: number) => new Error(`RoEx API /mixpreview failed (${status}): upstream body`);

describe('isTransientRoExError', () => {
  it('treats RoEx 5xx as transient', () => {
    for (const s of [500, 502, 503, 504, 599]) {
      expect(isTransientRoExError(roexHttp(s))).toBe(true);
    }
  });

  it('treats RoEx 429 (rate limit) as transient', () => {
    expect(isTransientRoExError(roexHttp(429))).toBe(true);
  });

  it('treats RoEx 4xx (except 429) as NON-transient', () => {
    for (const s of [400, 401, 403, 404, 422]) {
      expect(isTransientRoExError(roexHttp(s))).toBe(false);
    }
  });

  it('treats a comm-timeout as transient', () => {
    expect(isTransientRoExError(new RoExCommTimeoutError('RoEx API /x timed out after 45000ms'))).toBe(true);
  });

  it('treats raw network rejections as transient', () => {
    for (const msg of ['fetch failed', 'ECONNRESET', 'ETIMEDOUT', 'socket hang up', 'terminated']) {
      expect(isTransientRoExError(new Error(msg))).toBe(true);
    }
  });

  it('treats app-side errors as NON-transient', () => {
    expect(isTransientRoExError(new Error('No tracks uploaded'))).toBe(false);
    expect(isTransientRoExError(new Error('Stem URL expired — please re-upload your stems.'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isTransientRoExError('boom')).toBe(false);
    expect(isTransientRoExError(null)).toBe(false);
    expect(isTransientRoExError(undefined)).toBe(false);
  });
});

describe('withRoExRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRoExRetry(fn, { baseDelayMs: 0 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient 5xx then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(roexHttp(503))
      .mockResolvedValueOnce('ok');
    const onRetry = vi.fn();
    await expect(withRoExRetry(fn, { baseDelayMs: 0, onRetry })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('exhausts attempts on persistent transient errors and throws the last error (→ caller surfaces INFRA_ERROR)', async () => {
    const fn = vi.fn().mockRejectedValue(roexHttp(503));
    await expect(withRoExRetry(fn, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow(/failed \(503\)/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry a non-transient 4xx — throws immediately', async () => {
    const fn = vi.fn().mockRejectedValue(roexHttp(400));
    await expect(withRoExRetry(fn, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow(/failed \(400\)/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry an app-side error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('No tracks uploaded'));
    await expect(withRoExRetry(fn, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow('No tracks uploaded');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('honours a custom attempts count', async () => {
    const fn = vi.fn().mockRejectedValue(roexHttp(503));
    await expect(withRoExRetry(fn, { attempts: 2, baseDelayMs: 0 })).rejects.toThrow(/503/);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
