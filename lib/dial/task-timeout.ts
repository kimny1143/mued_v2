/**
 * MUEDial task timeout + failure helpers.
 *
 * Background: the RoEx poll routes detected completion ONLY by the presence of a
 * result URL. A RoEx task that fails or never returns a URL would therefore leave
 * the `dial_tasks` row stuck at `status='processing'` forever — the user sees an
 * infinite "処理中" spinner (real incident: a paid preview regen stuck ~7h while a
 * healthy preview completes in ~35s).
 *
 * These helpers provide the GUARANTEED safety net: once a still-processing task
 * passes its timeout, it is flipped to `failed` so the UI can offer a retry path
 * instead of spinning. Explicit RoEx-failure detection (see parseMixResponse /
 * parseMasteringResponse) is the faster best-effort path; the timeout is the
 * backstop that works regardless of RoEx's (undocumented) failure contract.
 */
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks } from '@/db/schema';

/**
 * Timeout (ms) for FREE renders (preview, mastering_preview), measured from
 * `dial_tasks.createdAt`. Healthy previews complete in ~35s, so 3 min is ~5x
 * headroom — a slow-but-healthy render is never failed by mistake, and a genuine
 * hang is caught quickly (free retries are cheap, so a tighter bound is safe).
 */
export const DIAL_FREE_PREVIEW_TIMEOUT_MS = 3 * 60_000;

/**
 * Timeout (ms) for PAID renders (final_basic, final_advanced, mix_check,
 * mastering). These hit RoEx's heavier /applyaudioeffects / /retrievefinalmaster
 * endpoints (the final route documents 60s+ runtimes). 10 min gives a wide margin
 * — a false-positive timeout on a paid task is worse than on a free one — while
 * still bounding a truly-stuck task.
 */
export const DIAL_PAID_RENDER_TIMEOUT_MS = 10 * 60_000;

/** Task types whose render is free (preview-class). Everything else is a paid render. */
const FREE_TASK_TYPES: ReadonlySet<string> = new Set(['preview', 'mastering_preview']);

/** The processing timeout (ms) for a given task type. */
export function getDialTaskTimeoutMs(taskType: string): number {
  return FREE_TASK_TYPES.has(taskType)
    ? DIAL_FREE_PREVIEW_TIMEOUT_MS
    : DIAL_PAID_RENDER_TIMEOUT_MS;
}

/**
 * True when a task created at `createdAt` has been processing past its timeout.
 * Pure function — `now` is injectable for testing.
 */
export function isDialTaskTimedOut(
  createdAt: Date | string,
  taskType: string,
  now: number = Date.now(),
): boolean {
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return now - created > getDialTaskTimeoutMs(taskType);
}

/**
 * Mark a task as failed — the single source of truth for the failure write.
 *
 * Race-safe / idempotent: the `status <> 'completed'` guard guarantees a late
 * failure signal (e.g. a delayed poll or webhook) can never overwrite a task that
 * was already delivered. `reason` is logged for post-deploy observability (there
 * is no error column on dial_tasks).
 */
export async function markDialTaskFailed(taskId: string, reason?: string): Promise<void> {
  const updated = await db
    .update(dialTasks)
    .set({ status: 'failed' })
    .where(and(eq(dialTasks.id, taskId), ne(dialTasks.status, 'completed')))
    .returning({ id: dialTasks.id });

  if (updated.length > 0) {
    console.warn(`[dial] task ${taskId} marked failed${reason ? `: ${reason}` : ''}`);
  }
}
