#!/usr/bin/env tsx
/**
 * MUEDial 60pt cert — full-loop driver via the REAL prod API (guest token).
 * preview → final(mix) → mastering/preview → mastering/final → download.
 * Each render is POSTed, then its GET poll endpoint is hit to drive finalization
 * (per design: the GET poll does the DB write + R2 copy, not the webhook), with the
 * dial_tasks row in the DB as the authoritative completion signal.
 *
 *   npx tsx scripts/cert-drive-loop.ts <sessionId> <guestToken> [label]
 *
 * Writes a step-by-step result (timing, status, urls) to /tmp/cert-loop-<label>.json.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import * as fs from 'fs';
import { neon } from '@neondatabase/serverless';

const BASE = process.env.DIAL_BASE_URL || 'https://dial.mued.jp';
const sql = neon(process.env.DATABASE_URL!);
const POLL_MS = 20_000;
const RENDER_TIMEOUT_MS = 25 * 60_000; // generous: preview historically up to ~22min

const [sessionId, token, label = sessionId.slice(0, 8)] = process.argv.slice(2);
if (!sessionId || !token) { console.error('usage: cert-drive-loop.ts <sessionId> <guestToken> [label]'); process.exit(1); }
const H = { 'Content-Type': 'application/json', 'X-Dial-Guest-Token': token };
const steps: any[] = [];
const now = () => Date.now();
function log(m: string) { console.log(`[${label} +${Math.round((now() - T0) / 1000)}s] ${m}`); }
const T0 = now();

async function post(path: string, body: unknown): Promise<any> {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`POST ${path} → ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}
async function getPoll(path: string): Promise<number> {
  const r = await fetch(`${BASE}${path}`, { method: 'GET', headers: H });
  await r.text().catch(() => '');
  return r.status;
}
async function latestParams(sessionId: string): Promise<boolean> {
  const rows = (await sql`SELECT parameter_changes FROM dial_messages WHERE session_id = ${sessionId} AND role = 'assistant' AND parameter_changes IS NOT NULL ORDER BY created_at DESC LIMIT 1`) as any[];
  return rows.length > 0;
}

/** Dialogue flow requires Hoo to propose parameter_changes before mix-final. Drive the chat. */
async function ensureMixParams(sessionId: string): Promise<void> {
  const directives = [
    'ボーカルを少し前に出して、低音はタイトに、全体を明るく仕上げてください。この方向でミックスをお願いします。',
    '今の方向で各トラックのバランスを整えて、ミックスのパラメータを確定してください。',
    'おまかせで構いません。ポップスとして自然なバランスでミックスのパラメータを提案してください。',
  ];
  for (let i = 0; i < directives.length; i++) {
    log(`chat: message ${i + 1} → Hoo`);
    await post('/api/dial/chat', { sessionId, message: directives[i], locale: 'ja' });
    if (await latestParams(sessionId)) { log('chat: Hoo proposed parameter_changes ✓'); steps.push({ name: 'chat', status: 'params-ready', attempts: i + 1 }); return; }
  }
  throw new Error('chat: Hoo did not propose parameter_changes after directives');
}

async function taskStatus(taskId: string): Promise<{ status: string; previewUrl: string | null; finalUrl: string | null; r2: string | null; stems: number }> {
  const [row] = (await sql`SELECT status, preview_url, final_url, r2_final_url, stems_urls FROM dial_tasks WHERE id = ${taskId}`) as any[];
  const stems = Array.isArray(row?.stems_urls) ? row.stems_urls.length : 0;
  return { status: row?.status ?? 'missing', previewUrl: row?.preview_url ?? null, finalUrl: row?.final_url ?? null, r2: row?.r2_final_url ?? null, stems };
}

/** POST to create a task, then poll its GET endpoint + DB until completed/failed. */
async function renderStep(name: string, postPath: string, postBody: unknown, pollPath: (taskId: string) => string): Promise<string> {
  const t0 = now();
  log(`${name}: POST ${postPath}`);
  const res = await post(postPath, postBody);
  const taskId = res.data?.taskId ?? res.taskId;
  if (!taskId) throw new Error(`${name}: no taskId in response ${JSON.stringify(res).slice(0, 200)}`);
  log(`${name}: taskId=${taskId.slice(0, 8)} — polling...`);
  const deadline = now() + RENDER_TIMEOUT_MS;
  while (now() < deadline) {
    const httpCode = await getPoll(pollPath(taskId));
    const s = await taskStatus(taskId);
    if (s.status === 'completed') {
      const dt = Math.round((now() - t0) / 1000);
      log(`${name}: ✓ completed in ${dt}s (stems=${s.stems} url=${s.r2 || s.finalUrl || s.previewUrl ? 'yes' : 'no'})`);
      steps.push({ name, taskId, status: 'completed', seconds: dt, stems: s.stems, hasUrl: !!(s.r2 || s.finalUrl || s.previewUrl), pollHttp: httpCode });
      return taskId;
    }
    if (s.status === 'failed') {
      steps.push({ name, taskId, status: 'failed', seconds: Math.round((now() - t0) / 1000), pollHttp: httpCode });
      throw new Error(`${name}: task FAILED (taskId=${taskId})`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  steps.push({ name, taskId, status: 'timeout', seconds: Math.round((now() - t0) / 1000) });
  throw new Error(`${name}: TIMEOUT after ${RENDER_TIMEOUT_MS / 60000}min (taskId=${taskId})`);
}

async function main() {
  log(`=== full loop start (session ${sessionId.slice(0, 8)}) ===`);
  try {
    const previewId = await renderStep('preview', '/api/dial/preview', { sessionId }, (id) => `/api/dial/preview?taskId=${id}`);
    await ensureMixParams(sessionId); // dialogue flow: Hoo must propose parameter_changes before final
    const finalId = await renderStep('mix-final', '/api/dial/final', { taskId: previewId, type: 'final' }, (id) => `/api/dial/final?taskId=${id}`);
    const mPrevId = await renderStep('master-preview', '/api/dial/mastering/preview', { sessionId }, (id) => `/api/dial/mastering/preview?taskId=${id}`);
    const mFinalId = await renderStep('master-final', '/api/dial/mastering/final', { taskId: mPrevId }, (id) => `/api/dial/mastering/final?taskId=${id}`);
    // download (master→DL — the embed swap point + undici watch)
    log('download: GET /api/dial/download');
    const dl = await fetch(`${BASE}/api/dial/download?taskId=${mFinalId}`, { method: 'GET', headers: H });
    const len = dl.headers.get('content-length');
    const ok = dl.ok && Number(len) > 10000;
    log(`download: ${dl.ok ? '✓' : '✗'} http=${dl.status} bytes=${len} ${ok ? 'OK' : 'SUSPECT'}`);
    steps.push({ name: 'download', status: ok ? 'ok' : 'suspect', http: dl.status, bytes: Number(len) || 0 });
    void finalId;
    log(`=== loop DONE in ${Math.round((now() - T0) / 1000)}s ===`);
    fs.writeFileSync(`/tmp/cert-loop-${label}.json`, JSON.stringify({ session: sessionId, label, ok: ok, totalSeconds: Math.round((now() - T0) / 1000), steps }, null, 2));
  } catch (e: any) {
    log(`✗ ABORT: ${e.message}`);
    fs.writeFileSync(`/tmp/cert-loop-${label}.json`, JSON.stringify({ session: sessionId, label, ok: false, error: e.message, totalSeconds: Math.round((now() - T0) / 1000), steps }, null, 2));
    process.exit(1);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e.message); process.exit(1); });
