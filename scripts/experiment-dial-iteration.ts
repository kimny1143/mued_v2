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

  // 2. Submit M2 preview, then IMMEDIATELY final(M2) — (A) latency test
  const m2 = await mixPreview(client, { tracks, musicalStyle: 'POP', returnStems: false });
  log(`M2 preview submitted: ${m2.taskId}`);
  log('(A) latency test: calling final(M2) immediately (before M2 preview completes)…');
  let aTestResult = 'unknown';
  try {
    const immediate = await mixFinalAdvanced(client, { taskId: m2.taskId, trackData: effectsB(trackUrls), returnStems: false });
    aTestResult = immediate.error
      ? `errored: ${immediate.error}`
      : immediate.finalUrl ? 'returned finalUrl immediately' : `accepted, status=${immediate.status} (processing)`;
  } catch (e) {
    aTestResult = `threw: ${e instanceof Error ? e.message : e}`;
  }
  log(`(A) immediate final(M2) → ${aTestResult}`);

  // 3. Submit M1 preview + poll to complete (needed for the in-place A/B test)
  const m1 = await mixPreview(client, { tracks, musicalStyle: 'POP', returnStems: false });
  log(`M1 preview submitted: ${m1.taskId}`);
  await pollPreview(client, m1.taskId, 'M1');
  await pollPreview(client, m2.taskId, 'M2'); // ensure M2 done for its final too

  // 4. ⑤ test on M1: effects_A then effects_B (same task)
  log('⑤ test: final(M1, effects_A) …');
  const rA = await finalWithPoll(client, m1.taskId, effectsA(trackUrls), trackUrls, 'A');
  log('⑤ test: final(M1, effects_B) [different EQ, SAME task] …');
  const rB = await finalWithPoll(client, m1.taskId, effectsB(trackUrls), trackUrls, 'B');

  // 5. (B) test on M2: effects_B on the NEW task (final may already be done from the (A) probe)
  log('(B) test: final(M2, effects_B) [NEW task] …');
  const rC = await finalWithPoll(client, m2.taskId, effectsB(trackUrls), trackUrls, 'C');

  // 6. Download + md5 compare
  log('=== downloading + md5 ===');
  const mA = rA.finalUrl ? await md5OfUrl(rA.finalUrl, 'A') : 'no-url';
  const mB = rB.finalUrl ? await md5OfUrl(rB.finalUrl, 'B') : 'no-url';
  const mC = rC.finalUrl ? await md5OfUrl(rC.finalUrl, 'C') : 'no-url';

  log('=== VERDICT ===');
  log(`A (M1,effA) md5 = ${mA}`);
  log(`B (M1,effB) md5 = ${mB}`);
  log(`C (M2,effB) md5 = ${mC}`);
  log(`⑤  same-task A==B (cached old audio)? ${mA === mB ? 'YES → ⑤ CONFIRMED (task idempotent / X)' : 'NO → effects re-render per call'}`);
  log(`(B) new-task C != B (fresh render)?    ${mC !== mB ? 'YES → new task renders NEW audio' : 'NO'}`);
  log(`(A) immediate final(M2): ${aTestResult}`);
  log('=== DONE ===');
}

main().catch((e) => { console.error('EXPERIMENT ERROR:', e); process.exit(1); });
