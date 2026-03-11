/**
 * MUEDial Track Data Builders
 *
 * Pure functions extracted from app/api/dial/final/route.ts for testability.
 */

import type { AdvancedTrackAdjustment } from '@/lib/roex';

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
  originalFilename: string;
}

// ─── Build Advanced Track Data ──────────────────────────────────────────────

/**
 * Build advanced track data from Hoo's parameter changes + track info.
 *
 * Matches parameter changes to tracks by filename (case-insensitive, partial match).
 * Tracks without matching changes get default values (gainDb=0, no FX).
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

    return {
      trackUrl: t.roexUploadUrl,
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
