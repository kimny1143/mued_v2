/**
 * MUEDial Download / Stream API
 * GET /api/dial/download?taskId=xxx                                   → Content-Disposition: attachment (download)
 * GET /api/dial/download?taskId=xxx&inline=1                          → Content-Disposition: inline (audio playback)
 * GET /api/dial/download?taskId=xxx&stemKey=vocals&inline=1           → Proxy individual stem by taskId (GCS CORS bypass)
 * GET /api/dial/download?sessionId=xxx&stemKey=vocals&inline=1        → Proxy individual stem, server picks best task
 *
 * Streams audio through our server. Solves two problems:
 * 1. GCS presigned URLs are 4000+ chars — Chrome URL safety check blocks them as audio src
 * 2. GCS bucket CORS headers can't be set (RoEx-owned bucket)
 *
 * ?inline=1 mode: forwards Range headers for seeking, passes through 206 status.
 * Prefers R2 URL (if available and not expired), falls back to GCS URL.
 *
 * sessionId+stemKey mode: server selects the best task (preview MP3 preferred over final WAV)
 * — this avoids the client-side stemsUrls desync where preview task shows null client-side.
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks } from '@/db/schema';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership, verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiValidationError, apiNotFound, apiServerError } from '@/lib/api-response';

// Allow longer duration for large WAV file streaming
export const maxDuration = 120;

export const GET = withDialAuth(async (auth) => {
  const { searchParams } = new URL(auth.request.url);
  const taskId = searchParams.get('taskId');
  const sessionId = searchParams.get('sessionId');
  const isInline = searchParams.get('inline') === '1';
  const stemKey = searchParams.get('stemKey');

  // Determine source URL and file metadata
  let sourceUrl: string;
  let filename: string;
  let contentType: string;

  if (sessionId && stemKey) {
    // Session-based stem lookup: server picks best task (preview MP3 preferred over final WAV).
    // Fixes client-side desync where preview task stemsUrls shows as null after polling.
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) return apiNotFound('Session not found');

    const tasks = await db.query.dialTasks.findMany({
      where: eq(dialTasks.sessionId, sessionId),
    });

    // Resolve stem URL with extension fallback:
    // Client sends WAV keys (from final_advanced stemsUrls), but preview task stores MP3 keys.
    // Try: exact match → .wav→.mp3 swap → base-name match (strips extension from both sides).
    const resolveUrl = (t: typeof tasks[0]): string | null => {
      const stems = t.stemsUrls as Record<string, string> | null;
      if (!stems) return null;
      if (stems[stemKey]) return stems[stemKey];
      const mp3Key = stemKey.replace(/\.wav$/i, '.mp3');
      if (mp3Key !== stemKey && stems[mp3Key]) return stems[mp3Key];
      const base = stemKey.replace(/\.[^.]+$/, '').toLowerCase();
      const matched = Object.keys(stems).find((k) => k.replace(/\.[^.]+$/, '').toLowerCase() === base);
      return matched ? stems[matched] : null;
    };
    const stemTask =
      tasks.find((t) => t.taskType === 'preview' && !!resolveUrl(t)) ??
      tasks.find((t) => !!resolveUrl(t));

    if (!stemTask) return apiNotFound(`Stem "${stemKey}" not found in session`);
    const resolvedUrl = resolveUrl(stemTask)!;
    sourceUrl = resolvedUrl;
    filename = `MUEDial_stem_${stemKey}_${sessionId.slice(0, 8)}.${stemTask.taskType === 'preview' ? 'mp3' : 'wav'}`;
    contentType = stemTask.taskType === 'preview' ? 'audio/mpeg' : 'audio/wav';
  } else {
    // Existing taskId-based flow
    if (!taskId) return apiValidationError('taskId or (sessionId + stemKey) is required');

    const result = await verifyDialTaskOwnership(taskId, auth);
    if (!result) return apiNotFound('Task not found');
    const { task } = result;

    if (stemKey) {
      // Proxy an individual stem — bypasses GCS CORS restriction (same issue as main audio, PR#156)
      const stems = task.stemsUrls as Record<string, string> | null;
      const url = stems?.[stemKey];
      if (!url) return apiNotFound(`Stem "${stemKey}" not found for this task`);
      sourceUrl = url;
      filename = `MUEDial_stem_${stemKey}_${taskId.slice(0, 8)}.wav`;
      contentType = 'audio/wav';
    } else {
      // Priority: r2FinalUrl > finalUrl > previewUrl
      const isPreview = !task.finalUrl && !!task.previewUrl;
      const url = task.r2FinalUrl || task.finalUrl || task.previewUrl;
      if (!url) return apiNotFound('No download available for this task');
      sourceUrl = url;
      const taskLabelMap: Record<string, string> = {
        mastering: 'mastered',
        mastering_preview: 'master-preview',
        mix_check: 'mix-check',
        final_advanced: 'final-mix',
        final_basic: 'final-mix',
        preview: 'preview',
      };
      const taskLabel = taskLabelMap[task.taskType] || 'mix';
      const ext = isPreview ? 'mp3' : 'wav';
      filename = `MUEDial_${taskLabel}_${taskId.slice(0, 8)}.${ext}`;
      contentType = isPreview ? 'audio/mpeg' : 'audio/wav';
    }
  }

  try {
    // Forward Range header for audio seeking (inline mode)
    const rangeHeader = auth.request.headers.get('Range');
    const fetchOpts: RequestInit = rangeHeader ? { headers: { Range: rangeHeader } } : {};

    const sourceRes = await fetch(sourceUrl, fetchOpts);
    if (!sourceRes.body) {
      return apiServerError(`Source file fetch failed (${sourceRes.status})`);
    }

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', sourceRes.headers.get('Content-Type') || contentType);
    resHeaders.set(
      'Content-Disposition',
      isInline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
    );
    if (sourceRes.headers.get('Content-Length')) {
      resHeaders.set('Content-Length', sourceRes.headers.get('Content-Length')!);
    }
    resHeaders.set('Cache-Control', 'private, no-cache');

    // Passthrough range response headers for seek support
    const acceptRanges = sourceRes.headers.get('Accept-Ranges');
    if (acceptRanges) resHeaders.set('Accept-Ranges', acceptRanges);
    const contentRange = sourceRes.headers.get('Content-Range');
    if (contentRange) resHeaders.set('Content-Range', contentRange);

    return new NextResponse(sourceRes.body, { status: sourceRes.status, headers: resHeaders });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Download failed');
  }
});
