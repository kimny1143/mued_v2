import { describe, it, expect, vi, afterEach } from 'vitest';
import { isRoExUpstreamError, RoExCommTimeoutError } from '@/lib/roex';
import { sanitizeUpstreamRoExError } from '@/lib/dial/roex-error';

// The exact RoEx upstream body reported for free-campaign session fd7ef7a2 (2026-06-12).
const ROEX_RAW =
  'RoEx API /retrievefinalmix failed (500): {"message":"Service completed but did not return results. Your credits have been used - please contact support.","info":"Missing download URL from service"}';

describe('isRoExUpstreamError', () => {
  it('is true for an HTTP error surfaced by the RoEx client', () => {
    expect(isRoExUpstreamError(new Error(ROEX_RAW))).toBe(true);
    expect(isRoExUpstreamError(new Error('RoEx API /mixpreview failed (502): bad gateway'))).toBe(true);
  });

  it('is true for a RoEx poll comm-timeout', () => {
    expect(isRoExUpstreamError(new RoExCommTimeoutError('RoEx API /retrievepreviewmix timed out after 45000ms'))).toBe(true);
  });

  it('is false for app-side, user-actionable errors (must NOT be sanitized)', () => {
    expect(isRoExUpstreamError(new Error('Stem URL expired for "kick.wav". Please re-upload your stems.'))).toBe(false);
    expect(isRoExUpstreamError(new Error('No parameter changes found. Ask Hoo for mixing suggestions first.'))).toBe(false);
  });

  it('is false for non-Error values', () => {
    expect(isRoExUpstreamError('RoEx API ...')).toBe(false);
    expect(isRoExUpstreamError(null)).toBe(false);
    expect(isRoExUpstreamError(undefined)).toBe(false);
  });
});

describe('sanitizeUpstreamRoExError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns a sanitized INFRA_ERROR response that does NOT leak RoEx raw copy', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = sanitizeUpstreamRoExError(new Error(ROEX_RAW), '[final/POST]');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);

    const body = await res!.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('INFRA_ERROR');
    // The user-facing message must not contain RoEx's alarming operator copy.
    expect(body.error).not.toMatch(/credits/i);
    expect(body.error).not.toMatch(/contact support/i);
    expect(body.error).not.toMatch(/RoEx API/);
    // Raw detail is preserved server-side for debugging.
    expect(errSpy).toHaveBeenCalledWith('[final/POST] RoEx upstream error:', ROEX_RAW);
  });

  it('returns null for app-side errors so callers preserve the actionable message', () => {
    const res = sanitizeUpstreamRoExError(
      new Error('Stem URL expired for "kick.wav". Please re-upload your stems.'),
      '[preview/POST]',
    );
    expect(res).toBeNull();
  });
});
