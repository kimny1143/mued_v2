/**
 * MUEDial reconcile cron — the durable backstop for the "stuck processing" problem.
 *
 * Marks any task still 'processing'/'pending' past its GENEROUS per-type wall-clock
 * backstop (DIAL_BACKSTOP_MS — far above the observed max) as failed via
 * markDialTaskFailedWithReconcile. This catches what the open-tab client poll cannot:
 * a closed tab (no poll running) or a genuinely-stuck/abandoned job.
 *
 * Auth: Bearer ${CRON_SECRET} (same pattern as cron/rag-metrics). Dev GET for manual run.
 * Schedule: see vercel.json (daily on the current Vercel Free/Hobby plan — Hobby caps cron
 * at once/day; on Pro this can move to a 10-minute schedule for a tighter closed-tab backstop).
 */
import { NextRequest, NextResponse } from 'next/server';
import { and, gt, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks, dialSessions, dialCompLedger } from '@/db/schema';
import { isDialTaskPastBackstop, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';
import {
  classifyChargeFailure,
  buildChargeFailureReport,
  type DetectionTask,
} from '@/lib/dial/charge-failure-detection';

export const maxDuration = 120;

/** Bound the charge-failure scan to recently-active paid sessions (not all history). */
const CHARGE_FAILURE_SESSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function runReconcile() {
  const active = await db
    .select({ id: dialTasks.id, taskType: dialTasks.taskType, createdAt: dialTasks.createdAt })
    .from(dialTasks)
    .where(inArray(dialTasks.status, ['processing', 'pending']));

  let failedCount = 0;
  for (const t of active) {
    if (isDialTaskPastBackstop(t.createdAt, t.taskType)) {
      const { failed } = await markDialTaskFailedWithReconcile(t.id, 'cron wall-clock backstop');
      if (failed) failedCount++;
    }
  }
  return { activeChecked: active.length, failedCount };
}

/**
 * R5a: surface un-remedied charge failures (DETECT only — no grant/refund; money logic unchanged).
 * Candidate set = recently-active sessions that consumed ≥1 paid cycle (a superset of both shapes:
 * a failed paid task always implies paidCycleCount>0, since the reserve increments before submit).
 * Batched (3 queries, no N+1) and classified by the pure detector.
 */
async function detectChargeFailures(now: number = Date.now()) {
  const sessionCutoff = new Date(now - CHARGE_FAILURE_SESSION_WINDOW_MS);
  const candidates = await db
    .select({ id: dialSessions.id, paidCycleCount: dialSessions.paidCycleCount })
    .from(dialSessions)
    .where(and(gt(dialSessions.paidCycleCount, 0), gte(dialSessions.updatedAt, sessionCutoff)));
  if (candidates.length === 0) return buildChargeFailureReport([]);

  const ids = candidates.map((c) => c.id);
  const [taskRows, compedRows] = await Promise.all([
    db
      .select({
        sessionId: dialTasks.sessionId,
        taskType: dialTasks.taskType,
        status: dialTasks.status,
        createdAt: dialTasks.createdAt,
      })
      .from(dialTasks)
      .where(inArray(dialTasks.sessionId, ids)),
    db
      .select({ sessionId: dialCompLedger.sessionId })
      .from(dialCompLedger)
      .where(inArray(dialCompLedger.sessionId, ids)),
  ]);

  const compedSet = new Set(compedRows.map((c) => c.sessionId));
  const tasksBySession = new Map<string, DetectionTask[]>();
  for (const t of taskRows) {
    const arr = tasksBySession.get(t.sessionId) ?? [];
    arr.push({ taskType: t.taskType, status: t.status, createdAt: t.createdAt });
    tasksBySession.set(t.sessionId, arr);
  }

  const classifications = candidates.map((c) =>
    classifyChargeFailure(
      {
        id: c.id,
        paidCycleCount: c.paidCycleCount,
        hasComp: compedSet.has(c.id),
        tasks: tasksBySession.get(c.id) ?? [],
      },
      now,
    ),
  );
  return buildChargeFailureReport(classifications);
}

/**
 * Emit the charge-failure digest. 形態② → one structured console.error per run (a distinctive,
 * greppable tag → Vercel log drain / alert; a real push channel is a Tier3 follow-up). 形態① →
 * console.log only (heuristic, not actionable). Quiet when there is nothing to surface — no spam.
 */
function logChargeFailures(report: ReturnType<typeof buildChargeFailureReport>) {
  if (report.alerts.length > 0) {
    console.error(
      '[dial:charge-failure-alert]',
      JSON.stringify({
        count: report.alerts.length,
        sessions: report.alerts.map((a) => ({
          sessionId: a.sessionId,
          failedPaidTaskTypes: a.recentFailedPaidTaskTypes,
        })),
      }),
    );
  }
  if (report.counterMismatches.length > 0) {
    console.log('[dial:charge-cycle-mismatch]', JSON.stringify({ count: report.counterMismatches.length, sessions: report.counterMismatches }));
  }
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/dial-reconcile] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runReconcile();
    const charge = await detectChargeFailures();
    logChargeFailures(charge);
    console.log('[cron/dial-reconcile]', JSON.stringify({ ...result, chargeFailures: charge.alerts.length, counterMismatches: charge.counterMismatches.length }));
    return NextResponse.json({ ok: true, ...result, chargeFailureAlerts: charge.alerts.length, counterMismatches: charge.counterMismatches.length });
  } catch (error) {
    console.error('[cron/dial-reconcile] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'reconcile failed' },
      { status: 500 },
    );
  }
}

// Dev-only manual trigger (mirrors cron/rag-metrics).
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  const result = await runReconcile();
  const charge = await detectChargeFailures();
  logChargeFailures(charge);
  return NextResponse.json({
    ok: true,
    dev: true,
    ...result,
    chargeFailureAlerts: charge.alerts.length,
    counterMismatches: charge.counterMismatches.length,
  });
}
