#!/usr/bin/env tsx
/**
 * ⑤ fix — large-session LATENCY gate (plan-first, 2026-06-12, conductor must-verify).
 *
 * The ⑤ fix mints a FRESH /mixpreview per dialogue render then immediately calls
 * /retrievefinalmix on that fresh (NOT-yet-rendered) task. The experiment that confirmed ⑤
 * used a small 2-stem input (16s). This probe answers the open gate:
 *
 *   For a realistic 9-stem session, does the IMMEDIATE /retrievefinalmix on a fresh task
 *     (a) BLOCK until the full base render completes (8-22min) → exceeds maxDuration=300s
 *         → the final POST is killed before it inserts the dial_task row → ORPHANED CHARGE, OR
 *     (b) return `processing` quickly → the existing #434 GET-poll/backstop/cron completes it
 *         → the minimal insert-after-submit fix is safe.
 *
 * Decisive measurement = step 3: wall-time of the single mixFinalAdvanced() call (NO comm-timeout,
 * exactly as final/route.ts submit() runs it) + whether it returns finalUrl or status=processing.
 *
 * Cost: returnStems:false → ~250cr for the one render charged. NEVER log/echo/commit the key value.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
process.env.ROEX_WEBHOOK_URL = process.env.ROEX_WEBHOOK_URL || 'https://postman-echo.com/post';

import { readFileSync } from 'fs';
import {
  RoExClient,
  getUploadUrl,
  uploadToSignedUrl,
  mixPreview,
  mixFinalAdvanced,
  pollMixFinal,
  type AdvancedTrackAdjustment,
  type InstrumentGroup,
  type MixResult,
} from '../lib/roex';

const STEM_DIR = 'docs/sunogen_audio/muedial/multitracks/Track 2 liberation';
// Full 9-stem session (realistic large input — the case the small experiment did NOT cover).
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

const effectsB = (urls: string[]): AdvancedTrackAdjustment[] =>
  urls.map((u) => ({ trackUrl: u, gainDb: 0, eqBands: [{ frequency: 5000, gain: 6, q: 1.5 }] }));

async function main() {
  const prodKey = process.env.ROEX_PROD_API_KEY;
  if (!prodKey) throw new Error('ROEX_PROD_API_KEY not set');
  if (prodKey === process.env.ROEX_DEV_API_KEY) {
    throw new Error('Refusing to run: PROD key equals DEV key (no real render)');
  }
  const client = new RoExClient({ apiKey: prodKey });
  log(`=== ⑤ LATENCY gate START — ${STEMS.length}-stem fresh task (PROD key) ===`);

  // 1. Upload 9 stems
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

  // 2. Mint fresh /mixpreview (measure submit latency — this is the fast queue step)
  const pStart = Date.now();
  const m = await submitPreview(client, tracks, 'L');
  log(`/mixpreview submit returned taskId in ${Math.round((Date.now() - pStart) / 1000)}s: ${m.taskId}`);

  // 3. ★DECISIVE: immediate /retrievefinalmix on the fresh (un-rendered) task — exactly as
  //    final/route.ts submit() does (NO comm-timeout). Measure block time + finalUrl-vs-processing.
  log('★ immediate mixFinalAdvanced(fresh task) — measuring block time…');
  const fStart = Date.now();
  let r: MixResult;
  try {
    r = await mixFinalAdvanced(client, { taskId: m.taskId, trackData: effectsB(trackUrls), returnStems: false });
  } catch (e) {
    log(`★ immediate final THREW after ${Math.round((Date.now() - fStart) / 1000)}s: ${e instanceof Error ? e.message : e}`);
    throw e;
  }
  const blockS = Math.round((Date.now() - fStart) / 1000);
  log(`★ immediate final RETURNED in ${blockS}s → finalUrl=${!!r.finalUrl} status=${r.status} error=${r.error ?? 'none'}`);
  log(`★ VERDICT: ${
    r.finalUrl
      ? `BLOCKED-until-done (${blockS}s) — ${blockS > 280 ? 'EXCEEDS 300s maxDuration → RESTRUCTURE (insert row before charge)' : 'fits in 300s → insert-after OK for this size'}`
      : `returned PROCESSING in ${blockS}s (does NOT block) → async GET-poll path completes it → minimal insert-after fix safe`
  }`);

  // 4. If processing, confirm the async path completes (poll w/ comm-timeout, like final GET).
  if (!r.finalUrl && r.status !== 'failed') {
    log('confirming async completion via pollMixFinal (comm-timeout, like final GET)…');
    const pollStart = Date.now();
    for (let i = 0; i < 90 && !r.finalUrl && r.status !== 'failed'; i++) {
      await sleep(20_000);
      try {
        r = await pollMixFinal(client, m.taskId, trackUrls, { returnStems: false });
        log(`  poll ${i + 1}: status=${r.status} finalUrl=${!!r.finalUrl} (+${Math.round((Date.now() - pollStart) / 1000)}s)`);
      } catch (e) {
        log(`  poll ${i + 1} transient: ${e instanceof Error ? e.message : e}`);
      }
    }
    log(`async render ${r.finalUrl ? 'COMPLETED' : 'did NOT complete'} after ${Math.round((Date.now() - pollStart) / 1000)}s of polling`);
  }

  log(`=== DONE — total wall time ${Math.round((Date.now() - pStart) / 1000)}s ===`);
}

main().catch((e) => { console.error('LATENCY EXPERIMENT ERROR:', e); process.exit(1); });
