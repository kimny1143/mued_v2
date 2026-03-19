/**
 * MUEDial R2 Storage Utility
 *
 * Copies deliverable files (final mix, mastered audio) from GCS to R2
 * for stable download URLs with 30-day expiry.
 *
 * Graceful degradation: returns null on failure, caller falls back to GCS URL.
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function copyToR2(params: {
  sourceUrl: string;
  sessionId: string;
  taskId: string;
  taskType: string;
  originalFilename?: string;
}): Promise<{ r2Url: string; expiresAt: Date } | null> {
  const workerUrl = process.env.DIAL_R2_WORKER_URL?.trim();
  const secret = process.env.DIAL_R2_SECRET?.trim();

  if (!workerUrl || !secret) {
    console.error('[r2-storage] Missing DIAL_R2_WORKER_URL or DIAL_R2_SECRET env vars');
    return null;
  }

  const key = params.originalFilename
    ? `sessions/${params.sessionId}/${params.originalFilename}`
    : `sessions/${params.sessionId}/${params.taskType}_${params.taskId}.wav`;

  try {
    const res = await fetch(`${workerUrl}/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-R2-Secret': secret,
      },
      body: JSON.stringify({
        sourceUrl: params.sourceUrl,
        key,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown');
      console.error(`[r2-storage] Copy failed: ${res.status} ${text}`);
      return null;
    }

    const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

    return {
      r2Url: `${workerUrl}/download/${key}`,
      expiresAt,
    };
  } catch (error) {
    console.error('[r2-storage] Copy request failed:', error);
    return null;
  }
}
