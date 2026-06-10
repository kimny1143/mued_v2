/**
 * RoEx Webhook Handler
 * POST /api/webhooks/roex
 *
 * Receives completion notifications from RoEx Tonn API.
 * Updates task status in DB and copies result to R2.
 *
 * Authentication: RoEx has no webhook signing. We use two layers:
 *   1. Secret token in webhook URL query param (?secret=xxx)
 *   2. roexTaskId must exist in our dial_tasks table
 *
 * Fallback: If webhook doesn't fire, client-side polling via GET handlers
 * will still work (with 30s delay before falling back to RoEx polling).
 */

import { and, desc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dialTasks, dialSessions, dialTracks } from '@/db/schema';
import { copyToR2 } from '@/lib/dial/r2-storage';
import { createRoExClient, pollMixPreview, pollMixFinal, pollMasterPreview, masterFinal } from '@/lib/roex';
import { resolveTrackUrl } from '@/lib/dial/resolve-track-url';
import { markDialTaskFailedWithReconcile, isUnchargedMasteringReservation } from '@/lib/dial/task-timeout';

// Allow up to 120s for R2 copy
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    // ── Verify webhook secret token ────────────────────────────────────
    const expectedSecret = process.env.ROEX_WEBHOOK_SECRET;
    if (expectedSecret) {
      const url = new URL(request.url);
      const secret = url.searchParams.get('secret');
      if (secret !== expectedSecret) {
        console.warn('[webhook/roex] Invalid or missing webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[webhook/roex] CRITICAL: ROEX_WEBHOOK_SECRET not configured in production — webhook authentication is DISABLED');
    }

    const body = await request.json();

    // RoEx webhook payload shape is not fully documented.
    // Extract taskId from known fields — try multiple possible field names.
    const roexTaskId =
      (body.multitrack_task_id as string) ??
      (body.mastering_task_id as string) ??
      (body.taskId as string) ??
      (body.task_id as string);

    if (!roexTaskId) {
      // Log the full payload for debugging (first deploy)
      console.warn('[webhook/roex] No taskId found in payload:', JSON.stringify(body).slice(0, 500));
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log(`[webhook/roex] Received callback for taskId: ${roexTaskId}`);

    // Find the most recent non-completed task by roexTaskId.
    // Multiple tasks (e.g. Mix Check 1 + 2) can share the same roexTaskId because
    // both use the preview task's RoEx ID. Prefer processing tasks over completed ones
    // so repeated mix checks don't get ignored after the first completes.
    // Only ACTIVE tasks — never resurrect a terminal one. Excluding 'failed' (not just
    // 'completed') is the reverse-direction guard: a late RoEx webhook must not flip a
    // backstop/cron-failed task back to 'completed'.
    const task = await db.query.dialTasks.findFirst({
      where: and(
        eq(dialTasks.roexTaskId, roexTaskId),
        inArray(dialTasks.status, ['processing', 'pending']),
      ),
      orderBy: [desc(dialTasks.createdAt)],
    });

    if (!task) {
      // All tasks for this roexTaskId are already completed, or no tasks exist.
      console.warn(`[webhook/roex] No active task for roexTaskId: ${roexTaskId} (may already be completed)`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Already completed — idempotent, skip
    if (task.status === 'completed') {
      return NextResponse.json({ received: true, already: 'completed' }, { status: 200 });
    }

    // ─── Fetch result from RoEx based on task type ──────────────────────────

    const client = createRoExClient();
    let resultUrl: string | undefined;
    let stemsUrl: Record<string, string> | undefined;
    let fxSettings: Record<string, unknown> | undefined;
    let roexFailed = false;

    if (task.taskType === 'preview') {
      const result = await pollMixPreview(client, roexTaskId, { retrieveFxSettings: false });
      resultUrl = result.previewUrl;
      stemsUrl = result.stemsUrl;
      fxSettings = result.fxSettings as Record<string, unknown> | undefined;
      roexFailed = result.status === 'failed';
    } else if (task.taskType === 'mastering_preview') {
      const result = await pollMasterPreview(client, roexTaskId);
      resultUrl = result.previewUrl;
      roexFailed = result.status === 'failed';
    } else if (task.taskType === 'mastering') {
      if (task.finalUrl) {
        // Already retrieved via POST handler — skip to avoid double 220cr charge
        resultUrl = task.finalUrl;
      } else if (!isUnchargedMasteringReservation(task)) {
        const result = await masterFinal(client, task.roexTaskId, { poll: true });
        resultUrl = result.finalUrl;
        roexFailed = result.status === 'failed';
      }
      // else: reserved-but-not-yet-charged → leave processing; the POST handler owns the
      // single charge.
    } else {
      // Mix final (final_basic, final_advanced, mix_check)
      const tracks = await db.query.dialTracks.findMany({
        where: eq(dialTracks.sessionId, task.sessionId),
      });
      const trackUrls = tracks.map((t) => resolveTrackUrl(t) ?? t.roexUploadUrl);
      // Free campaign: poll must not re-request the (+50cr) stems the free submit skipped.
      const whSession = await db.query.dialSessions.findFirst({
        where: eq(dialSessions.id, task.sessionId),
      });
      const result = await pollMixFinal(client, roexTaskId, trackUrls, {
        returnStems: !whSession?.isFreeCampaign,
      });
      resultUrl = result.finalUrl;
      stemsUrl = result.stemsUrl;
      fxSettings = result.fxSettings as Record<string, unknown> | undefined;
      roexFailed = result.status === 'failed';
    }

    // Explicit RoEx failure → mark the task failed so the UI stops spinning.
    // This is distinct from "not_ready" below: RoEx can fire the webhook BEFORE the
    // result exists (no URL, no error) — that is still processing, NOT a failure.
    if (roexFailed && !resultUrl) {
      await markDialTaskFailedWithReconcile(task.id, 'RoEx webhook reported task failure');
      return NextResponse.json({ received: true, status: 'failed' }, { status: 200 });
    }

    if (!resultUrl) {
      // Not ready yet — RoEx may send webhook before processing completes
      console.log(`[webhook/roex] Task ${roexTaskId} not ready yet, will rely on polling`);
      return NextResponse.json({ received: true, status: 'not_ready' }, { status: 200 });
    }

    // ─── Update task in DB ──────────────────────────────────────────────────

    const isPreviewType = task.taskType === 'preview' || task.taskType === 'mastering_preview';
    const urlField = isPreviewType ? 'previewUrl' : 'finalUrl';

    await db.update(dialTasks).set({
      status: 'completed',
      [urlField]: resultUrl,
      ...(stemsUrl ? { stemsUrls: stemsUrl } : {}),
      ...(fxSettings ? { fxSettings } : {}),
      completedAt: new Date(),
    }).where(eq(dialTasks.id, task.id));

    // ─── R2 copy for final deliverables ─────────────────────────────────────

    if (!isPreviewType && resultUrl) {
      try {
        const r2Result = await copyToR2({
          sourceUrl: resultUrl,
          sessionId: task.sessionId,
          taskId: task.id,
          taskType: task.taskType,
        });
        if (r2Result) {
          await db.update(dialTasks).set({
            r2FinalUrl: r2Result.r2Url,
            r2ExpiresAt: r2Result.expiresAt,
          }).where(eq(dialTasks.id, task.id));
        }
      } catch (err) {
        console.error('[webhook/roex] R2 copy failed:', err);
      }
    }

    // ─── Update session status ──────────────────────────────────────────────

    const session = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, task.sessionId),
    });

    if (session) {
      type SessionStatus = 'uploading' | 'previewing' | 'mixing' | 'mastering' | 'completed' | 'archived';
      let newStatus: SessionStatus | undefined;
      if (task.taskType === 'preview') {
        newStatus = 'previewing';
      } else if (task.taskType === 'mastering_preview') {
        newStatus = 'mastering';
      } else if (task.taskType === 'mastering') {
        newStatus = 'completed';
      } else if (task.taskType === 'mix_check') {
        newStatus = 'mixing';
      } else {
        // final_basic, final_advanced
        newStatus = session.masteringMode ? 'mastering' : 'completed';
      }

      if (newStatus) {
        await db.update(dialSessions).set({
          status: newStatus,
          updatedAt: new Date(),
        }).where(eq(dialSessions.id, task.sessionId));
      }
    }

    console.log(`[webhook/roex] Task ${roexTaskId} completed successfully`);
    return NextResponse.json({ received: true, status: 'completed' }, { status: 200 });
  } catch (error) {
    console.error('[webhook/roex] Error processing webhook:', error);
    // Return 200 to prevent RoEx from retrying (if they support retries)
    return NextResponse.json({ received: true, error: 'processing_failed' }, { status: 200 });
  }
}
