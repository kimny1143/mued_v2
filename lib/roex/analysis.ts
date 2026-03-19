import type { RoExClient } from './client';
import { isRoExDevKey } from './client';
import type { AnalysisRequest, AnalysisResult, ComparisonResult } from './types';

// ─── Dev Dummies ─────────────────────────────────────────────────────────────

const DEV_ANALYSIS_RESULT: AnalysisResult = {
  loudnessLufs: -11.2,
  peakDbfs: -0.8,
  stereoField: 'STEREO',
  monoCompatible: true,
  clipping: 'NONE',
  tonalProfile: {
    bass_frequency: 'MEDIUM',
    low_mid_frequency: 'MEDIUM',
    high_mid_frequency: 'MEDIUM',
    high_frequency: 'MEDIUM',
  },
  raw: { _dev: true },
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

// ─── Musical Style Mapping ───────────────────────────────────────────────────

/**
 * Map our MusicalStyle enum to the /mixanalysis enum.
 * The analysis endpoint uses a broader set of styles than mixing.
 * Fallback to 'BALANCED' for unknown values.
 */
const ANALYSIS_STYLE_MAP: Record<string, string> = {
  ROCK_INDIE: 'INDIE_ROCK',
  POP: 'POP',
  ACOUSTIC: 'ACOUSTIC',
  HIPHOP_GRIME: 'HIP_HOP_GRIME',
  ELECTRONIC: 'ELECTRONIC',
  REGGAE_DUB: 'REGGAE',
  ORCHESTRAL: 'ORCHESTRAL',
  METAL: 'METAL',
  OTHER: 'BALANCED',
};

function toAnalysisStyle(musicalStyle: string): string {
  return ANALYSIS_STYLE_MAP[musicalStyle] ?? 'BALANCED';
}

// ─── Analysis ────────────────────────────────────────────────────────────────

/**
 * Analyze a single audio file.
 * Returns loudness, peak, stereo field, tonal profile, etc.
 *
 * RoEx /mixanalysis requires body wrapped in `mixDiagnosisData`.
 */
export async function analyzeMix(
  client: RoExClient,
  req: AnalysisRequest,
): Promise<AnalysisResult> {
  if (isRoExDevKey()) {
    return DEV_ANALYSIS_RESULT;
  }

  const body = {
    mixDiagnosisData: {
      audioFileLocation: req.audioUrl,
      musicalStyle: toAnalysisStyle(req.musicalStyle),
      isMaster: req.isMaster ?? false,
    },
  };

  const raw = await client.post<Record<string, unknown>>(
    '/mixanalysis',
    body,
  );

  // Response nests results under "payload"
  const payload = (raw.payload ?? raw) as Record<string, unknown>;

  return {
    loudnessLufs: (payload.integrated_loudness_lufs as number) ?? 0,
    peakDbfs: (payload.peak_loudness_dbfs as number) ?? 0,
    stereoField: (payload.stereo_field as string) ?? '',
    monoCompatible: (payload.mono_compatible as boolean) ?? false,
    clipping: (payload.clipping as string) ?? 'NONE',
    tonalProfile: (payload.tonal_profile as Record<string, string>) ?? {},
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
    mixComparisonData: {
      mixAUrl,
      mixBUrl,
      musicalStyle: toAnalysisStyle(musicalStyle),
      isMaster,
    },
  };

  const raw = await client.post<Record<string, unknown>>('/mixcomparison', body);
  return { raw };
}
