/**
 * MUEDial Download API
 * GET /api/dial/download?taskId=xxx
 *
 * Provides stable download links for completed deliverables.
 * Prefers R2 URL (if available and not expired), falls back to GCS URL.
 */

import { NextResponse } from 'next/server';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiValidationError, apiNotFound } from '@/lib/api-response';

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

  // Prefer R2 URL if available and not expired
  if (task.r2FinalUrl && task.r2ExpiresAt && new Date(task.r2ExpiresAt) > new Date()) {
    return NextResponse.redirect(task.r2FinalUrl, 302);
  }

  // Fallback to GCS URL
  if (task.finalUrl) {
    return NextResponse.redirect(task.finalUrl, 302);
  }

  return apiNotFound('No download available for this task');
});
