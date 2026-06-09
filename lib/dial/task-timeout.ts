/**
 * MUEDial task backstop + failure-reconcile helpers.
 *
 * Background: the RoEx poll routes detected completion ONLY by result-URL presence,
 * so a failed/never-returning task stuck `dial_tasks` at `status='processing'` forever
 * (infinite "処理中" spinner). The FIRST fix used a short fixed timeout (3/10 min) —
 * but production data shows normal previews take 8–22 min (final up to ~34 min), so a
 * short timeout false-fails healthy jobs (worse than the bug).
 *
 * Correct design (zero-false-fail priority):
 *   - PRIMARY hang protection = RoEx HTTP comm-timeout (lib/roex/client.ts) + explicit
 *     failure detection (lib/roex/mixing|mastering parse).
 *   - LAST-RESORT wall-clock backstop = these GENEROUS per-type thresholds, far above
 *     the observed max, applied by both the GET poll routes (open tab) and the cron
 *     reconciler (closed tab / very-long jobs).
 *   - markDialTaskFailedWithReconcile is the single source of truth for the failure
 *     write: race-safe (never clobbers a completed task), reconciles session.status so
 *     the dashboard isn't stuck on an active dot, and restores a falsely-consumed
 *     omakase preview slot.
 */
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks, dialSessions } from '@/db/schema';

/**
 * Generous per-task-type wall-clock backstops (ms), from the production completion
 * distribution: preview max 19.0min / final_advanced max 33.9min / mastering_preview
 * max 15.2min. Set FAR above observed max so a slow-but-healthy job is NEVER failed by
 * mistake — these only catch a genuinely stuck/abandoned task.
 */
export const DIAL_BACKSTOP_MS: Record<string, number> = {
  preview: 45 * 60_000,        // max 19min  → ~2.4x
  mix_check: 30 * 60_000,      // max 2.3min → huge margin
  final_basic: 75 * 60_000,    // final max 33.9min → ~2.2x
  final_advanced: 75 * 60_000,
  mastering_preview: 40 * 60_000, // max 15.2min → ~2.6x
  mastering: 30 * 60_000,      // near-instant, but generous
};
const DEFAULT_BACKSTOP_MS = 75 * 60_000;

/** The wall-clock backstop (ms) for a given task type. */
export function getDialBackstopMs(taskType: string): number {
  return DIAL_BACKSTOP_MS[taskType] ?? DEFAULT_BACKSTOP_MS;
}

/** True when a task created at `createdAt` has been processing past its generous backstop. */
export function isDialTaskPastBackstop(
  createdAt: Date | string,
  taskType: string,
  now: number = Date.now(),
): boolean {
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return now - created > getDialBackstopMs(taskType);
}

export type DialSessionStatus = 'uploading' | 'previewing' | 'mixing' | 'mastering' | 'completed' | 'archived';

export interface ReconcileSiblingTask {
  taskType: string;
  status: string;
  hasFinal: boolean;
}

/**
 * Pure: when a task of `failedType` fails, pick the stable session.status that (a) does
 * NOT leave the dashboard on a perpetual active ("mixing"/"mastering") dot and (b) never
 * downgrades an existing completed deliverable. The caller still guards against writing
 * over an already-`completed` session.
 */
export function deriveRevertSessionStatus(
  failedType: string,
  siblings: ReconcileSiblingTask[],
): DialSessionStatus {
  const hasCompletedFinal = siblings.some(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.status === 'completed' && t.hasFinal,
  );
  const hasCompletedPreview = siblings.some((t) => t.taskType === 'preview' && t.status === 'completed');

  switch (failedType) {
    case 'preview':
      return hasCompletedPreview ? 'previewing' : 'uploading';
    case 'mix_check':
    case 'final_basic':
    case 'final_advanced':
      return 'previewing';
    case 'mastering_preview':
    case 'mastering':
      // The mix deliverable is intact even if mastering failed → keep it completed.
      return hasCompletedFinal ? 'completed' : (hasCompletedPreview ? 'previewing' : 'uploading');
    default:
      return hasCompletedPreview ? 'previewing' : 'uploading';
  }
}

/**
 * Mark a task failed + reconcile the session + restore previewCount — the single source
 * of truth for the failure write. Returns `{ failed }`.
 *
 * Race-safe: the `status <> 'completed'` guard means the failure write only "wins" if the
 * task was still non-completed. If a webhook/poll completed it first, the update flips 0
 * rows → we return `{ failed: false }` and touch NEITHER the session NOR previewCount
 * (so a delivered result is never reverted and a slot is never wrongly refunded).
 */
export async function markDialTaskFailedWithReconcile(
  taskId: string,
  reason?: string,
): Promise<{ failed: boolean }> {
  const flipped = await db
    .update(dialTasks)
    .set({ status: 'failed' })
    .where(and(eq(dialTasks.id, taskId), ne(dialTasks.status, 'completed')))
    .returning({ id: dialTasks.id, taskType: dialTasks.taskType, sessionId: dialTasks.sessionId });

  if (flipped.length === 0) return { failed: false };

  const { taskType, sessionId } = flipped[0];
  console.warn(`[dial] task ${taskId} (${taskType}) marked failed${reason ? `: ${reason}` : ''}`);

  const session = await db.query.dialSessions.findFirst({ where: eq(dialSessions.id, sessionId) });
  if (!session) return { failed: true };

  const siblings = await db.query.dialTasks.findMany({ where: eq(dialTasks.sessionId, sessionId) });
  const revert = deriveRevertSessionStatus(
    taskType,
    siblings.map((t) => ({ taskType: t.taskType, status: t.status, hasFinal: !!t.finalUrl })),
  );

  const sessionUpdate: Record<string, unknown> = { updatedAt: new Date() };
  // Never downgrade an already-delivered (completed) session.
  if (session.status !== 'completed' && session.status !== revert) {
    sessionUpdate.status = revert;
  }
  // Restore an omakase preview slot consumed at submit — a false fail must not burn the
  // max-5 budget. GREATEST floors at 0.
  if (taskType === 'preview' && session.mode === 'omakase') {
    sessionUpdate.previewCount = sql`GREATEST(${dialSessions.previewCount} - 1, 0)`;
  }

  await db.update(dialSessions).set(sessionUpdate).where(eq(dialSessions.id, sessionId));
  return { failed: true };
}
