#!/usr/bin/env tsx
/**
 * MUEDial 60pt cert — faithful stem upload via the REAL dial API (prod), driven from a script.
 * Mirrors exactly what the browser does: presign → PUT to RoEx GCS signed URL → confirm.
 * Auth = guest token (X-Dial-Guest-Token). Uses prod's RoEx key (server-side), so it works
 * where local scripts can't (local key is dev). file_upload tool can't take host paths → this.
 *
 *   npx tsx scripts/cert-upload-stems.ts <sessionId> <guestToken> [--one]
 *
 * Stems = the 45s-trimmed WAVs in /tmp/cert-stems. --one uploads just the first (fail-fast test).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import * as fs from 'fs';

const BASE = process.env.DIAL_BASE_URL || 'https://dial.mued.jp';
const DIR = '/tmp/cert-stems';

const STEMS: { path: string; fileName: string; group: string }[] = [
  { path: `${DIR}/0_Drums.wav`, fileName: 'drums.wav', group: 'DRUMS' },
  { path: `${DIR}/1_Bass.wav`, fileName: 'bass.wav', group: 'BASS' },
  { path: `${DIR}/2_Percussion.wav`, fileName: 'percussion.wav', group: 'DRUMS' },
  { path: `${DIR}/3_Synth.wav`, fileName: 'synth.wav', group: 'SYNTH' },
  { path: `${DIR}/4_Vocal.wav`, fileName: 'vocal.wav', group: 'VOCAL' },
  { path: `${DIR}/5_Background_Vocal1.wav`, fileName: 'bgvocal.wav', group: 'VOCAL' },
  { path: `${DIR}/6_Brass.wav`, fileName: 'brass.wav', group: 'BRASS' },
  { path: `${DIR}/7_wood.wav`, fileName: 'wood.wav', group: 'OTHER' },
  { path: `${DIR}/8_Strings.wav`, fileName: 'strings.wav', group: 'STRINGS' },
];

async function uploadOne(sessionId: string, token: string, s: { path: string; fileName: string; group: string }) {
  const h = { 'Content-Type': 'application/json', 'X-Dial-Guest-Token': token };
  // 1. presign
  const pres = await fetch(`${BASE}/api/dial/upload/presign`, {
    method: 'POST', headers: h, body: JSON.stringify({ fileName: s.fileName, sessionId }),
  });
  if (!pres.ok) throw new Error(`presign ${s.fileName} → ${pres.status} ${await pres.text().catch(() => '')}`);
  const pj = await pres.json();
  const signedUrl = pj.data?.signedUrl ?? pj.signedUrl;
  const readableUrl = pj.data?.readableUrl ?? pj.readableUrl;
  if (!signedUrl || !readableUrl) throw new Error(`presign ${s.fileName} → no urls: ${JSON.stringify(pj)}`);

  // 2. PUT the WAV to the GCS signed URL (Content-Type must match the signed audio/wav)
  const body = fs.readFileSync(s.path);
  const put = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body });
  if (!put.ok) throw new Error(`PUT ${s.fileName} → ${put.status} ${await put.text().catch(() => '')}`);

  // 3. confirm
  const conf = await fetch(`${BASE}/api/dial/upload/confirm`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ sessionId, fileName: s.fileName, readableUrl, instrumentGroup: s.group }),
  });
  if (!conf.ok) throw new Error(`confirm ${s.fileName} → ${conf.status} ${await conf.text().catch(() => '')}`);
  const cj = await conf.json();
  const trackId = cj.data?.track?.id ?? cj.data?.id ?? cj.track?.id ?? '?';
  console.log(`  ✓ ${s.fileName.padEnd(14)} [${s.group}] track=${String(trackId).slice(0, 8)} (${(body.length / 1e6).toFixed(1)}MB)`);
}

async function main() {
  const [sessionId, token] = process.argv.slice(2);
  const one = process.argv.includes('--one');
  const fromArg = process.argv.find((a) => a.startsWith('--from='));
  const from = fromArg ? parseInt(fromArg.split('=')[1], 10) : 0;
  if (!sessionId || !token) { console.error('usage: cert-upload-stems.ts <sessionId> <guestToken> [--one] [--from=N]'); process.exit(1); }
  const list = one ? STEMS.slice(0, 1) : STEMS.slice(from);
  console.log(`uploading ${list.length} stem(s) to ${sessionId.slice(0, 8)} via ${BASE} ...`);
  for (const s of list) await uploadOne(sessionId, token, s);
  console.log('done.');
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e.message); process.exit(1); });
