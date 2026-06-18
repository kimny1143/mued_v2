import { getRoExWebhookUrl, ROEX_POLL_TIMEOUT_MS, type RoExClient } from './client';
import type { MasteringPreviewRequest, MasteringResult } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** True only for a well-formed http(s) URL — used to validate a bare-string mastering response. */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseMasteringResponse(raw: unknown): MasteringResult {
  // Final mastering can return a dict OR a plain string URL. Validate the string is actually an
  // http(s) URL before treating it as a completed deliverable (audit ②): the 220cr is already
  // consumed by the time we parse, so a bare error / empty / garbage string stamped 'completed'
  // with a bogus finalUrl would surface a broken download AS SUCCESS. A non-URL string → failed,
  // so the route's existing failure path reconciles instead of delivering a dead link.
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return isHttpUrl(trimmed)
      ? { taskId: '', status: 'completed', finalUrl: trimmed }
      : { taskId: '', status: 'failed', error: 'RoEx mastering returned a non-URL string response' };
  }

  const top = raw as Record<string, unknown>;

  // Handle nesting: responses may be wrapped in previewMasterTaskResults or finalMasterTaskResults
  const data = (top.previewMasterTaskResults ?? top.finalMasterTaskResults ?? top) as Record<string, unknown>;

  const taskId =
    (data.mastering_task_id as string) ?? (data.taskId as string) ??
    (top.mastering_task_id as string) ?? '';
  const status = (data.status as string) ?? (top.status as string) ?? '';
  const previewUrl =
    (data.download_url_mastered_preview as string) ?? undefined;
  const finalUrl = (data.download_url_mastered as string) ?? undefined;

  // Best-effort failure detection (see parseMixResponse). `error:false` must NOT trip.
  const rawError = data.error ?? top.error;
  const hasErrorFlag =
    rawError === true ||
    (typeof rawError === 'string' && rawError.trim().length > 0) ||
    (typeof rawError === 'object' && rawError !== null);
  const isFailed = hasErrorFlag || /fail|error|cancel|abort|reject|time.?out/i.test(status);
  const error = isFailed
    ? (typeof rawError === 'string' && rawError.trim()
        ? rawError
        : (data.message as string) ?? (top.message as string) ?? `RoEx mastering task failed${status ? ` (${status})` : ''}`)
    : undefined;

  return { taskId, status: isFailed ? 'failed' : status, previewUrl, finalUrl, error };
}

// ─── API Methods ────────────────────────────────────────────────────────────

/**
 * Submit a mastering preview request (FREE - 0 credits).
 * Bypasses roex-python controller's webhookURL:null bug.
 */
export async function masterPreview(
  client: RoExClient,
  req: MasteringPreviewRequest,
): Promise<MasteringResult> {
  const body = {
    masteringData: {
      trackData: [{ trackURL: req.trackUrl }],
      musicalStyle: req.musicalStyle,
      desiredLoudness: req.desiredLoudness ?? 'MEDIUM',
      sampleRate: req.sampleRate ?? '44100',
      webhookURL: getRoExWebhookUrl(),
    },
  };

  const raw = await client.post('/masteringpreview', body);
  return parseMasteringResponse(raw);
}

/**
 * Poll for mastering preview completion.
 */
export async function pollMasterPreview(
  client: RoExClient,
  taskId: string,
): Promise<MasteringResult> {
  // POLL call → opt into the comm-timeout (free retrieve).
  const raw = await client.post('/retrievepreviewmaster', {
    masteringData: {
      masteringTaskId: taskId,
    },
  }, { timeoutMs: ROEX_POLL_TIMEOUT_MS });
  return parseMasteringResponse(raw);
}

/**
 * Retrieve the final mastered file (WAV).
 * Costs 220cr.
 */
export async function masterFinal(
  client: RoExClient,
  taskId: string,
  opts?: { poll?: boolean },
): Promise<MasteringResult> {
  const body = {
    masteringData: {
      masteringTaskId: taskId,
    },
  };
  // SUBMIT (mastering/final POST, 220cr charge) → NO comm-timeout (a false abort would risk
  // a re-POST re-charge). POLL/retrieve (GET / session / webhook, opts.poll=true) → timeout.
  const raw = await client.post(
    '/retrievefinalmaster',
    body,
    opts?.poll ? { timeoutMs: ROEX_POLL_TIMEOUT_MS } : undefined,
  );
  return parseMasteringResponse(raw);
}
