import { getRoExWebhookUrl, ROEX_POLL_TIMEOUT_MS, type RoExClient } from './client';
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
  // Handle nesting inconsistency across different endpoints
  const results = (raw.previewMixTaskResults ?? raw.applyAudioEffectsResults ?? raw) as Record<string, unknown>;

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

  // Best-effort failure detection across RoEx's (undocumented) error shapes. Failed when
  // an explicit error flag is set (boolean true / non-empty string / truthy object) OR the
  // status reads like a failure. `error:false` must NOT trip. The comm-timeout + wall-clock
  // backstop are the guaranteed catches; this is the fast path when RoEx tells us directly.
  const rawError = results.error ?? raw.error;
  const hasErrorFlag =
    rawError === true ||
    (typeof rawError === 'string' && rawError.trim().length > 0) ||
    (typeof rawError === 'object' && rawError !== null);
  const isFailed = hasErrorFlag || /fail|error|cancel|abort|reject|time.?out/i.test(status);
  const error = isFailed
    ? (typeof rawError === 'string' && rawError.trim()
        ? rawError
        : (results.message as string) ?? (raw.message as string) ?? (results.error_message as string) ?? `RoEx mix task failed${status ? ` (${status})` : ''}`)
    : undefined;

  return {
    taskId,
    status: isFailed ? 'failed' : status,
    previewUrl,
    finalUrl,
    stemsUrl,
    fxSettings,
    error,
  };
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
      webhookURL: getRoExWebhookUrl(),
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

  // POLL call → opt into the comm-timeout (a hung poll must not block the function).
  const raw = await client.post<Record<string, unknown>>(
    '/retrievepreviewmix',
    body,
    { timeoutMs: ROEX_POLL_TIMEOUT_MS },
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
      returnStems: req.returnStems ?? true,
      trackData: req.trackData.map((t) => ({
        trackURL: t.trackUrl,
        gainDb: t.gainDb,
      })),
      webhookURL: getRoExWebhookUrl(),
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
      returnStems: req.returnStems ?? true,
      trackData: req.trackData.map((t) => ({
        trackURL: t.trackUrl,
        gainDb: t.gainDb,
        eq_settings: t.eqBands?.length
          ? Object.fromEntries(
              t.eqBands.slice(0, 6).map((b, i) => [
                `band_${i + 1}`,
                { centre_freq: b.frequency, gain: b.gain, q: b.q },
              ]),
            )
          : undefined,
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
      webhookURL: getRoExWebhookUrl(),
    },
  };

  // SUBMIT/charge call → NO comm-timeout (a false abort would risk a re-POST re-charge).
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

  // POLL call → opt into the comm-timeout (retrieve, not the initial charge submit).
  const raw = await client.post<Record<string, unknown>>('/retrievefinalmix', body, {
    timeoutMs: ROEX_POLL_TIMEOUT_MS,
  });
  return parseMixResponse(raw);
}
