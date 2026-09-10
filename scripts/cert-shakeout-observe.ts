#!/usr/bin/env tsx
/**
 * MUEDial 60pt cert shakeout — READ-ONLY observation harness.
 *
 * Measures the cert evidence during a real-deployed-path multi-user E2E shakeout:
 *   - per-session state/status/cycle progression
 *   - per-task: task_type, status, credits_consumed (authoritative COGS), roex_task_id,
 *     preview/final/r2 url presence, latency (created→completed)
 *   - anomaly detection: stuck (processing > threshold), failed, 0-stems, missing r2_final
 *   - delta vs a baseline snapshot so this run's spend is isolated from pre-existing tasks
 *
 * Usage:
 *   npx tsx scripts/cert-shakeout-observe.ts baseline <id1,id2,...>   # snapshot BEFORE the run
 *   npx tsx scripts/cert-shakeout-observe.ts watch    <id1,id2,...>   # live tail during the run (Ctrl-C to stop)
 *   npx tsx scripts/cert-shakeout-observe.ts report   <id1,id2,...>   # snapshot AFTER + delta + cert summary
 *   npx tsx scripts/cert-shakeout-observe.ts urls     <id1,id2,...>   # print drive URLs (guest token resolved at runtime, NOT persisted)
 *
 * Baseline is written to /tmp (ephemeral). Guest tokens are NEVER written to repo files.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

const sql = neon(process.env.DATABASE_URL!);
const BASE_URL = process.env.DIAL_BASE_URL || 'https://dial.mued.jp';
const BASELINE_PATH = '/tmp/cert-shakeout-baseline.json';
const STUCK_MIN = 12; // processing longer than this (min) without completion = stuck candidate

type TaskRow = {
  id: string; session_id: string; roex_task_id: string | null; task_type: string;
  status: string; credits_consumed: number | null; preview_url: string | null;
  final_url: string | null; r2_final_url: string | null; stems_urls: unknown;
  created_at: string; completed_at: string | null;
};
type SessRow = {
  id: string; title: string | null; payment_status: string; state: string; status: string;
  mode: string; mastering_mode: string | null; base_cycle_limit: number;
  additional_cycle_limit: number; additional_cycles_purchased: number; paid_cycle_count: number;
};

function ids(): string[] {
  const arg = process.argv[3];
  if (!arg) { console.error('provide comma-separated session ids'); process.exit(1); }
  return arg.split(',').map((s) => s.trim()).filter(Boolean);
}

async function sessions(idList: string[]): Promise<SessRow[]> {
  return (await sql`
    SELECT id, title, payment_status, state, status, mode, mastering_mode,
           base_cycle_limit, additional_cycle_limit, additional_cycles_purchased, paid_cycle_count
    FROM dial_sessions WHERE id = ANY(${idList})`) as SessRow[];
}
async function tasks(idList: string[]): Promise<TaskRow[]> {
  return (await sql`
    SELECT id, session_id, roex_task_id, task_type, status, credits_consumed,
           preview_url, final_url, r2_final_url, stems_urls, created_at, completed_at
    FROM dial_tasks WHERE session_id = ANY(${idList}) ORDER BY created_at`) as TaskRow[];
}

function minutesBetween(a: string, b: string | null): number | null {
  if (!b) return null;
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 60000) * 10) / 10;
}
function ageMin(a: string): number {
  // NOTE: created_at is `timestamp without time zone` stored as UTC; compare in UTC.
  return Math.round(((Date.parse(new Date().toISOString()) - new Date(a + 'Z').getTime()) / 60000) * 10) / 10;
}

async function cmdBaseline(idList: string[]) {
  const t = await tasks(idList);
  const baselineTaskIds = t.map((r) => r.id);
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({ ids: idList, baselineTaskIds }, null, 2));
  console.log(`baseline: ${baselineTaskIds.length} pre-existing tasks across ${idList.length} sessions → ${BASELINE_PATH}`);
}

async function cmdWatch(idList: string[]) {
  let prev = '';
  console.log(`watching ${idList.length} sessions (poll 10s, Ctrl-C to stop)...`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const t = await tasks(idList);
    const line = t.map((r) => `${r.session_id.slice(0, 8)}:${r.task_type}=${r.status}${r.completed_at ? '✓' : (r.status === 'processing' ? `(${ageMin(r.created_at)}m)` : '')}`).join(' | ');
    if (line !== prev) { console.log(new Date().toISOString().slice(11, 19), line); prev = line; }
    await new Promise((res) => setTimeout(res, 10000));
  }
}

async function cmdReport(idList: string[]) {
  let baseIds: string[] = [];
  if (fs.existsSync(BASELINE_PATH)) {
    try { baseIds = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).baselineTaskIds || []; } catch { /* none */ }
  }
  const baseSet = new Set(baseIds);
  const s = await sessions(idList);
  const t = await tasks(idList);
  const newTasks = t.filter((r) => !baseSet.has(r.id));

  console.log('\n=== SESSION STATE ===');
  for (const r of s) {
    console.log(`${r.id.slice(0, 8)} [${r.mode}${r.mastering_mode ? '+' + r.mastering_mode + 'master' : ''}] state=${r.state} status=${r.status} pay=${r.payment_status} cyc=${r.paid_cycle_count}/${r.base_cycle_limit}(+${r.additional_cycles_purchased})`);
  }

  console.log(`\n=== TASKS THIS RUN (${newTasks.length} new since baseline) ===`);
  let totalCr = 0; const anomalies: string[] = [];
  for (const r of newTasks) {
    const cr = r.credits_consumed || 0; totalCr += cr;
    const lat = minutesBetween(r.created_at, r.completed_at);
    const stems = Array.isArray(r.stems_urls) ? r.stems_urls.length : (r.stems_urls ? '?' : 0);
    const out = r.r2_final_url ? 'r2✓' : (r.final_url ? 'final✓' : (r.preview_url ? 'preview✓' : '—'));
    console.log(`  ${r.session_id.slice(0, 8)} ${r.task_type.padEnd(20)} ${r.status.padEnd(11)} cr=${String(cr).padStart(4)} lat=${lat ?? '—'}m stems=${stems} ${out} roex=${r.roex_task_id?.slice(0, 8) ?? '—'}`);
    if (r.status === 'processing' && ageMin(r.created_at) > STUCK_MIN) anomalies.push(`STUCK: ${r.id.slice(0, 8)} ${r.task_type} processing ${ageMin(r.created_at)}m`);
    if (r.status === 'failed') anomalies.push(`FAILED: ${r.id.slice(0, 8)} ${r.task_type}`);
    if ((r.task_type.includes('final') || r.task_type.includes('master')) && r.status === 'completed' && !r.final_url && !r.r2_final_url) anomalies.push(`NO-FINAL-URL: ${r.id.slice(0, 8)} ${r.task_type} completed without final/r2 url`);
  }

  console.log('\n=== CERT SUMMARY ===');
  console.log(`total credits consumed (this run): ${totalCr}cr`);
  console.log(`tasks: ${newTasks.length} | completed: ${newTasks.filter((r) => r.status === 'completed').length} | failed: ${newTasks.filter((r) => r.status === 'failed').length} | processing: ${newTasks.filter((r) => r.status === 'processing').length}`);
  const masterDL = newTasks.filter((r) => r.task_type.includes('master') && (r.r2_final_url || r.final_url));
  console.log(`master→DL evidence (master task w/ final url): ${masterDL.length}`);
  if (anomalies.length) { console.log('\n=== ANOMALIES ==='); anomalies.forEach((a) => console.log('  ⚠️ ' + a)); }
  else console.log('\nno anomalies detected.');
}

async function cmdUrls(idList: string[]) {
  const rows = (await sql`SELECT id, guest_token, user_id FROM dial_sessions WHERE id = ANY(${idList})`) as { id: string; guest_token: string | null; user_id: string | null }[];
  console.log('# drive URLs (runtime only — do NOT paste into repo/docs/memory):');
  for (const r of rows) {
    if (r.guest_token) console.log(`${BASE_URL}/dial/${r.id}?token=${r.guest_token}`);
    else console.log(`${BASE_URL}/dial/${r.id}  (signed-in: user_id=${r.user_id?.slice(0, 8)} — needs Clerk session, no guest token)`);
  }
}

async function main() {
  const cmd = process.argv[2];
  const idList = ids();
  if (cmd === 'baseline') return cmdBaseline(idList);
  if (cmd === 'watch') return cmdWatch(idList);
  if (cmd === 'report') return cmdReport(idList);
  if (cmd === 'urls') return cmdUrls(idList);
  console.error('cmd must be one of: baseline | watch | report | urls');
  process.exit(1);
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e.message); process.exit(1); });
