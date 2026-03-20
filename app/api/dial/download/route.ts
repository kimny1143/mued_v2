/**
 * MUEDial Download API
 * GET /api/dial/download?taskId=xxx
 *
 * Streams the deliverable file through our server with Content-Disposition: attachment.
 * This avoids cross-origin issues where browser `download` attribute is ignored
 * and GCS returns inline content causing broken downloads.
 *
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
  if (!taskId) {
    return apiValidationError('taskId is required');
  }

  const result = await verifyDialTaskOwnership(taskId, auth);
  if (!result) {
    return apiNotFound('Task not found');
  }

  const { task } = result;

  // Determine source URL and file metadata
  // Priority: r2FinalUrl > finalUrl > previewUrl
  const isPreview = !task.finalUrl && !!task.previewUrl;
  const sourceUrl = task.r2FinalUrl || task.finalUrl || task.previewUrl;

  if (!sourceUrl) {
    return apiNotFound('No download available for this task');
  }

  // Build a meaningful filename
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
  const filename = `MUEDial_${taskLabel}_${taskId.slice(0, 8)}.${ext}`;
  const contentType = isPreview ? 'audio/mpeg' : 'audio/wav';

  try {
    // Stream through our server with Content-Disposition for correct filename
    const sourceRes = await fetch(sourceUrl);
    if (!sourceRes.ok || !sourceRes.body) {
      return apiServerError(`Source file fetch failed (${sourceRes.status})`);
    }

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', sourceRes.headers.get('Content-Type') || contentType);
    resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
    if (sourceRes.headers.get('Content-Length')) {
      resHeaders.set('Content-Length', sourceRes.headers.get('Content-Length')!);
    }
    resHeaders.set('Cache-Control', 'private, no-cache');

    return new NextResponse(sourceRes.body, { status: 200, headers: resHeaders });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Download failed');
  }
});
