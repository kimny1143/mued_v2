import type { RoExClient } from './client';
import type {
  MixPreviewRequest,
  MixFinalRequest,
  MixAdvancedFinalRequest,
  MixResult,
  FxChainWrapper,
  PresenceSetting,
  PanPreference,
  ReverbPreference,
} from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildTrackData(req: MixPreviewRequest) {
  return req.tracks.map((t) => ({
    trackURL: t.trackUrl,
    instrumentGroup: t.instrumentGroup,
    presenceSetting: t.presenceSetting ?? ('NORMAL' as PresenceSetting),
    panPreference: t.panPreference ?? ('NO_PREFERENCE' as PanPreference),
    reverbPreference: t.reverbPreference ?? ('NONE' as ReverbPreference),
  }));
}

/**
 * Parse mix preview/final response.
 * Handles both nested (previewMixTaskResults) and flat response shapes,
 * and alternative key names for download URLs.
 */
function parseMixResponse(raw: Record<string, unknown>): MixResult {
  // Handle nesting inconsistency
  const results = (raw.previewMixTaskResults ?? raw) as Record<string, unknown>;

  // Task ID
  const taskId =
    (results.multitrack_task_id as string) ??
    (results.taskId as string) ??
    (raw.multitrack_task_id as string) ??
    '';

  // Status
  const status = (results.status as string) ?? '';

  // Preview URL (two possible key names)
  const previewUrl =
    (results.download_url_preview_mixed as string) ??
    (results.previewMixDownloadUrl as string) ??
    undefined;

  // Final URL
  const finalUrl = (results.download_url_mixed as string) ?? undefined;

  // Stems (two possible key names)
  const stemsUrl =
    (results.stems as Record<string, string>) ??
    (results.stemsDownloadUrl as Record<string, string>) ??
    undefined;

  // FX settings
  const fxSettings =
    (results.mix_output_settings as Record<string, FxChainWrapper>) ??
    undefined;

  return { taskId, status, previewUrl, finalUrl, stemsUrl, fxSettings };
}

// ─── API Methods ────────────────────────────────────────────────────────────

/**
 * Submit a mix preview request.
 * Bypasses roex-python controller's webhookURL:null bug by POSTing directly.
 */
export async function mixPreview(
  client: RoExClient,
  req: MixPreviewRequest,
): Promise<MixResult> {
  const body = {
    multitrackData: {
      trackData: buildTrackData(req),
      musicalStyle: req.musicalStyle,
      returnStems: req.returnStems ?? true,
      sampleRate: req.sampleRate ?? '44100',
      // Dummy webhook — RoEx requires this field but we poll instead
      webhookURL: 'https://httpbin.org/post',
    },
  };

  const raw = await client.post<Record<string, unknown>>('/mixpreview', body);
  return parseMixResponse(raw);
}

/**
 * Poll for mix preview completion.
 * Returns updated MixResult when status changes.
 */
export async function pollMixPreview(
  client: RoExClient,
  taskId: string,
  options?: { retrieveFxSettings?: boolean },
): Promise<MixResult> {
  const params = new URLSearchParams({ task_id: taskId });
  if (options?.retrieveFxSettings) {
    params.set('retrieve_fx_settings', 'true');
  }

  const raw = await client.get<Record<string, unknown>>(
    `/mixpreview?${params}`,
  );
  return parseMixResponse(raw);
}

/**
 * Request a basic final mix (gain_db adjustments only).
 * Costs 175cr (if FX purchased) or 300cr.
 */
export async function mixFinalBasic(
  client: RoExClient,
  req: MixFinalRequest,
): Promise<MixResult> {
  const body = {
    multitrack_task_id: req.taskId,
    track_data: req.trackData.map((t) => ({
      track_url: t.trackUrl,
      gain_db: t.gainDb,
    })),
  };

  const raw = await client.post<Record<string, unknown>>('/mixfinal', body);
  return parseMixResponse(raw);
}

/**
 * Request an advanced final mix (EQ, compressor, pan adjustments).
 * Note: Submitted values are treated as "hints" — RoEx may override.
 */
export async function mixFinalAdvanced(
  client: RoExClient,
  req: MixAdvancedFinalRequest,
): Promise<MixResult> {
  const body = {
    multitrack_task_id: req.taskId,
    track_data: req.trackData.map((t) => ({
      track_url: t.trackUrl,
      gain_db: t.gainDb,
      eq_bands: t.eqBands,
      compressor: t.compressor,
      pan_angle_degrees: t.panAngleDegrees,
    })),
  };

  const raw = await client.post<Record<string, unknown>>(
    '/mixfinaladvanced',
    body,
  );
  return parseMixResponse(raw);
}
