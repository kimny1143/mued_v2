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
import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { dialTasks } from '@/db/schema';
import { isDialTaskPastBackstop, markDialTaskFailedWithReconcile } from '@/lib/dial/task-timeout';

export const maxDuration = 120;

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
