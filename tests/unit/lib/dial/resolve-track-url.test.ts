import { describe, it, expect } from 'vitest';
import { resolveTrackUrl, resolveAllTrackUrls } from '@/lib/dial/resolve-track-url';

// GCS-style signed URLs with controllable expiry
const gcsUrl = (dateZ: string, expiresSec: number) =>
  `https://storage.googleapis.com/bucket/stem.wav?X-Goog-Date=${dateZ}&X-Goog-Expires=${expiresSec}`;
const FRESH_GCS = gcsUrl('20300101T000000Z', 86400); // far future — won't expire during test runs
const EXPIRED_GCS = gcsUrl('20260101T000000Z', 3600); // clearly past
const R2 = 'https://cdn.example.com/stream/stem.wav';

// URLs whose expiry CANNOT be parsed (no / partial X-Goog params). These are the incident class:
// before the 2026-06-15 fix, isGcsUrlExpired() returned false for these → resolveTrackUrl handed
// RoEx the (possibly long-dead) upload URL → preview 500 (Yuu goodwill session e3688b24).
const NO_GOOG = 'https://storage.googleapis.com/bucket/stem.wav';
const PARTIAL_GOOG = 'https://storage.googleapis.com/bucket/stem.wav?X-Goog-Date=20300101T000000Z'; // no Expires
const MALFORMED = 'not-a-url';

describe('resolveTrackUrl — r2-first (permanent copy preferred)', () => {
  it('prefers R2 over a fresh GCS URL when both present', () => {
    expect(resolveTrackUrl({ roexUploadUrl: FRESH_GCS, r2Url: R2 })).toBe(R2);
  });

  it('prefers R2 when GCS is expired', () => {
    expect(resolveTrackUrl({ roexUploadUrl: EXPIRED_GCS, r2Url: R2 })).toBe(R2);
  });

  it('INCIDENT 2026-06-15: prefers R2 even when GCS expiry is unparseable (was the preview-500)', () => {
    // Copied/goodwill session: roex_upload_url is a long-dead GCS URL with no parseable expiry.
    // Old behavior returned the dead URL → RoEx 500. New behavior returns the live R2 copy.
    expect(resolveTrackUrl({ roexUploadUrl: NO_GOOG, r2Url: R2 })).toBe(R2);
    expect(resolveTrackUrl({ roexUploadUrl: PARTIAL_GOOG, r2Url: R2 })).toBe(R2);
    expect(resolveTrackUrl({ roexUploadUrl: MALFORMED, r2Url: R2 })).toBe(R2);
  });
});

describe('resolveTrackUrl — GCS fallback only when no R2 copy yet', () => {
  it('uses a fresh GCS URL when R2 is null (just-uploaded, copy pending)', () => {
    expect(resolveTrackUrl({ roexUploadUrl: FRESH_GCS, r2Url: null })).toBe(FRESH_GCS);
  });

  it('returns null when GCS is expired and there is no R2', () => {
    expect(resolveTrackUrl({ roexUploadUrl: EXPIRED_GCS, r2Url: null })).toBeNull();
  });

  it('fail-safe: returns null when expiry is UNPARSEABLE and there is no R2', () => {
    // The flip from return-false → return-true: an un-vouchable URL is treated as expired so we
    // never hand RoEx a possibly-dead URL. Real fresh uploads are X-Goog-signed (parse fine), so
    // this only bites genuinely unrecoverable no-R2 tracks → caller shows a re-upload error.
    expect(resolveTrackUrl({ roexUploadUrl: NO_GOOG, r2Url: null })).toBeNull();
    expect(resolveTrackUrl({ roexUploadUrl: PARTIAL_GOOG, r2Url: null })).toBeNull();
    expect(resolveTrackUrl({ roexUploadUrl: MALFORMED, r2Url: null })).toBeNull();
  });
});

describe('resolveAllTrackUrls', () => {
  it('returns empty array for empty input', () => {
    expect(resolveAllTrackUrls([])).toEqual([]);
  });

  it('resolves fresh-GCS(no R2) and R2-backed tracks', () => {
    const tracks = [
      { roexUploadUrl: FRESH_GCS, r2Url: null },
      { roexUploadUrl: FRESH_GCS, r2Url: R2 },
    ];
    const results = resolveAllTrackUrls(tracks);
    expect(results).toHaveLength(2);
    expect(results[0].trackUrl).toBe(FRESH_GCS); // no R2 → fresh GCS
    expect(results[1].trackUrl).toBe(R2); // R2 present → R2
    expect(results[0].original).toBe(tracks[0]);
  });

  it('falls back to R2 for expired tracks', () => {
    expect(resolveAllTrackUrls([{ roexUploadUrl: EXPIRED_GCS, r2Url: R2 }])[0].trackUrl).toBe(R2);
  });

  it('throws when any track has no usable URL (expired + no R2)', () => {
    expect(() =>
      resolveAllTrackUrls([
        { roexUploadUrl: FRESH_GCS, r2Url: null },
        { roexUploadUrl: EXPIRED_GCS, r2Url: null },
      ]),
    ).toThrow('1 track(s) affected');
  });

  it('throws mentioning count when multiple tracks have no usable URL (expired + unparseable, no R2)', () => {
    expect(() =>
      resolveAllTrackUrls([
        { roexUploadUrl: EXPIRED_GCS, r2Url: null },
        { roexUploadUrl: NO_GOOG, r2Url: null }, // unparseable + no R2 → now also unusable
      ]),
    ).toThrow('2 track(s) affected');
  });

  it('resolves mixed: expired+R2 and fresh-GCS(no R2)', () => {
    const tracks = [
      { roexUploadUrl: EXPIRED_GCS, r2Url: R2 },
      { roexUploadUrl: FRESH_GCS, r2Url: null },
    ];
    const results = resolveAllTrackUrls(tracks);
    expect(results[0].trackUrl).toBe(R2);
    expect(results[1].trackUrl).toBe(FRESH_GCS);
  });
});
