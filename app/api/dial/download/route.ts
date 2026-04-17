/**
 * MUEDial Download / Stream API
 * GET /api/dial/download?taskId=xxx                        → Content-Disposition: attachment (download)
 * GET /api/dial/download?taskId=xxx&inline=1               → Content-Disposition: inline (audio playback)
 * GET /api/dial/download?taskId=xxx&stemKey=vocals&inline=1 → Proxy individual stem (GCS CORS bypass)
 *
 * Streams audio through our server. Solves two problems:
 * 1. GCS presigned URLs are 4000+ chars — Chrome URL safety check blocks them as audio src
 * 2. GCS bucket CORS headers can't be set (RoEx-owned bucket)
 *
 * ?inline=1 mode: forwards Range headers for seeking, passes through 206 status.
 * Prefers R2 URL (if available and not expired), falls back to GCS URL.
 */

import { NextResponse } from 'next/server';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiValidationError, apiNotFound, apiServerError } from '@/lib/api-response';

// Allow longer duration for large WAV file streaming
export const maxDuration = 120;

export const GET = withDialAuth(async (auth) => {
  const { searchParams } = new URL(auth.request.url);
  const taskId = searchParams.get('taskId');
  const isInline = searchParams.get('inline') === '1';
  const stemKey = searchParams.get('stemKey');
  if (!taskId) {
    return apiValidationError('taskId is required');
  }

  const result = await verifyDialTaskOwnership(taskId, auth);
  if (!result) {
    return apiNotFound('Task not found');
  }

  const { task } = result;

  // Determine source URL and file metadata
  let sourceUrl: string | null | undefined;
  let filename: string;
  let contentType: string;

  if (stemKey) {
    // Proxy an individual stem — bypasses GCS CORS restriction (same issue as main audio, PR#156)
    const stems = task.stemsUrls as Record<string, string> | null;
    sourceUrl = stems?.[stemKey];
    if (!sourceUrl) return apiNotFound(`Stem "${stemKey}" not found for this task`);
    filename = `MUEDial_stem_${stemKey}_${taskId.slice(0, 8)}.wav`;
    contentType = 'audio/wav';
  } else {
    // Priority: r2FinalUrl > finalUrl > previewUrl
    const isPreview = !task.finalUrl && !!task.previewUrl;
    sourceUrl = task.r2FinalUrl || task.finalUrl || task.previewUrl;
    if (!sourceUrl) return apiNotFound('No download available for this task');
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
