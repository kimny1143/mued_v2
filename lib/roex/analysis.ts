import type { RoExClient } from './client';
import { isRoExDevKey } from './client';
import type { AnalysisRequest, AnalysisResult, ComparisonResult } from './types';

// ─── Dev Dummies ─────────────────────────────────────────────────────────────

const DEV_ANALYSIS_RESULT: AnalysisResult = {
  loudnessLufs: -11.2,
  peakDbfs: -0.8,
  stereoField: 'wide',
  monoCompatible: true,
  clipping: false,
  tonalProfile: {
    low: 0.35,
    mid: 0.45,
    high: 0.2,
  },
  raw: {
    _dev: true,
    loudness_lufs: -11.2,
    peak_dbfs: -0.8,
    stereo_field: 'wide',
    mono_compatible: true,
    clipping: false,
    tonal_profile: { low: 0.35, mid: 0.45, high: 0.2 },
  },
};

const DEV_COMPARISON_RESULT: ComparisonResult = {
  raw: {
    _dev: true,
    loudness_diff_lufs: 2.1,
    spectral_similarity: 0.78,
    stereo_width_diff: 0.12,
    dynamic_range_diff: 1.5,
    summary: 'Mix B is slightly louder with wider stereo image. Low-end is more present in Mix A.',
  },
};

// ─── Analysis ────────────────────────────────────────────────────────────────

/**
 * Analyze a single audio file.
 * Returns loudness, peak, stereo field, tonal profile, etc.
 */
export async function analyzeMix(
  client: RoExClient,
  req: AnalysisRequest,
): Promise<AnalysisResult> {
  if (isRoExDevKey()) {
    return DEV_ANALYSIS_RESULT;
  }

  const body = {
    audio_file_location: req.audioUrl,
    musical_style: req.musicalStyle,
    is_master: req.isMaster ?? false,
  };

  const raw = await client.post<Record<string, unknown>>(
    '/mixanalysis',
    body,
  );

  // Response may nest results under "payload"
  const payload = (raw.payload ?? raw) as Record<string, unknown>;

  return {
    loudnessLufs: (payload.loudness_lufs as number) ?? 0,
    peakDbfs: (payload.peak_dbfs as number) ?? 0,
    stereoField: (payload.stereo_field as string) ?? '',
    monoCompatible: (payload.mono_compatible as boolean) ?? false,
    clipping: (payload.clipping as boolean) ?? false,
    tonalProfile: (payload.tonal_profile as Record<string, number>) ?? {},
    raw: payload,
  };
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Compare two audio files (e.g., reference vs preview mix).
 * Returns raw comparison data wrapped in ComparisonResult.
 */
export async function compareMixes(
  client: RoExClient,
  mixAUrl: string,
  mixBUrl: string,
  musicalStyle: string,
  isMaster = false,
): Promise<ComparisonResult> {
  if (isRoExDevKey()) {
    return DEV_COMPARISON_RESULT;
  }

  const body = {
    mix_a_url: mixAUrl,
    mix_b_url: mixBUrl,
    musical_style: musicalStyle,
    is_master: isMaster,
  };

  const raw = await client.post<Record<string, unknown>>('/mixcomparison', body);
  return { raw };
}
