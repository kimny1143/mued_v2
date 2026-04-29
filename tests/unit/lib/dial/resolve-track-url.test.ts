import { describe, it, expect } from 'vitest';
import { resolveTrackUrl, resolveAllTrackUrls } from '@/lib/dial/resolve-track-url';

// Helpers to build GCS-style signed URLs with controllable expiry
const gcsUrl = (dateZ: string, expiresSec: number) =>
  `https://storage.googleapis.com/bucket/stem.wav?X-Goog-Date=${dateZ}&X-Goog-Expires=${expiresSec}`;

// A GCS URL that expires 2030-01-02T00:00:00Z (far future — won't expire during test runs)
const FRESH_GCS = gcsUrl('20300101T000000Z', 86400);
// A GCS URL that expired 2026-01-01T01:00:00Z (clearly past)
const EXPIRED_GCS = gcsUrl('20260101T000000Z', 3600);
const R2 = 'https://cdn.example.com/stream/stem.wav';

describe('resolveTrackUrl', () => {
  it('returns GCS URL when it has not expired', () => {
    const result = resolveTrackUrl({ roexUploadUrl: FRESH_GCS, r2Url: R2 });
    expect(result).toBe(FRESH_GCS);
  });

  it('returns R2 URL when GCS is expired and R2 is available', () => {
    const result = resolveTrackUrl({ roexUploadUrl: EXPIRED_GCS, r2Url: R2 });
    expect(result).toBe(R2);
  });

  it('returns null when GCS is expired and R2 is null', () => {
    const result = resolveTrackUrl({ roexUploadUrl: EXPIRED_GCS, r2Url: null });
    expect(result).toBeNull();
  });

  it('treats GCS URL with no X-Goog params as not expired', () => {
    const url = 'https://storage.googleapis.com/bucket/stem.wav';
    const result = resolveTrackUrl({ roexUploadUrl: url, r2Url: R2 });
    expect(result).toBe(url);
  });

  it('treats malformed (non-URL) string as not expired', () => {
    const url = 'not-a-url';
    const result = resolveTrackUrl({ roexUploadUrl: url, r2Url: R2 });
    expect(result).toBe(url);
  });

  it('returns GCS URL when only X-Goog-Date is present (missing Expires)', () => {
    const url = 'https://storage.googleapis.com/bucket/stem.wav?X-Goog-Date=20300101T000000Z';
    const result = resolveTrackUrl({ roexUploadUrl: url, r2Url: null });
    expect(result).toBe(url);
  });
});

describe('resolveAllTrackUrls', () => {
  it('returns empty array for empty input', () => {
    expect(resolveAllTrackUrls([])).toEqual([]);
  });

  it('resolves all fresh GCS tracks', () => {
    const tracks = [
      { roexUploadUrl: FRESH_GCS, r2Url: null },
      { roexUploadUrl: FRESH_GCS, r2Url: R2 },
    ];
    const results = resolveAllTrackUrls(tracks);
    expect(results).toHaveLength(2);
    expect(results[0].trackUrl).toBe(FRESH_GCS);
    expect(results[1].trackUrl).toBe(FRESH_GCS);
    expect(results[0].original).toBe(tracks[0]);
  });

  it('falls back to R2 for expired tracks', () => {
    const tracks = [{ roexUploadUrl: EXPIRED_GCS, r2Url: R2 }];
    const results = resolveAllTrackUrls(tracks);
    expect(results[0].trackUrl).toBe(R2);
  });

  it('throws when any track has expired GCS and no R2', () => {
    const tracks = [
      { roexUploadUrl: FRESH_GCS, r2Url: null },
      { roexUploadUrl: EXPIRED_GCS, r2Url: null },
    ];
    expect(() => resolveAllTrackUrls(tracks)).toThrow('1 track(s) affected');
  });

  it('throws mentioning count when multiple tracks have no valid URL', () => {
    const tracks = [
      { roexUploadUrl: EXPIRED_GCS, r2Url: null },
      { roexUploadUrl: EXPIRED_GCS, r2Url: null },
    ];
    expect(() => resolveAllTrackUrls(tracks)).toThrow('2 track(s) affected');
  });

  it('resolves mixed: expired+R2 and fresh GCS', () => {
    const tracks = [
      { roexUploadUrl: EXPIRED_GCS, r2Url: R2 },
      { roexUploadUrl: FRESH_GCS, r2Url: null },
    ];
    const results = resolveAllTrackUrls(tracks);
    expect(results).toHaveLength(2);
    expect(results[0].trackUrl).toBe(R2);
    expect(results[1].trackUrl).toBe(FRESH_GCS);
  });
});
