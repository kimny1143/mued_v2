#!/usr/bin/env tsx
/**
 * ⑤ correctness decisive experiment (plan-first, 2026-06-12, conductor-approved).
 *
 * Tests RoEx idempotency directly (NO prod DB rows — only RoEx-side tasks + pool credits):
 *   - ⑤ : same multitrackTaskId M1, two DIFFERENT effects (A neutral / B +6dB@5k)
 *         → if md5(A) == md5(B) the 2nd is a CACHED old render (task-level idempotent = X).
 *   - (B): new task M2 with effects_B → if md5(C) != md5(B) a fresh task renders the NEW
 *         audio (so "new multitrackTaskId per change" is the correct fix).
 *   - (A): call final on M2 IMMEDIATELY after submitting its preview (before it completes)
 *         → observe whether /retrievefinalmix needs the preview rendered first (latency).
 *
 * Cost: stems-off (returnStems:false) → 250cr/render. Expect render A + render C charged,
 * render B free (cached) ≈ 500cr from pool 18,890.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
// RoEx requires a webhook URL that returns 2xx (we poll instead). The lib default httpbin.org
// is flaky (503s). Point at a reliable 200-on-POST responder for the experiment.
process.env.ROEX_WEBHOOK_URL = process.env.ROEX_WEBHOOK_URL || 'https://postman-echo.com/post';

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import {
  RoExClient,
  getUploadUrl,
  uploadToSignedUrl,
  mixPreview,
  pollMixPreview,
  mixFinalAdvanced,
  pollMixFinal,
  type AdvancedTrackAdjustment,
  type MixResult,
} from '../lib/roex';

const STEM_DIR = 'docs/sunogen_audio/muedial/multitracks/Track 2 liberation';
const STEMS = [
  { file: '0 Drums.wav', group: 'DRUMS_GROUP' as const },
  { file: '1 Bass.wav', group: 'BASS_GROUP' as const },
];

const ts = () => new Date().toISOString().slice(11, 19);
const log = (m: string) => console.log(`[${ts()}] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function md5OfUrl(url: string, label: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${label} failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = createHash('md5').update(buf).digest('hex');
  writeFileSync(`/tmp/dial-exp-${label}.wav`, buf);
  log(`  ${label}: ${buf.length} bytes  md5=${hash}`);
  return hash;
}

async function submitPreview(
  client: RoExClient,
  tracks: { trackUrl: string; instrumentGroup: string }[],
  label: string,
): Promise<MixResult> {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await mixPreview(client, { tracks: tracks as never, musicalStyle: 'POP', returnStems: false });
      if (r.taskId && !r.error) return r;
      log(`  ${label} preview submit error (try ${i + 1}): ${r.error ?? 'no taskId'}`);
    } catch (e) {
      log(`  ${label} preview submit threw (try ${i + 1}): ${e instanceof Error ? e.message : e}`);
    }
    await sleep(8_000);
  }
  throw new Error(`${label} preview submit failed after retries`);
}

async function pollPreview(client: RoExClient, taskId: string, label: string): Promise<void> {
  const start = Date.now();
  for (let i = 0; i < 120; i++) {
    const r = await pollMixPreview(client, taskId, { retrieveFxSettings: false });
    if (r.previewUrl) { log(`  ${label} preview ready in ${Math.round((Date.now() - start) / 1000)}s`); return; }
    if (r.status === 'failed') throw new Error(`${label} preview failed`);
    await sleep(15_000);
  }
  throw new Error(`${label} preview timeout`);
}

async function finalWithPoll(
  client: RoExClient,
  taskId: string,
  trackData: AdvancedTrackAdjustment[],
  trackUrls: string[],
  label: string,
): Promise<MixResult> {
  const start = Date.now();
  let r = await mixFinalAdvanced(client, { taskId, trackData, returnStems: false });
  log(`  ${label} submit → status=${r.status} finalUrl=${!!r.finalUrl} (${Math.round((Date.now() - start) / 1000)}s)`);
  for (let i = 0; i < 160 && !r.finalUrl && r.status !== 'failed'; i++) {
    await sleep(15_000);
    r = await pollMixFinal(client, taskId, trackUrls, { returnStems: false });
  }
  log(`  ${label} done → finalUrl=${!!r.finalUrl} status=${r.status} total=${Math.round((Date.now() - start) / 1000)}s`);
  return r;
}

// Two clearly-distinct effects: A ≈ neutral, B = strong high-shelf boost.
const effectsA = (urls: string[]): AdvancedTrackAdjustment[] =>
  urls.map((u) => ({ trackUrl: u, gainDb: 0, eqBands: [{ frequency: 200, gain: 0, q: 1.0 }] }));
const effectsB = (urls: string[]): AdvancedTrackAdjustment[] =>
  urls.map((u) => ({ trackUrl: u, gainDb: 0, eqBands: [{ frequency: 5000, gain: 6, q: 1.5 }] }));

async function main() {
  // Use the PROD key explicitly (ROEX_API_KEY in .env.local is the dev key locally).
  // NEVER log/echo/commit the key value — only use it to construct the client.
  const prodKey = process.env.ROEX_PROD_API_KEY;
  if (!prodKey) throw new Error('ROEX_PROD_API_KEY not set');
  if (prodKey === process.env.ROEX_DEV_API_KEY) {
    throw new Error('Refusing to run: PROD key equals DEV key (no real render)');
  }
  const client = new RoExClient({ apiKey: prodKey });
  log('=== ⑤ decisive experiment START (real RoEx renders, PROD key) ===');

  // 1. Upload stems
  const trackUrls: string[] = [];
  const tracks: { trackUrl: string; instrumentGroup: typeof STEMS[number]['group'] }[] = [];
  for (const s of STEMS) {
    const buf = readFileSync(`${STEM_DIR}/${s.file}`);
    log(`uploading ${s.file} (${buf.length} bytes)…`);
    const { signedUrl, readableUrl } = await getUploadUrl(client, s.file);
    await uploadToSignedUrl(signedUrl, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'audio/wav');
    trackUrls.push(readableUrl);
    tracks.push({ trackUrl: readableUrl, instrumentGroup: s.group });
  }
  log('uploads done.');

  // 2. ⑤ test on M1: poll preview to ready FIRST, then final_A then final_B (same task)
  const m1 = await submitPreview(client, tracks, 'M1');
  log(`M1 preview submitted: ${m1.taskId}`);
  await pollPreview(client, m1.taskId, 'M1');
  log('⑤ test: final(M1, effects_A) …');
  const rA = await finalWithPoll(client, m1.taskId, effectsA(trackUrls), trackUrls, 'A');
  log('⑤ test: final(M1, effects_B) [different EQ, SAME task] …');
  const rB = await finalWithPoll(client, m1.taskId, effectsB(trackUrls), trackUrls, 'B');

  // 3. (B) test on M2 (new task): poll preview to ready, then final_B
  const m2 = await submitPreview(client, tracks, 'M2');
  log(`M2 preview submitted: ${m2.taskId}`);
  await pollPreview(client, m2.taskId, 'M2');
  log('(B) test: final(M2, effects_B) [NEW task] …');
  const rC = await finalWithPoll(client, m2.taskId, effectsB(trackUrls), trackUrls, 'C');

  // 4. (A) latency probe on M3 (fresh task): final IMMEDIATELY after preview submit (no poll).
  //    Download the result to verify the immediate finalUrl is REAL audio (not a placeholder).
  const m3 = await submitPreview(client, tracks, 'M3');
  log(`M3 preview submitted: ${m3.taskId}`);
  log('(A) latency: final(M3) IMMEDIATELY (no preview poll)…');
  let aResult = 'unknown';
  let rD: MixResult | null = null;
  const aStart = Date.now();
  try {
    rD = await mixFinalAdvanced(client, { taskId: m3.taskId, trackData: effectsB(trackUrls), returnStems: false });
    aResult = rD.error ? `errored: ${rD.error}` : rD.finalUrl ? `finalUrl in ${Math.round((Date.now() - aStart) / 1000)}s` : `status=${rD.status} (processing)`;
  } catch (e) {
    aResult = `threw: ${e instanceof Error ? e.message : e}`;
  }
  log(`(A) immediate final(M3) → ${aResult}`);

  // 5. Download + md5 compare
  log('=== downloading + md5 ===');
  const mA = rA.finalUrl ? await md5OfUrl(rA.finalUrl, 'A') : 'no-url';
  const mB = rB.finalUrl ? await md5OfUrl(rB.finalUrl, 'B') : 'no-url';
  const mC = rC.finalUrl ? await md5OfUrl(rC.finalUrl, 'C') : 'no-url';
  let mD = 'n/a';
  try { mD = rD?.finalUrl ? await md5OfUrl(rD.finalUrl, 'D') : 'no-url'; } catch (e) { mD = `download-failed: ${e instanceof Error ? e.message : e}`; }

  log('=== VERDICT ===');
  log(`A (M1,effA)         md5 = ${mA}`);
  log(`B (M1,effB,SAMEtask) md5 = ${mB}`);
  log(`C (M2,effB,NEWtask)  md5 = ${mC}`);
  log(`D (M3,effB,immediate) md5 = ${mD}`);
  log(`⑤  same-task A==B (2nd effects ignored = cached old audio)? ${mA === mB ? 'YES → ⑤ CONFIRMED (task-level idempotent / X)' : 'NO → effects DO re-render per call'}`);
  log(`(B) new-task C != B (fresh render of new effects)?          ${mC !== mB ? 'YES → new task renders the NEW audio' : 'NO → new task also cached?!'}`);
  log(`    new-task C reflects effB (C != A)?                       ${mC !== mA ? 'YES (differs from effA render)' : 'NO (same as effA)'}`);
  log(`(A) immediate final(M3): ${aResult}  | D valid+real? ${mD.length === 32 ? 'YES (downloadable WAV)' : 'NO/failed'}`);
  log('=== DONE ===');
}

main().catch((e) => { console.error('EXPERIMENT ERROR:', e); process.exit(1); });
