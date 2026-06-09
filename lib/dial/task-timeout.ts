/**
 * MUEDial task backstop + failure-reconcile helpers.
 *
 * Background: the RoEx poll routes detected completion ONLY by result-URL presence, so a
 * failed/never-returning task stuck `dial_tasks` at `status='processing'` forever. A first
 * fix used a short fixed timeout (3/10min) which production data killed — normal previews
 * take 8–22 min. Correct design (zero-false-fail priority):
 *   - PRIMARY hang protection = RoEx HTTP comm-timeout on POLL calls (lib/roex/client.ts;
 *     NOT on submit/charge calls — a false abort there would risk a re-charge) + explicit
 *     failure detection (parse).
 *   - LAST-RESORT wall-clock backstop = these GENEROUS per-type thresholds, applied by the
 *     GET routes (open tab, backstop-before-poll) and the daily cron (closed tab).
 *   - markDialTaskFailedWithReconcile = the single race-safe failure write.
 */
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks, dialSessions } from '@/db/schema';

/**
 * Per-task-type wall-clock backstops (ms). SINGLE authoritative source: the production
 * completion distribution (kimny prod SELECT, 2026-06-09):
 *   preview p50 3.1 / p90 17.3 / max 19.0 ; mix_check max 2.3 ; final_basic 4.8 (n=1) ;
 *   final_advanced p50 0.1 / p90 13.6 / max 33.9 (n=7) ; mastering_preview max 15.2 ;
 *   mastering max 0.1  (minutes).
 *
 * Margins are biased LARGE on purpose — the cost is asymmetric: a too-large backstop only
 * delays the last-resort fail (low harm, the cron/next-poll still catches it); a too-small
 * one false-fails a healthy job (high harm — the exact regression we're avoiding). NOTE:
 * these are MARGINS above the observed max, NOT normal completion times.
 */
export const DIAL_BACKSTOP_MS: Record<string, number> = {
  preview: 60 * 60_000,           // max 19.0min  → 3.2×
  mix_check: 45 * 60_000,         // max 2.3min   → kept generous
  final_basic: 120 * 60_000,      // final class, max 33.9min → 3.5× (heavy 15-track margin)
  final_advanced: 120 * 60_000,   // max 33.9min (n=7) → 3.5×
  mastering_preview: 45 * 60_000, // max 15.2min  → ~3×
  mastering: 30 * 60_000,         // max 0.1min   → huge margin
};
const DEFAULT_BACKSTOP_MS = 120 * 60_000;

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
 * Pure: when a task of `failedType` fails, pick the stable session.status that (a) does NOT
 * leave the dashboard on a perpetual active ("mixing"/"mastering") dot and (b) never
 * downgrades an existing completed deliverable.
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
      return hasCompletedFinal ? 'completed' : (hasCompletedPreview ? 'previewing' : 'uploading');
    default:
      return hasCompletedPreview ? 'previewing' : 'uploading';
  }
}

/**
 * Mark a task failed + reconcile the session + restore previewCount — the single source of
 * truth for the failure write. Returns `{ failed }`.
 *
 * Race-safe / idempotent:
 *  - the task flip only matches an ACTIVE task (`status IN ('processing','pending')`), so
 *    re-running on an already-failed/completed task flips 0 rows → `{ failed:false }` and
 *    touches NOTHING (no double previewCount refund, no session revert).
 *  - the session write is guarded `WHERE status <> 'completed'`, so a concurrently-completed
 *    session is never downgraded.
 */
export async function markDialTaskFailedWithReconcile(
  taskId: string,
  reason?: string,
): Promise<{ failed: boolean }> {
  const flipped = await db
    .update(dialTasks)
    .set({ status: 'failed' })
    .where(and(eq(dialTasks.id, taskId), inArray(dialTasks.status, ['processing', 'pending'])))
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
  if (session.status !== revert) sessionUpdate.status = revert;
  // Restore an omakase preview slot consumed at submit — a false fail must not burn the
  // max-5 budget. GREATEST floors at 0.
  if (taskType === 'preview' && session.mode === 'omakase') {
    sessionUpdate.previewCount = sql`GREATEST(${dialSessions.previewCount} - 1, 0)`;
  }

  // Guard the write so a concurrently-completed session is never reverted/downgraded.
  await db
    .update(dialSessions)
    .set(sessionUpdate)
    .where(and(eq(dialSessions.id, sessionId), ne(dialSessions.status, 'completed')));
  return { failed: true };
}
