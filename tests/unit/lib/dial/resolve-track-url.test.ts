import { describe, it, expect } from 'vitest';
import { resolveTrackUrl, resolveAllTrackUrls } from '@/lib/dial/resolve-track-url';

// GCS-style signed URLs with controllable expiry
const gcsUrl = (dateZ: string, expiresSec: number) =>
  `https://storage.googleapis.com/bucket/stem.wav?X-Goog-Date=${dateZ}&X-Goog-Expires=${expiresSec}`;
const FRESH_GCS = gcsUrl('20300101T000000Z', 86400); // far future — won't expire during test runs
const EXPIRED_GCS = gcsUrl('20260101T000000Z', 3600); // clearly past
const R2 = 'https://cdn.example.com/stream/stem.wav';

// URLs whose expiry CANNOT be parsed (no / partial X-Goog params). Before the 2026-06-15 fail-safe
// these returned "not expired" → resolveTrackUrl could hand RoEx a long-dead upload URL.
const NO_GOOG = 'https://storage.googleapis.com/bucket/stem.wav';
const PARTIAL_GOOG = 'https://storage.googleapis.com/bucket/stem.wav?X-Goog-Date=20300101T000000Z'; // no Expires
const MALFORMED = 'not-a-url';

describe('resolveTrackUrl — GCS-first (submit identity preserved)', () => {
  // REGRESSION GUARD: a valid GCS URL must be returned even when R2 exists. RoEx keys fxSettings
  // by the SUBMITTED URL basename, and final/route.ts looks up fxSettings by roexUploadUrl(GCS)
  // basename — so the submitted identity must stay GCS for a fresh session or omakase basic-final
  // silently loses per-track gain. (The brief 2026-06-15 r2-first reorder broke this; reverted.)
  it('returns the fresh GCS URL even when R2 is also present', () => {
    expect(resolveTrackUrl({ roexUploadUrl: FRESH_GCS, r2Url: R2 })).toBe(FRESH_GCS);
  });

  it('uses a fresh GCS URL when R2 is null (just-uploaded, copy pending)', () => {
    expect(resolveTrackUrl({ roexUploadUrl: FRESH_GCS, r2Url: null })).toBe(FRESH_GCS);
  });
});

describe('resolveTrackUrl — R2 fallback only when GCS is dead (the retained fix)', () => {
  it('falls back to R2 when the GCS URL is expired', () => {
    expect(resolveTrackUrl({ roexUploadUrl: EXPIRED_GCS, r2Url: R2 })).toBe(R2);
  });

  it('fail-safe: falls back to R2 when GCS expiry is UNPARSEABLE (closes the dead-GCS hazard)', () => {
    // Yuu's goodwill case is the parseable-expired one above; these cover the un-vouchable shapes.
    expect(resolveTrackUrl({ roexUploadUrl: NO_GOOG, r2Url: R2 })).toBe(R2);
    expect(resolveTrackUrl({ roexUploadUrl: PARTIAL_GOOG, r2Url: R2 })).toBe(R2);
    expect(resolveTrackUrl({ roexUploadUrl: MALFORMED, r2Url: R2 })).toBe(R2);
  });

  it('returns null when GCS is expired/unparseable and there is no R2', () => {
    expect(resolveTrackUrl({ roexUploadUrl: EXPIRED_GCS, r2Url: null })).toBeNull();
    expect(resolveTrackUrl({ roexUploadUrl: NO_GOOG, r2Url: null })).toBeNull();
    expect(resolveTrackUrl({ roexUploadUrl: PARTIAL_GOOG, r2Url: null })).toBeNull();
    expect(resolveTrackUrl({ roexUploadUrl: MALFORMED, r2Url: null })).toBeNull();
  });
});

describe('resolveAllTrackUrls', () => {
  it('returns empty array for empty input', () => {
    expect(resolveAllTrackUrls([])).toEqual([]);
  });

  it('returns fresh GCS for both no-R2 and R2-backed tracks (GCS-first)', () => {
    const tracks = [
      { roexUploadUrl: FRESH_GCS, r2Url: null },
      { roexUploadUrl: FRESH_GCS, r2Url: R2 },
    ];
    const results = resolveAllTrackUrls(tracks);
    expect(results).toHaveLength(2);
    expect(results[0].trackUrl).toBe(FRESH_GCS);
    expect(results[1].trackUrl).toBe(FRESH_GCS); // R2 present but fresh GCS wins (submit identity)
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
        { roexUploadUrl: NO_GOOG, r2Url: null },
      ]),
    ).toThrow('2 track(s) affected');
  });

  it('resolves mixed: expired→R2 and fresh→GCS', () => {
    const tracks = [
      { roexUploadUrl: EXPIRED_GCS, r2Url: R2 },
      { roexUploadUrl: FRESH_GCS, r2Url: null },
    ];
    const results = resolveAllTrackUrls(tracks);
    expect(results[0].trackUrl).toBe(R2);
    expect(results[1].trackUrl).toBe(FRESH_GCS);
  });
});
