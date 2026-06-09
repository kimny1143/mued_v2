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
 *
 * Expired GCS URL recovery: detects <Code>ExpiredToken</Code> in GCS 400/403 response,
 * re-polls RoEx API for fresh presigned URLs, updates DB, and retries the request once.
 * Returns 410 Gone if refresh fails.
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks, dialTracks } from '@/db/schema';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskReadAccess, verifyDialSessionReadAccess } from '@/lib/middleware/dial-ownership';
import { apiValidationError, apiNotFound, apiServerError } from '@/lib/api-response';
import { createRoExClient, pollMixPreview, pollMixFinal, pollMasterPreview } from '@/lib/roex';
import { recordDialEvent } from '@/lib/analytics/dial-events';

// Allow longer duration for large WAV file streaming
export const maxDuration = 120;

type DialTask = typeof dialTasks.$inferSelect;

/**
 * Re-fetch fresh presigned URLs from RoEx when a GCS token expires.
 * Updates dial_tasks in DB with new URLs. Returns the new URL for the
 * specific stem/file requested, or null if refresh fails.
 */
async function refreshExpiredGcsUrl(task: DialTask, stemKey: string | null): Promise<string | null> {
  try {
    const client = createRoExClient();
    let newStemsUrls: Record<string, string> | undefined;
    let newPreviewUrl: string | undefined;
    let newFinalUrl: string | undefined;

    const type = task.taskType;

    if (type === 'preview' || type === 'mix_check') {
      const result = await pollMixPreview(client, task.roexTaskId);
      newStemsUrls = result.stemsUrl;
      newPreviewUrl = result.previewUrl;
      newFinalUrl = result.finalUrl;
    } else if (type === 'final_basic' || type === 'final_advanced') {
      const tracks = await db.query.dialTracks.findMany({
        where: eq(dialTracks.sessionId, task.sessionId),
      });
      const trackUrls = tracks.map((t) => t.roexUploadUrl).filter(Boolean);
      if (trackUrls.length < 2) return null;
      const result = await pollMixFinal(client, task.roexTaskId, trackUrls);
      newStemsUrls = result.stemsUrl;
      newFinalUrl = result.finalUrl;
    } else if (type === 'mastering_preview' || type === 'mastering') {
      const result = await pollMasterPreview(client, task.roexTaskId);
      newPreviewUrl = result.previewUrl;
      newFinalUrl = result.finalUrl;
    } else {
      return null;
    }

    // Persist fresh URLs to DB
    const updates: Record<string, unknown> = {};
    if (newStemsUrls) updates.stemsUrls = newStemsUrls;
    if (newPreviewUrl) updates.previewUrl = newPreviewUrl;
    if (newFinalUrl) updates.finalUrl = newFinalUrl;
    if (Object.keys(updates).length > 0) {
      await db.update(dialTasks).set(updates).where(eq(dialTasks.id, task.id));
    }

    // Return the URL for the specific request
    if (stemKey && newStemsUrls) {
      if (newStemsUrls[stemKey]) return newStemsUrls[stemKey];
      // Base-name fallback (same logic as main route)
      const normalizeBase = (k: string) =>
        k.replace(/\.[^.]+$/, '').replace(/_normalized$/i, '').toLowerCase();
      const base = normalizeBase(stemKey);
      const matched = Object.entries(newStemsUrls).find(([k]) => normalizeBase(k) === base);
      return matched?.[1] ?? null;
    }

    return newFinalUrl ?? newPreviewUrl ?? null;
  } catch {
    return null;
  }
}

export const GET = withDialAuth(async (auth) => {
  const { searchParams } = new URL(auth.request.url);
  const taskId = searchParams.get('taskId');
  const sessionId = searchParams.get('sessionId');
  const isInline = searchParams.get('inline') === '1';
  const stemKey = searchParams.get('stemKey');

  let sourceUrl: string;
  let filename: string;
  let contentType: string;
  let taskForRefresh: DialTask | null = null;
  let stemKeyForRefresh: string | null = stemKey;
  let viaAdmin = false; // admin read must stay zero-cost: never re-poll RoEx / mutate the user's task

  if (sessionId && stemKey) {
    // Session-based stem lookup: server picks best task (preview MP3 preferred over final WAV).
    // Fixes client-side desync where preview task stemsUrls shows as null after polling.
    const access = await verifyDialSessionReadAccess(sessionId, auth, 'listen');
    if (!access) return apiNotFound('Session not found');
    viaAdmin = access.viaAdmin;

    const tasks = await db.query.dialTasks.findMany({
      where: eq(dialTasks.sessionId, sessionId),
    });

    // Resolve stem URL with extension fallback:
    // Client sends WAV keys (from final_advanced stemsUrls), but preview task stores MP3 keys
    // with a `_normalized` suffix (e.g. `001e6b6c.wav` → `001e6b6c_normalized.mp3`).
    // Try: exact match → .wav→.mp3 swap → base-name match stripping ext + _normalized both sides.
    const normalizeBase = (k: string) =>
      k.replace(/\.[^.]+$/, '').replace(/_normalized$/i, '').toLowerCase();
    const resolveUrl = (t: typeof tasks[0]): string | null => {
      const stems = t.stemsUrls as Record<string, string> | null;
      if (!stems) return null;
      if (stems[stemKey]) return stems[stemKey];
      const mp3Key = stemKey.replace(/\.wav$/i, '.mp3');
      if (mp3Key !== stemKey && stems[mp3Key]) return stems[mp3Key];
      const base = normalizeBase(stemKey);
      const matched = Object.keys(stems).find((k) => normalizeBase(k) === base);
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
    taskForRefresh = stemTask;
  } else {
    // Existing taskId-based flow
    if (!taskId) return apiValidationError('taskId or (sessionId + stemKey) is required');

    const result = await verifyDialTaskReadAccess(taskId, auth, 'listen');
    if (!result) return apiNotFound('Task not found');
    const { task } = result;
    viaAdmin = result.viaAdmin;
    taskForRefresh = task;

    if (stemKey) {
      // Proxy an individual stem — bypasses GCS CORS restriction (same issue as main audio, PR#156)
      const stems = task.stemsUrls as Record<string, string> | null;
      const url = stems?.[stemKey];
      if (!url) return apiNotFound(`Stem "${stemKey}" not found for this task`);
      sourceUrl = url;
      filename = `MUEDial_stem_${stemKey}_${taskId.slice(0, 8)}.wav`;
      contentType = 'audio/wav';
    } else {
      stemKeyForRefresh = null;
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

    let sourceRes = await fetch(sourceUrl, fetchOpts);

    // GCS returns 400 with <Code>ExpiredToken</Code> when presigned URL has expired (24-48h).
    // Re-poll RoEx for fresh URLs, update DB, and retry once.
    if (!sourceRes.ok && (sourceRes.status === 400 || sourceRes.status === 403) && taskForRefresh) {
      const bodyText = await sourceRes.text();
      if (bodyText.includes('ExpiredToken') || bodyText.includes('AccessDenied')) {
        // Admin reads stay zero-cost & non-mutating: never re-poll RoEx (refreshExpiredGcsUrl
        // calls pollMixFinal — up to 250cr — and db.update on the user's task). Expired link →
        // 410; only the owner (viaAdmin=false) triggers a refresh.
        if (viaAdmin) {
          return new NextResponse('Audio link expired. Admin view is read-only — the owner must reload the session to regenerate.', { status: 410 });
        }
        const newUrl = await refreshExpiredGcsUrl(taskForRefresh, stemKeyForRefresh);
        if (newUrl) {
          sourceRes = await fetch(newUrl, fetchOpts);
        }
        if (!newUrl || !sourceRes.ok) {
          return new NextResponse('Audio link expired. Please reload the session.', { status: 410 });
        }
      }
    }

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

    // ② Completion instrumentation — record AFTER a successful stream (a failed/expired
    // click must not mark the session complete). An actual download (attachment, not inline
    // playback) of a deliverable (final/mastering/mix_check) or its stems; not admin.
    // "download = completion". Fire-and-forget.
    const isDeliverableTask = !!taskForRefresh && (
      taskForRefresh.taskType === 'final_basic' || taskForRefresh.taskType === 'final_advanced'
      || taskForRefresh.taskType === 'mastering' || taskForRefresh.taskType === 'mix_check'
    );
    if (!isInline && !viaAdmin && taskForRefresh && isDeliverableTask) {
      recordDialEvent({
        sessionId: taskForRefresh.sessionId,
        eventType: 'download_clicked',
        userId: auth.userId,
        guestToken: auth.guestToken,
        mode: null,
        metadata: { taskId: taskForRefresh.id, taskType: taskForRefresh.taskType, stemKey: stemKeyForRefresh ?? stemKey },
      });
    }

    return new NextResponse(sourceRes.body, { status: sourceRes.status, headers: resHeaders });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Download failed');
  }
});
