#!/usr/bin/env tsx
/**
 * ⑤ fix — CORRECT-SEQUENCE before/after proof at production scale (9-stem, conductor-requested).
 *
 * Proves the client-orchestrated fix produces REAL per-iteration audio where the bug returned cached
 * stale audio. Mirrors what the app now does (mint fresh /mixpreview → poll to READY → /retrievefinalmix):
 *
 *   BUG  (same task reused): final(M1, effA) then final(M1, effB)  → md5 EQUAL   (effB ignored = cached)
 *   FIX  (fresh task each):  final(M2, effB) on a NEW polled task  → md5 DIFFERS (effB reflected)
 *
 * So: control(M1,effB) == A(M1,effA)  AND  B(M2,effB) != A  ⇒ the fix makes each adjustment real.
 *
 * Cost: returnStems:false → ~250cr per charged render (A, control is cached/free, B) ≈ 500cr from the
 * shared pool. NEVER log/echo/commit the key value.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
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
  type InstrumentGroup,
  type MixResult,
} from '../lib/roex';

const STEM_DIR = 'docs/sunogen_audio/muedial/multitracks/Track 2 liberation';
const STEMS: { file: string; group: InstrumentGroup }[] = [
  { file: '0 Drums.wav', group: 'DRUMS_GROUP' },
  { file: '1 Bass.wav', group: 'BASS_GROUP' },
  { file: '2 Percussion.wav', group: 'PERCS_GROUP' },
  { file: '3 Synth.wav', group: 'SYNTH_GROUP' },
  { file: '4 Vocal.wav', group: 'VOCAL_GROUP' },
  { file: '5 Background Vocal1.wav', group: 'BACKING_VOX_GROUP' },
  { file: '6 Brass.wav', group: 'BRASS_GROUP' },
  { file: '7 wood.wav', group: 'KEYS_GROUP' },
  { file: '8 Strings.wav', group: 'STRINGS_GROUP' },
];

const ts = () => new Date().toISOString().slice(11, 19);
const log = (m: string) => console.log(`[${ts()}] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function md5OfUrl(url: string, label: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${label} failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = createHash('md5').update(buf).digest('hex');
  writeFileSync(`/tmp/dial-seq-${label}.wav`, buf);
  log(`  ${label}: ${buf.length} bytes  md5=${hash}`);
  return hash;
}

async function submitPreview(
  client: RoExClient,
  tracks: { trackUrl: string; instrumentGroup: InstrumentGroup }[],
  label: string,
): Promise<MixResult> {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await mixPreview(client, { tracks, musicalStyle: 'POP', returnStems: false });
      if (r.taskId && !r.error) return r;
      log(`  ${label} preview submit error (try ${i + 1}): ${r.error ?? 'no taskId'}`);
    } catch (e) {
      log(`  ${label} preview submit threw (try ${i + 1}): ${e instanceof Error ? e.message : e}`);
    }
    await sleep(8_000);
  }
  throw new Error(`${label} preview submit failed after retries`);
}

/** Mirror the app: poll the fresh preview to READY before applying effects (large 9-stem render). */
async function pollPreviewReady(client: RoExClient, taskId: string, label: string): Promise<void> {
  const start = Date.now();
  for (let i = 0; i < 120; i++) {
    const r = await pollMixPreview(client, taskId, { retrieveFxSettings: false });
    if (r.previewUrl) { log(`  ${label} preview READY in ${Math.round((Date.now() - start) / 1000)}s`); return; }
    if (r.status === 'failed') throw new Error(`${label} preview failed`);
    await sleep(20_000);
  }
  throw new Error(`${label} preview timeout`);
}

async function finalWithPoll(
  client: RoExClient, taskId: string, trackData: AdvancedTrackAdjustment[], trackUrls: string[], label: string,
): Promise<MixResult> {
  const start = Date.now();
  let r = await mixFinalAdvanced(client, { taskId, trackData, returnStems: false });
  log(`  ${label} final submit → status=${r.status} finalUrl=${!!r.finalUrl} (${Math.round((Date.now() - start) / 1000)}s)`);
  for (let i = 0; i < 160 && !r.finalUrl && r.status !== 'failed'; i++) {
    await sleep(15_000);
    r = await pollMixFinal(client, taskId, trackUrls, { returnStems: false });
  }
  log(`  ${label} final done → finalUrl=${!!r.finalUrl} status=${r.status} total=${Math.round((Date.now() - start) / 1000)}s`);
  if (!r.finalUrl) throw new Error(`${label} final produced no URL (status=${r.status} error=${r.error ?? 'none'})`);
  return r;
}

const effectsA = (urls: string[]): AdvancedTrackAdjustment[] =>
  urls.map((u) => ({ trackUrl: u, gainDb: 0, eqBands: [{ frequency: 200, gain: 0, q: 1.0 }] }));
const effectsB = (urls: string[]): AdvancedTrackAdjustment[] =>
  urls.map((u) => ({ trackUrl: u, gainDb: 0, eqBands: [{ frequency: 5000, gain: 6, q: 1.5 }] }));

async function main() {
  const prodKey = process.env.ROEX_PROD_API_KEY;
  if (!prodKey) throw new Error('ROEX_PROD_API_KEY not set');
  if (prodKey === process.env.ROEX_DEV_API_KEY) throw new Error('Refusing: PROD key equals DEV key');
  const client = new RoExClient({ apiKey: prodKey });
  log(`=== ⑤ CORRECT-SEQUENCE proof — ${STEMS.length}-stem (PROD key) ===`);

  const trackUrls: string[] = [];
  const tracks: { trackUrl: string; instrumentGroup: InstrumentGroup }[] = [];
  for (const s of STEMS) {
    const buf = readFileSync(`${STEM_DIR}/${s.file}`);
    log(`uploading ${s.file} (${buf.length} bytes)…`);
    const { signedUrl, readableUrl } = await getUploadUrl(client, s.file);
    await uploadToSignedUrl(signedUrl, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'audio/wav');
    trackUrls.push(readableUrl);
    tracks.push({ trackUrl: readableUrl, instrumentGroup: s.group });
  }
  log('uploads done.');

  // Iteration 1 — fresh task M1, polled to ready, effects A (the app's flow).
  const m1 = await submitPreview(client, tracks, 'M1');
  log(`M1 preview submitted: ${m1.taskId}`);
  await pollPreviewReady(client, m1.taskId, 'M1');
  log('iteration 1: final(M1, effA) [fresh, app flow] …');
  const rA = await finalWithPoll(client, m1.taskId, effectsA(trackUrls), trackUrls, 'A');

  // BUG control — reuse the SAME task M1 with effects B (today's buggy path).
  log('BUG control: final(M1, effB) [SAME task — expect cached == A] …');
  const rControl = await finalWithPoll(client, m1.taskId, effectsB(trackUrls), trackUrls, 'control');

  // Iteration 2 — FRESH task M2, polled to ready, effects B (the fix).
  const m2 = await submitPreview(client, tracks, 'M2');
  log(`M2 preview submitted: ${m2.taskId}`);
  await pollPreviewReady(client, m2.taskId, 'M2');
  log('iteration 2: final(M2, effB) [FRESH task — the fix] …');
  const rB = await finalWithPoll(client, m2.taskId, effectsB(trackUrls), trackUrls, 'B');

  log('=== downloading + md5 ===');
  const mA = await md5OfUrl(rA.finalUrl!, 'A');
  const mControl = await md5OfUrl(rControl.finalUrl!, 'control');
  const mB = await md5OfUrl(rB.finalUrl!, 'B');

  log('=== VERDICT ===');
  log(`A      (M1, effA)            md5 = ${mA}`);
  log(`control(M1, effB, SAME task) md5 = ${mControl}`);
  log(`B      (M2, effB, FRESH task) md5 = ${mB}`);
  log(`BUG reproduced: control == A (effB ignored on reused task)?  ${mControl === mA ? 'YES (cached stale audio)' : 'NO'}`);
  log(`FIX proven:     B != A (fresh task reflects the new effB)?    ${mB !== mA ? 'YES (adjustment is real)' : 'NO'}`);
  log(`FIX != bug:     B != control?                                ${mB !== mControl ? 'YES' : 'NO'}`);
  const pass = mControl === mA && mB !== mA;
  log(`=== ${pass ? 'PASS — fresh-task-per-iteration makes each adjustment real' : 'UNEXPECTED — investigate'} ===`);
}

main().catch((e) => { console.error('CORRECT-SEQUENCE EXPERIMENT ERROR:', e); process.exit(1); });
