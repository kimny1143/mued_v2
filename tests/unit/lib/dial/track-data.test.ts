import { describe, it, expect } from 'vitest';
import { buildAdvancedTrackData, type ParameterChanges, type TrackInfo } from '@/lib/dial/track-data';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTracks(filenames: string[]): TrackInfo[] {
  return filenames.map((f) => ({
    // roexUploadUrl has no X-Goog params → treated as expired (fail-safe) → resolveTrackUrl uses
    // r2Url. Setting r2Url to the same value keeps the resolved trackUrl stable for assertions.
    roexUploadUrl: `https://storage.example.com/${f}`,
    r2Url: `https://storage.example.com/${f}`,
    originalFilename: f,
  }));
}

// ─── buildAdvancedTrackData ─────────────────────────────────────────────────

describe('buildAdvancedTrackData', () => {
  it('returns default values for tracks with no matching changes', () => {
    const tracks = makeTracks(['vocal.wav', 'drums.wav']);
    const result = buildAdvancedTrackData(tracks, []);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      trackUrl: 'https://storage.example.com/vocal.wav',
      gainDb: 0,
      eqBands: undefined,
      compressor: undefined,
      panAngleDegrees: undefined,
    });
  });

  it('matches parameter changes by exact filename', () => {
    const tracks = makeTracks(['vocal.wav']);
    const changes: ParameterChanges[] = [
      { track: 'vocal.wav', changes: { gainDb: 2 } },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].gainDb).toBe(2);
  });

  it('matches parameter changes by partial filename (without extension)', () => {
    const tracks = makeTracks(['vocal_main.wav']);
    const changes: ParameterChanges[] = [
      { track: 'vocal_main', changes: { gainDb: -3 } },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].gainDb).toBe(-3);
  });

  it('matches case-insensitively', () => {
    const tracks = makeTracks(['Vocal_Main.wav']);
    const changes: ParameterChanges[] = [
      { track: 'vocal_main', changes: { gainDb: 1.5 } },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].gainDb).toBe(1.5);
  });

  it('builds EQ bands with correct field mapping', () => {
    const tracks = makeTracks(['guitar.wav']);
    const changes: ParameterChanges[] = [
      {
        track: 'guitar',
        changes: {
          eqBands: [
            { freq: 3000, gainDb: 2, q: 1.4 },
            { freq: 200, gainDb: -3, q: 2.0 },
          ],
        },
      },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].eqBands).toEqual([
      { frequency: 3000, gain: 2, q: 1.4 },
      { frequency: 200, gain: -3, q: 2.0 },
    ]);
  });

  it('builds compressor with defaults for missing fields', () => {
    const tracks = makeTracks(['bass.wav']);
    const changes: ParameterChanges[] = [
      {
        track: 'bass',
        changes: { compRatio: 4 },
      },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].compressor).toEqual({
      ratio: 4,
      threshold: -20,  // default
      attack: 10,      // default
      release: 100,    // default
    });
  });

  it('builds compressor with all custom values', () => {
    const tracks = makeTracks(['drums.wav']);
    const changes: ParameterChanges[] = [
      {
        track: 'drums',
        changes: {
          compRatio: 6,
          compThresholdDb: -15,
          compAttackMs: 5,
          compReleaseMs: 200,
        },
      },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].compressor).toEqual({
      ratio: 6,
      threshold: -15,
      attack: 5,
      release: 200,
    });
  });

  it('does not create compressor when compRatio is null/undefined', () => {
    const tracks = makeTracks(['keys.wav']);
    const changes: ParameterChanges[] = [
      { track: 'keys', changes: { gainDb: 1 } },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].compressor).toBeUndefined();
  });

  it('sets panAngleDegrees', () => {
    const tracks = makeTracks(['guitar.wav']);
    const changes: ParameterChanges[] = [
      { track: 'guitar', changes: { panAngleDegrees: -30 } },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result[0].panAngleDegrees).toBe(-30);
  });

  // ─── Incident 2026-06-15: dialogue-final URL resolution (GCS→R2 fallback + pre-charge guard) ──

  it('resolves the submit URL via GCS→R2 fallback when the GCS upload URL is expired', () => {
    // A returning/copied (goodwill) session: roex_upload_url is a long-dead GCS URL, r2_url is live.
    // The dialogue-final path must send the live R2 URL, not the dead GCS one.
    const expiredGcs = 'https://storage.googleapis.com/b/stem.wav?X-Goog-Date=20260101T000000Z&X-Goog-Expires=3600';
    const liveR2 = 'https://cdn.example.com/stream/stem.wav';
    const result = buildAdvancedTrackData(
      [{ roexUploadUrl: expiredGcs, r2Url: liveR2, originalFilename: 'stem.wav' }],
      [{ track: 'stem.wav', changes: { gainDb: 2 } }],
    );
    expect(result[0].trackUrl).toBe(liveR2);
    expect(result[0].gainDb).toBe(2); // params still matched by filename, independent of URL
  });

  it('THROWS (pre-charge guard) when a track has no usable URL — never hands RoEx a dead URL', () => {
    // dead GCS + no R2 → resolveTrackUrl returns null. buildAdvancedTrackData runs BEFORE the cycle
    // reservation in final/route.ts, so throwing here means a paid dialogue-final neither 500s on a
    // dead URL nor burns a reserved cycle.
    const deadGcs = 'https://storage.googleapis.com/b/stem.wav?X-Goog-Date=20260101T000000Z&X-Goog-Expires=3600';
    expect(() =>
      buildAdvancedTrackData(
        [{ roexUploadUrl: deadGcs, r2Url: null, originalFilename: 'stem.wav' }],
        [{ track: 'stem.wav', changes: { gainDb: 1 } }],
      ),
    ).toThrow(/Stem URL expired for "stem.wav"/);
  });

  it('handles a full 5-track rock band scenario', () => {
    const tracks = makeTracks([
      'vocal_main.wav', 'guitar_rhythm.wav', 'guitar_lead.wav', 'bass.wav', 'drums.wav',
    ]);
    const changes: ParameterChanges[] = [
      { track: 'vocal_main', changes: { gainDb: 1, compRatio: 3 } },
      { track: 'guitar_rhythm', changes: { panAngleDegrees: -40 } },
      { track: 'guitar_lead', changes: { panAngleDegrees: 40, gainDb: -1 } },
      { track: 'bass', changes: { gainDb: 0 } },
      { track: 'drums', changes: { compRatio: 5, compAttackMs: 2 } },
    ];
    const result = buildAdvancedTrackData(tracks, changes);

    expect(result).toHaveLength(5);
    expect(result[0].gainDb).toBe(1);
    expect(result[0].compressor?.ratio).toBe(3);
    expect(result[1].panAngleDegrees).toBe(-40);
    expect(result[2].panAngleDegrees).toBe(40);
    expect(result[2].gainDb).toBe(-1);
    expect(result[3].gainDb).toBe(0);
    expect(result[4].compressor?.attack).toBe(2);
    expect(result[4].compressor?.release).toBe(100); // default
  });
});
