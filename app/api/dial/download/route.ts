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

  // Build a meaningful filename
  const taskLabel = task.taskType === 'mastering' ? 'mastered'
    : task.taskType === 'mix_check' ? 'mix-check'
    : 'final-mix';
  const filename = `MUEDial_${taskLabel}_${taskId.slice(0, 8)}.wav`;

  // Prefer R2 (permanent), fall back to GCS (signed, may expire)
  // r2FinalUrl is already a /download/ URL from copyToR2() — redirect directly
  if (task.r2FinalUrl) {
    return NextResponse.redirect(task.r2FinalUrl, 302);
  }

  // Fallback: stream through our server (GCS or any direct URL)
  const sourceUrl = task.finalUrl;
  if (!sourceUrl) {
    return apiNotFound('No download available for this task');
  }

  try {
    const sourceRes = await fetch(sourceUrl);
    if (!sourceRes.ok || !sourceRes.body) {
      return apiServerError(`Source file fetch failed (${sourceRes.status})`);
    }

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', sourceRes.headers.get('Content-Type') || 'audio/wav');
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
