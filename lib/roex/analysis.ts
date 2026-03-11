import type { RoExClient } from './client';
import type { AnalysisRequest, AnalysisResult } from './types';

/**
 * Analyze a single audio file.
 * Returns loudness, peak, stereo field, tonal profile, etc.
 */
export async function analyzeMix(
  client: RoExClient,
  req: AnalysisRequest,
): Promise<AnalysisResult> {
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

/**
 * Compare two audio files (e.g., original vs mastered).
 */
export async function compareMixes(
  client: RoExClient,
  mixAUrl: string,
  mixBUrl: string,
  musicalStyle: string,
  isMaster = false,
): Promise<Record<string, unknown>> {
  const body = {
    mix_a_url: mixAUrl,
    mix_b_url: mixBUrl,
    musical_style: musicalStyle,
    is_master: isMaster,
  };

  return client.post<Record<string, unknown>>('/mixcomparison', body);
}
