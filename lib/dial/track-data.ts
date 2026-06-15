/**
 * MUEDial Track Data Builders
 *
 * Pure functions extracted from app/api/dial/final/route.ts for testability.
 */

import type { AdvancedTrackAdjustment } from '@/lib/roex';
import { resolveTrackUrl } from './resolve-track-url';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EqBandInput {
  freq: number;
  gainDb: number;
  q: number;
}

export interface ParameterChanges {
  track: string;
  changes: {
    gainDb?: number;
    compRatio?: number;
    compThresholdDb?: number;
    compAttackMs?: number;
    compReleaseMs?: number;
    eqBands?: EqBandInput[];
    panAngleDegrees?: number;
  };
}

export interface TrackInfo {
  roexUploadUrl: string;
  r2Url: string | null;
  originalFilename: string;
}

// ─── Build Advanced Track Data ──────────────────────────────────────────────

/**
 * Build advanced track data from Hoo's parameter changes + track info.
 *
 * Matches parameter changes to tracks by filename (case-insensitive, partial match) — so the
 * submitted track URL identity does not affect which params apply.
 * Tracks without matching changes get default values (gainDb=0, no FX).
 *
 * Resolves each submit URL via resolveTrackUrl (GCS→R2 fallback), mirroring the omakase branch:
 * a returning/copied session's GCS upload URL may be long dead, so we must fall back to the
 * permanent r2_url. THROWS if a track has no usable URL — this runs in the dialogue-final path
 * BEFORE the cycle reservation (app/api/dial/final/route.ts), so it can never hand RoEx a dead
 * URL on a paid final (which would 500 AND burn a reserved cycle). Incident 2026-06-15.
 */
export function buildAdvancedTrackData(
  tracks: TrackInfo[],
  paramChanges: ParameterChanges[],
): AdvancedTrackAdjustment[] {
  return tracks.map((t) => {
    // Match parameter changes to track by filename
    const pc = paramChanges.find((p) =>
      t.originalFilename.toLowerCase().includes(p.track.toLowerCase()) ||
      p.track.toLowerCase().includes(t.originalFilename.toLowerCase().replace(/\.[^.]+$/, '')),
    );

    const changes = pc?.changes ?? {};

    const trackUrl = resolveTrackUrl(t);
    if (!trackUrl) {
      throw new Error(`Stem URL expired for "${t.originalFilename}". Please re-upload your stems.`);
    }

    return {
      trackUrl,
      gainDb: changes.gainDb ?? 0,
      eqBands: changes.eqBands?.map((b) => ({
        frequency: b.freq,
        gain: b.gainDb,
        q: b.q,
      })),
      compressor: changes.compRatio != null ? {
        ratio: changes.compRatio,
        threshold: changes.compThresholdDb ?? -20,
        attack: changes.compAttackMs ?? 10,
        release: changes.compReleaseMs ?? 100,
      } : undefined,
      panAngleDegrees: changes.panAngleDegrees,
    };
  });
}
