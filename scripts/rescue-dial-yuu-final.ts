#!/usr/bin/env tsx
/**
 * White-glove rescue: bake Yuu's INTENDED final mix in session fd7ef7a2, reflecting Yuu's saved
 * effects (render-fail ≠ effects-loss — both layers persisted):
 *   - Layer A (presence/pan/reverb) ← dial_tracks  (drives the fresh /mixpreview)
 *   - Layer B (EQ/comp/gain)        ← dial_messages.parameter_changes (applied via /retrievefinalmix)
 *
 * Reads a rescue_data JSON (from kimny's read-only SQL — see the message; respects the prod-DB gate).
 * RoEx-only (no prod DB / no prod write here). Stems referenced by r2_url directly (GCS expired) — no
 * re-upload. Mints a FRESH preview (Yuu's tracks) → polls → /retrievefinalmix (Yuu's params) → final
 * WAV → md5. Also serves as the prod verification of the ⑤ fresh-preview→final orchestration.
 *
 * Cost: ~250-300cr from the shared pool (comp/goodwill — does NOT touch Yuu's free15 cycle).
 * NEVER log/echo/commit the key value.
 *
 * Usage: npx tsx scripts/rescue-dial-yuu-final.ts /tmp/yuu-rescue-data.json
 *
 * rescue_data JSON shape (from the SQL's jsonb_build_object):
 *   { sessionId, musicalStyle, tracks: [{ filename, instrumentGroup, presenceSetting,
 *     panPreference, reverbPreference, r2Url }], latestParams: [{ track, changes: {...} }] }
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
process.env.ROEX_WEBHOOK_URL = process.env.ROEX_WEBHOOK_URL || 'https://postman-echo.com/post';

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import {
  RoExClient,
  mixPreview,
  pollMixPreview,
  mixFinalAdvanced,
  pollMixFinal,
  mapMusicalStyle,
  mapInstrumentGroup,
  MusicalStyle,
  type InstrumentGroup,
  type MixResult,
} from '../lib/roex';
import { buildAdvancedTrackData, type ParameterChanges } from '../lib/dial/track-data';

interface RescueTrack {
  filename: string;
  instrumentGroup: string;
  presenceSetting: string;
  panPreference: string;
  reverbPreference: string;
  r2Url: string;
}
interface RescueData {
  sessionId: string;
  musicalStyle: string;
  tracks: RescueTrack[];
  latestParams: ParameterChanges[] | null;
}

const ts = () => new Date().toISOString().slice(11, 19);
const log = (m: string) => console.log(`[${ts()}] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pollPreviewReady(client: RoExClient, taskId: string): Promise<void> {
  const start = Date.now();
  for (let i = 0; i < 200; i++) {
    const r = await pollMixPreview(client, taskId, { retrieveFxSettings: false });
    if (r.previewUrl) { log(`  preview READY in ${Math.round((Date.now() - start) / 1000)}s`); return; }
    if (r.status === 'failed') throw new Error('preview failed');
    if (i % 4 === 0) log(`  preview still rendering (${Math.round((Date.now() - start) / 1000)}s)…`);
    await sleep(15_000);
  }
  throw new Error('preview timeout');
}

async function finalWithPoll(
  client: RoExClient, taskId: string, trackData: ReturnType<typeof buildAdvancedTrackData>, trackUrls: string[],
): Promise<MixResult> {
  const start = Date.now();
  let r = await mixFinalAdvanced(client, { taskId, trackData, returnStems: true });
  log(`  final submit → finalUrl=${!!r.finalUrl} status=${r.status} (${Math.round((Date.now() - start) / 1000)}s)`);
  for (let i = 0; i < 200 && !r.finalUrl && r.status !== 'failed'; i++) {
    await sleep(15_000);
    r = await pollMixFinal(client, taskId, trackUrls, { returnStems: true });
    if (i % 4 === 0) log(`  final still rendering (${Math.round((Date.now() - start) / 1000)}s)…`);
  }
  log(`  final done → finalUrl=${!!r.finalUrl} status=${r.status} total=${Math.round((Date.now() - start) / 1000)}s`);
  if (!r.finalUrl) throw new Error(`final produced no URL (status=${r.status} error=${r.error ?? 'none'})`);
  return r;
}

async function main() {
  const prodKey = process.env.ROEX_PROD_API_KEY;
  if (!prodKey) throw new Error('ROEX_PROD_API_KEY not set');
  if (prodKey === process.env.ROEX_DEV_API_KEY) throw new Error('Refusing: PROD key equals DEV key');

  const dataPath = process.argv[2] || '/tmp/yuu-rescue-data.json';
  const data: RescueData = JSON.parse(readFileSync(dataPath, 'utf8'));
  if (!data.tracks?.length) throw new Error('rescue_data has no tracks');
  for (const t of data.tracks) {
    if (!t.r2Url) throw new Error(`track "${t.filename}" has no r2Url — stems not R2-cached, cannot rescue RoEx-only`);
  }

  // musical_style may be stored as the RoEx enum already (e.g. 'POP') OR a UI value ('pop').
  // Use it directly when it's a valid enum; otherwise map the UI value. (mapMusicalStyle('POP')
  // would wrongly fall through to 'OTHER' since the map keys are lowercase UI values.)
  const roexStyle = (Object.values(MusicalStyle) as string[]).includes(data.musicalStyle)
    ? data.musicalStyle
    : mapMusicalStyle(data.musicalStyle);

  const client = new RoExClient({ apiKey: prodKey });
  log(`=== Yuu white-glove rescue — session ${data.sessionId} (${data.tracks.length} stems) ===`);
  log(`musicalStyle=${data.musicalStyle} → roex=${roexStyle}`);
  log('Yuu effects (Layer A) being applied:');
  for (const t of data.tracks) {
    log(`  ${t.filename}: group=${t.instrumentGroup} presence=${t.presenceSetting} pan=${t.panPreference} reverb=${t.reverbPreference}`);
  }
  log(`Yuu params (Layer B): ${data.latestParams ? JSON.stringify(data.latestParams) : 'NONE (preview-level only)'}`);

  const trackUrls = data.tracks.map((t) => t.r2Url);

  // Fresh preview using Yuu's Layer A (presence/pan/reverb) + r2Url stems.
  const previewTracks = data.tracks.map((t) => ({
    trackUrl: t.r2Url,
    instrumentGroup: mapInstrumentGroup(t.instrumentGroup) as InstrumentGroup,
    presenceSetting: t.presenceSetting as never,
    panPreference: t.panPreference as never,
    reverbPreference: t.reverbPreference as never,
  }));
  log('minting fresh preview (Yuu tracks)…');
  const prev = await mixPreview(client, { tracks: previewTracks, musicalStyle: roexStyle as never, returnStems: true });
  if (!prev.taskId) throw new Error('preview mint returned no taskId');
  log(`fresh preview submitted: ${prev.taskId}`);
  await pollPreviewReady(client, prev.taskId);

  // Final applying Yuu's Layer B (EQ/comp/gain). buildAdvancedTrackData matches params to tracks by
  // filename; pass r2Url as the trackUrl (roexUploadUrl GCS expired) so effects ↔ preview tracks align.
  const trackData = buildAdvancedTrackData(
    data.tracks.map((t) => ({ roexUploadUrl: t.r2Url, originalFilename: t.filename })),
    data.latestParams ?? [],
  );
  log('applying Yuu params → final (/retrievefinalmix)…');
  const fin = await finalWithPoll(client, prev.taskId, trackData, trackUrls);

  // Download + md5 to confirm a real, distinct WAV.
  log('downloading final…');
  const res = await fetch(fin.finalUrl!);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const md5 = createHash('md5').update(buf).digest('hex');
  const out = `/tmp/yuu-rescue-final.wav`;
  writeFileSync(out, buf);

  log('=== RESCUE RESULT ===');
  log(`final WAV: ${buf.length} bytes  md5=${md5}  saved=${out}`);
  log(`finalUrl (RoEx, expires — copy to R2 for permanence): ${fin.finalUrl}`);
  if (fin.stemsUrl) log(`stems: ${Object.keys(fin.stemsUrl).length} keys`);
  log(`freshPreviewRoexTaskId=${prev.taskId}  (⑤ orchestration: fresh preview → final SUCCEEDED in prod)`);
  log('=== Yuu の effects(presence/pan/reverb + EQ/comp)を反映した final 生成 完了 ===');
}

main().catch((e) => { console.error('RESCUE ERROR:', e); process.exit(1); });
