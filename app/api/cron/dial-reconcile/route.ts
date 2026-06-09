/**
 * MUEDial reconcile cron — the durable backstop for the "stuck processing" problem.
 *
 * Two jobs:
 *  1. STUCK-TASK RECONCILE: any task still 'processing'/'pending' past its GENEROUS
 *     per-type wall-clock backstop (DIAL_BACKSTOP_MS — far above the observed max) is
 *     failed via markDialTaskFailedWithReconcile. This catches what the open-tab client
 *     poll cannot: a closed tab (no poll running) or a genuinely-stuck/abandoned job.
 *  2. ① PAID-INCOMPLETE ANOMALY FLAG: a paid session idle past the threshold with no
 *     download is recorded once as 'paid_session_incomplete' so support can proactively
 *     reach "paid but never got the deliverable" users before they complain.
 *
 * Auth: Bearer ${CRON_SECRET} (same pattern as cron/rag-metrics). Dev GET for manual run.
 * Schedule: see vercel.json.
 */
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks, dialSessions, dialTrialEvents } from '@/db/schema';
import { isDialTaskPastBackstop, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';
import { recordDialEvent } from '@/lib/analytics/dial-events';

export const maxDuration = 120;

/**
 * A paid session idle this long with no download is flagged as an anomaly. Set above the
 * longest normal render (final max ~34min) + margin so a still-processing job is never
 * flagged as incomplete just for taking a while.
 */
const PAID_INCOMPLETE_THRESHOLD_MIN = 60;

async function runReconcile() {
  // ── 1. Stuck-task reconcile ────────────────────────────────────────────────
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

  // ── 2. ① Paid-incomplete anomaly flag ──────────────────────────────────────
  const cutoff = new Date(Date.now() - PAID_INCOMPLETE_THRESHOLD_MIN * 60_000);
  const paidIdle = await db
    .select({
      id: dialSessions.id,
      userId: dialSessions.userId,
      mode: dialSessions.mode,
      status: dialSessions.status,
    })
    .from(dialSessions)
    .where(and(eq(dialSessions.paymentStatus, 'paid'), lt(dialSessions.updatedAt, cutoff)));

  let flaggedCount = 0;
  if (paidIdle.length > 0) {
    const ids = paidIdle.map((s) => s.id);
    // Skip sessions that already downloaded OR were already flagged (idempotent).
    const seen = await db
      .selectDistinct({ sessionId: dialTrialEvents.sessionId })
      .from(dialTrialEvents)
      .where(and(
        inArray(dialTrialEvents.sessionId, ids),
        inArray(dialTrialEvents.eventType, ['download_clicked', 'paid_session_incomplete']),
      ));
    const seenSet = new Set(seen.map((r) => r.sessionId));
    for (const s of paidIdle) {
      if (seenSet.has(s.id)) continue;
      recordDialEvent({
        sessionId: s.id,
        eventType: 'paid_session_incomplete',
        userId: s.userId ?? null,
        guestToken: null,
        mode: s.mode ?? null,
        metadata: { sessionStatus: s.status, thresholdMin: PAID_INCOMPLETE_THRESHOLD_MIN },
      });
      flaggedCount++;
    }
  }

  return {
    activeChecked: active.length,
    failedCount,
    paidIdleChecked: paidIdle.length,
    flaggedCount,
  };
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
    console.log('[cron/dial-reconcile]', JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
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
  return NextResponse.json({ ok: true, dev: true, ...result });
}
