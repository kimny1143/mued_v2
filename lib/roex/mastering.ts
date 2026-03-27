import { getRoExWebhookUrl, type RoExClient } from './client';
import type { MasteringPreviewRequest, MasteringResult } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseMasteringResponse(raw: unknown): MasteringResult {
  // Final mastering can return a dict or a plain string URL
  if (typeof raw === 'string') {
    return { taskId: '', status: 'completed', finalUrl: raw };
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

  return { taskId, status, previewUrl, finalUrl };
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
  const raw = await client.post('/retrievepreviewmaster', {
    masteringData: {
      masteringTaskId: taskId,
    },
  });
  return parseMasteringResponse(raw);
}

/**
 * Retrieve the final mastered file (WAV).
 * Costs 220cr.
 */
export async function masterFinal(
  client: RoExClient,
  taskId: string,
): Promise<MasteringResult> {
  const body = {
    masteringData: {
      masteringTaskId: taskId,
    },
  };
  const raw = await client.post('/retrievefinalmaster', body);
  return parseMasteringResponse(raw);
}
