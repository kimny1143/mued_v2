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
 * Submit a mix preview request (FREE - 0 credits).
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
 * FREE without FX settings; 125 credits with retrieveFxSettings=true.
 * Returns updated MixResult when status changes.
 */
export async function pollMixPreview(
  client: RoExClient,
  taskId: string,
  options?: { retrieveFxSettings?: boolean },
): Promise<MixResult> {
  const body = {
    multitrackData: {
      multitrackTaskId: taskId,
      retrieveFXSettings: options?.retrieveFxSettings ?? false,
    },
  };

  const raw = await client.post<Record<string, unknown>>(
    '/retrievepreviewmix',
    body,
  );
  return parseMixResponse(raw);
}

/**
 * Request a basic final mix (gain_db adjustments only).
 * Uses /retrievefinalmix endpoint (250 credits, or 125 if FX settings already retrieved).
 */
export async function mixFinalBasic(
  client: RoExClient,
  req: MixFinalRequest,
): Promise<MixResult> {
  const body = {
    applyAudioEffectsData: {
      multitrackTaskId: req.taskId,
      returnStems: true,
      trackData: req.trackData.map((t) => ({
        trackURL: t.trackUrl,
        gainDb: t.gainDb,
      })),
      webhookURL: 'https://httpbin.org/post',
    },
  };

  const raw = await client.post<Record<string, unknown>>('/retrievefinalmix', body);
  return parseMixResponse(raw);
}

/**
 * Request an advanced final mix (EQ, compressor, pan adjustments).
 * Uses /retrievefinalmix endpoint.
 */
export async function mixFinalAdvanced(
  client: RoExClient,
  req: MixAdvancedFinalRequest,
): Promise<MixResult> {
  const body = {
    applyAudioEffectsData: {
      multitrackTaskId: req.taskId,
      returnStems: true,
      trackData: req.trackData.map((t) => ({
        trackURL: t.trackUrl,
        gainDb: t.gainDb,
        eq_settings: t.eqBands,
        compression_settings: t.compressor
          ? {
              attack_ms: t.compressor.attack,
              release_ms: t.compressor.release,
              threshold: t.compressor.threshold,
              ratio: t.compressor.ratio,
            }
          : undefined,
        panning_settings: t.panAngleDegrees != null
          ? { panning_angle: t.panAngleDegrees }
          : undefined,
      })),
      webhookURL: 'https://httpbin.org/post',
    },
  };

  const raw = await client.post<Record<string, unknown>>('/retrievefinalmix', body);
  return parseMixResponse(raw);
}

/**
 * Poll for final mix result.
 * Requires trackData (same tracks used in submission, min 2).
 */
export async function pollMixFinal(
  client: RoExClient,
  taskId: string,
  trackUrls: string[],
): Promise<MixResult> {
  const body = {
    applyAudioEffectsData: {
      multitrackTaskId: taskId,
      returnStems: true,
      trackData: trackUrls.map((url) => ({ trackURL: url })),
    },
  };

  const raw = await client.post<Record<string, unknown>>('/retrievefinalmix', body);
  return parseMixResponse(raw);
}
