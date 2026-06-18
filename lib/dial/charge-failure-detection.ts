/**
 * R5a — detect un-remedied charge failures (守り#1 "swallowed failures", last piece).
 *
 * When a paid charge fails AFTER its cycle was reserved, the cycle stays consumed: final/route.ts
 * KEEPS the reserved cycle on a submit failure (refunding it could let a re-submit double-charge),
 * and markDialTaskFailedWithReconcile does NOT refund paid cycles. The only remedy is a MANUAL
 * admin comp (lib/dial/comp.ts grantComp). Nothing auto-surfaces the failed-with-consumed-cycle
 * state today, so an admin learns of it only via a user complaint — the last "swallowed failure".
 *
 * The dial-reconcile cron runs this detector to SURFACE such sessions. Money logic is UNCHANGED —
 * R5a only DETECTS. Whether/how to remediate (auto-comp / user-remedy / keep manual) is the R5b
 * policy decision, deferred until this detector yields real volume data (billing is hardened by
 * #438/#490, so the expected volume is near-zero — a premature auto-comp policy would be mamagoto).
 *
 * Two shapes:
 *  - 形態② (PRIMARY, alerted): a paid task (mix_check / final_basic / final_advanced / mastering)
 *    with status='failed' within the recency window, on a session with NO comp-ledger entry — a
 *    consumed cycle the user lost, not yet remedied. Dedup is built from EXISTING state (no new
 *    schema): a comped session drops off, and the recency window drops ancient un-acted failures so
 *    the daily alert never becomes per-session spam.
 *  - 形態① (HEURISTIC, log-only): paidCycleCount > number of paid task ROWS — a cycle was reserved
 *    but no task row inserted (the submit-threw-before-insert shape). Logged, NOT alerted: it can
 *    false-positive on accounting edges, so it's a signal to watch, not an actionable alert.
 */

/** Charge-bearing task types (a consumed paid cycle). preview / mastering_preview are 0cr. */
export const PAID_TASK_TYPES = ['mix_check', 'final_basic', 'final_advanced', 'mastering'] as const;

/** A failed paid task older than this is dropped from the alert (no perpetual daily admin spam). */
export const CHARGE_FAILURE_RECENCY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DetectionTask {
  taskType: string;
  status: string;
  createdAt: Date | string;
}

export interface DetectionSession {
  id: string;
  paidCycleCount: number;
  /** Whether a dial_comp_ledger entry exists for this session (= already remedied → dedup). */
  hasComp: boolean;
  tasks: DetectionTask[];
}

export interface ChargeFailureClassification {
  sessionId: string;
  /** 形態② — alertable: a recent failed paid task on a session not yet comped. */
  alert: boolean;
  recentFailedPaidTaskTypes: string[];
  /** 形態① — log-only heuristic: cycles consumed exceed paid task rows. */
  counterMismatch: boolean;
  paidCycleCount: number;
  paidTaskCount: number;
}

const toMs = (d: Date | string): number => (d instanceof Date ? d.getTime() : new Date(d).getTime());

const isPaidTask = (taskType: string): boolean =>
  (PAID_TASK_TYPES as readonly string[]).includes(taskType);

/**
 * Pure classification of one session. `alert` (形態②) fires only for a RECENT failed paid task on
 * a session with no comp (the two-part dedup). `counterMismatch` (形態①) is informational only.
 */
export function classifyChargeFailure(
  session: DetectionSession,
  now: number,
  recencyMs: number = CHARGE_FAILURE_RECENCY_MS,
): ChargeFailureClassification {
  const paidTasks = session.tasks.filter((t) => isPaidTask(t.taskType));
  const recentFailed = paidTasks.filter(
    (t) => t.status === 'failed' && now - toMs(t.createdAt) <= recencyMs,
  );
  return {
    sessionId: session.id,
    // 形態②: a recent failed paid cycle the user lost, NOT yet remedied by a comp.
    alert: recentFailed.length > 0 && !session.hasComp,
    recentFailedPaidTaskTypes: recentFailed.map((t) => t.taskType),
    // 形態①: more cycles consumed than paid task rows → a reserve with no task (log-only).
    counterMismatch: session.paidCycleCount > paidTasks.length,
    paidCycleCount: session.paidCycleCount,
    paidTaskCount: paidTasks.length,
  };
}

export interface ChargeFailureReport {
  /** 形態② — sessions to alert on (recent failed paid cycle, not comped). */
  alerts: ChargeFailureClassification[];
  /** 形態① — sessions whose consumed-cycle counter exceeds paid task rows (log-only). */
  counterMismatches: ClassificationSummary[];
  examined: number;
}

export interface ClassificationSummary {
  sessionId: string;
  paidCycleCount: number;
  paidTaskCount: number;
}

/**
 * Pure aggregation of a batch of classifications into the cron's alert digest. Split from the DB
 * orchestration so it is unit-testable: given the per-session classifications, partition them into
 * the alert list (形態②) and the log-only counter-mismatch list (形態①).
 */
export function buildChargeFailureReport(
  classifications: ChargeFailureClassification[],
): ChargeFailureReport {
  return {
    alerts: classifications.filter((c) => c.alert),
    counterMismatches: classifications
      .filter((c) => c.counterMismatch)
      .map((c) => ({ sessionId: c.sessionId, paidCycleCount: c.paidCycleCount, paidTaskCount: c.paidTaskCount })),
    examined: classifications.length,
  };
}
