/**
 * R5a — un-remedied charge-failure detection (守り#1 "swallowed failures" last piece).
 *
 * Verifies the conductor's required properties:
 *  - 形態② (alert) fires ONLY for a recent failed PAID task on a NOT-yet-comped session — and
 *    NOT for: a comped session (dedup), an old failure (recency), or a failed FREE task.
 *  - 形態① (counterMismatch) is computed but is log-only (the report keeps it separate from alerts).
 *  - The detector is pure: it never grants/refunds (money logic unchanged) — it only classifies.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyChargeFailure,
  buildChargeFailureReport,
  CHARGE_FAILURE_RECENCY_MS,
  PAID_TASK_TYPES,
  type DetectionSession,
} from '@/lib/dial/charge-failure-detection';

const NOW = 1_700_000_000_000;
const recent = (msAgo: number) => new Date(NOW - msAgo);
const DAY = 24 * 60 * 60 * 1000;

function session(over: Partial<DetectionSession> = {}): DetectionSession {
  return { id: 's1', paidCycleCount: 1, hasComp: false, tasks: [], ...over };
}

describe('classifyChargeFailure — 形態② alert', () => {
  it('alerts on a recent failed PAID task when the session is not comped', () => {
    const c = classifyChargeFailure(
      session({ tasks: [{ taskType: 'final_advanced', status: 'failed', createdAt: recent(2 * DAY) }] }),
      NOW,
    );
    expect(c.alert).toBe(true);
    expect(c.recentFailedPaidTaskTypes).toEqual(['final_advanced']);
  });

  it('does NOT alert a comped session (dedup via existing dial_comp_ledger state)', () => {
    const c = classifyChargeFailure(
      session({ hasComp: true, tasks: [{ taskType: 'mastering', status: 'failed', createdAt: recent(1 * DAY) }] }),
      NOW,
    );
    expect(c.alert).toBe(false);
  });

  it('does NOT alert a failure older than the recency window (no perpetual daily spam)', () => {
    const c = classifyChargeFailure(
      session({ tasks: [{ taskType: 'final_basic', status: 'failed', createdAt: new Date(NOW - CHARGE_FAILURE_RECENCY_MS - DAY) }] }),
      NOW,
    );
    expect(c.alert).toBe(false);
    expect(c.recentFailedPaidTaskTypes).toEqual([]);
  });

  it('does NOT alert a failed FREE task (preview / mastering_preview are 0cr — no cycle to lose)', () => {
    const c = classifyChargeFailure(
      session({
        paidCycleCount: 0,
        tasks: [
          { taskType: 'preview', status: 'failed', createdAt: recent(1 * DAY) },
          { taskType: 'mastering_preview', status: 'failed', createdAt: recent(1 * DAY) },
        ],
      }),
      NOW,
    );
    expect(c.alert).toBe(false);
  });

  it('does NOT alert a healthy completed paid session', () => {
    const c = classifyChargeFailure(
      session({ paidCycleCount: 1, tasks: [{ taskType: 'final_advanced', status: 'completed', createdAt: recent(1 * DAY) }] }),
      NOW,
    );
    expect(c.alert).toBe(false);
    expect(c.counterMismatch).toBe(false);
  });

  it('treats every paid task type as cycle-bearing', () => {
    for (const tt of PAID_TASK_TYPES) {
      const c = classifyChargeFailure(
        session({ tasks: [{ taskType: tt, status: 'failed', createdAt: recent(1 * DAY) }] }),
        NOW,
      );
      expect(c.alert).toBe(true);
    }
  });
});

describe('classifyChargeFailure — 形態① counterMismatch (log-only heuristic)', () => {
  it('flags a reserve-with-no-task (paidCycleCount > paid task rows)', () => {
    // submit threw before the task insert → cycle consumed, no task row.
    const c = classifyChargeFailure(session({ paidCycleCount: 2, tasks: [{ taskType: 'final_advanced', status: 'completed', createdAt: recent(1 * DAY) }] }), NOW);
    expect(c.counterMismatch).toBe(true);
    expect(c.paidTaskCount).toBe(1);
    expect(c.paidCycleCount).toBe(2);
  });

  it('no mismatch when cycles equal paid task rows', () => {
    const c = classifyChargeFailure(
      session({ paidCycleCount: 2, tasks: [
        { taskType: 'mix_check', status: 'completed', createdAt: recent(2 * DAY) },
        { taskType: 'final_advanced', status: 'completed', createdAt: recent(1 * DAY) },
      ] }),
      NOW,
    );
    expect(c.counterMismatch).toBe(false);
  });
});

describe('buildChargeFailureReport — partitions alerts (②) vs log-only mismatches (①)', () => {
  it('separates the two shapes and counts examined', () => {
    const classifications = [
      classifyChargeFailure(session({ id: 'a', tasks: [{ taskType: 'final_advanced', status: 'failed', createdAt: recent(1 * DAY) }] }), NOW), // alert only
      classifyChargeFailure(session({ id: 'b', paidCycleCount: 3, tasks: [{ taskType: 'mix_check', status: 'completed', createdAt: recent(1 * DAY) }] }), NOW), // mismatch only
      classifyChargeFailure(session({ id: 'c', tasks: [{ taskType: 'final_basic', status: 'completed', createdAt: recent(1 * DAY) }] }), NOW), // neither
    ];
    const report = buildChargeFailureReport(classifications);
    expect(report.examined).toBe(3);
    expect(report.alerts.map((a) => a.sessionId)).toEqual(['a']);
    expect(report.counterMismatches.map((m) => m.sessionId)).toEqual(['b']);
  });

  it('an empty batch yields an empty report (the cron stays quiet — no spam)', () => {
    const report = buildChargeFailureReport([]);
    expect(report.alerts).toEqual([]);
    expect(report.counterMismatches).toEqual([]);
    expect(report.examined).toBe(0);
  });
});
