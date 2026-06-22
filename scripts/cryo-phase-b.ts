/**
 * Cryo Mix — Phase B driver (purchase → WAV DL). ONE SONG PER INVOCATION.
 *
 * ⚠️ THIS SCRIPT FIRES THE REAL PURCHASE (POST /api/api-checkout) = Tier3
 * financial action. Run ONLY after explicit in-chat user authorization
 * (2026-06-22: kimny authorized "両曲承認・song-1-first guard" via AskUserQuestion).
 *
 * Cost guard: expected $0 (grace〜2026-07-15 + origin dial.mued.jp billing-exempt).
 * Run song1 FIRST, inspect the printed purchase response, and only run song2
 * after song1 is confirmed clean ($0 / success, no charge / subscription error).
 *
 * Secret hygiene: reads CRYOMIX_API_KEY from env (never printed). Signed download
 * URLs are fetched internally and NEVER logged/printed.
 *
 * Run:  npx tsx --env-file=.env.local scripts/cryo-phase-b.ts --song=1
 *       (inspect output) then  --song=2
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createCryoMixClient, CryoMixClient } from '../lib/cryomix/client';
import type { CryoMixStatus } from '../lib/cryomix/types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100;
const OUT_DIR = resolve(process.cwd(), '.cryo-phase-a/out');

interface SongB {
  label: string;
  sessionId: string;       // Phase A session to reuse
  inputPath: string;       // local WAV (for fresh-run fallback)
  objectName: string;
}

const SONGS: Record<string, SongB> = {
  '1': {
    label: 'song1_liberation',
    sessionId: '28044048-bf62-4d77-a2ba-09fb4ca8207e',
    inputPath: resolve(process.cwd(), '.cryo-phase-a/in/song1_liberation_44k16.wav'),
    objectName: 'song1_liberation_44k16.wav',
  },
  '2': {
    label: 'song2_2mix',
    sessionId: '1243bf24-fbff-4582-b280-8d38c4341d58',
    inputPath: resolve(process.cwd(), '.cryo-phase-a/in/song2_2mix_48k24.wav'),
    objectName: 'song2_2mix_48k24.wav',
  },
};

function arg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=', 2)[1] : undefined;
}

async function freshRun(client: CryoMixClient, song: SongB): Promise<void> {
  console.log(`[${song.label}] fresh run: upload→master→poll (session reuse failed)`);
  const up = await client.upload({ objectNames: [song.objectName], contentType: 'audio/wav' });
  const signedUrl = Object.values(up.data.upload_object_names)[0];
  if (!signedUrl) throw new Error('No signed upload URL');
  const buf = await readFile(song.inputPath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  await client.uploadToSignedUrl(signedUrl, ab as ArrayBuffer, 'audio/wav');
  await client.runMastering();
  let status: CryoMixStatus = 'pending';
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const p = await client.pollProgress();
      status = p.data.status;
      if (i % 4 === 0 || status !== 'processing') console.log(`  poll ${i + 1}: ${status} (${p.data.percentage_complete}%)`);
    } catch { continue; }
    if (status === 'completed' || status === 'failed' || status === 'cancelled') break;
  }
  if (status !== 'completed') throw new Error(`fresh run did not complete: ${status}`);
}

async function main() {
  const songKey = arg('song');
  if (!songKey || !SONGS[songKey]) {
    console.error('usage: cryo-phase-b.ts --song=1|2');
    process.exit(2);
  }
  const song = SONGS[songKey];
  console.log(`=== Cryo Phase B — ${song.label} (PURCHASE → WAV) ===`);
  console.log(`origin=${process.env.CRYOMIX_ORIGIN ?? '(unset)'} | API key present: ${process.env.CRYOMIX_API_KEY ? 'yes' : 'NO'}`);

  const client = createCryoMixClient();
  client.setSessionId(song.sessionId);

  // ── Reuse Phase A session if its master is still retrievable ──────────
  let mode = 'reused';
  try {
    const pre = await client.download(600);
    const keys = Object.keys(pre.data.download_audio_urls ?? {});
    const hasMaster = keys.some((k) => k.toLowerCase().includes('finalmaster'));
    console.log(`[${song.label}] session reuse check — pre-purchase keys: ${keys.join(', ') || '(none)'}`);
    if (!hasMaster) throw new Error('no completed master in reused session');
  } catch (e) {
    console.log(`[${song.label}] reuse unavailable (${e instanceof Error ? e.message : e}) → fresh run`);
    mode = 'fresh';
    await freshRun(client, song);
  }

  // ── PURCHASE (Tier3 financial action) ─────────────────────────────────
  console.log(`[${song.label}] PURCHASE: POST /api/api-checkout (expected $0: grace + billing-exempt origin)`);
  const purchaseRes = await client.purchase({ firstName: 'MUED', lastName: 'Test', email: 'test@mued.jp' });
  // Print status envelope for cost-guard inspection (status/message/code = API status, not secret).
  console.log(`[${song.label}] purchase response: status=${purchaseRes.status} code=${purchaseRes.code} message=${JSON.stringify(purchaseRes.message)}`);
  console.log(`[${song.label}] purchase data: ${JSON.stringify(purchaseRes.data)}`);

  // Cost guard: halt on any non-success / subscription / charge signal.
  const msg = `${purchaseRes.status} ${purchaseRes.message} ${JSON.stringify(purchaseRes.data)}`.toLowerCase();
  const badSignals = ['active subscription required', 'payment required', 'declined', 'failed', 'error', 'unauthorized'];
  const hit = badSignals.find((s) => msg.includes(s));
  if (hit) {
    console.error(`[${song.label}] ✗ COST GUARD HALT: purchase response contains "${hit}" — STOPPING, not downloading WAV.`);
    process.exit(1);
  }

  // ── Re-download → WAV should now be unlocked ──────────────────────────
  const dl = await client.download(3600);
  const urls = dl.data.download_audio_urls ?? {};
  const keys = Object.keys(urls);
  console.log(`[${song.label}] post-purchase download keys: ${keys.join(', ')}`);
  const wavKey = keys.find((k) => k.toLowerCase().endsWith('.wav'));
  if (!wavKey) {
    console.error(`[${song.label}] ✗ No .wav key after purchase (keys: ${keys.join(', ')}) — purchase may not have unlocked WAV.`);
    process.exit(1);
  }
  // Fetch WAV bytes (DO NOT print the signed URL).
  const wavRes = await fetch(urls[wavKey]);
  if (!wavRes.ok) throw new Error(`WAV fetch failed: ${wavRes.status}`);
  const wavBuf = Buffer.from(await wavRes.arrayBuffer());
  const wavPath = resolve(OUT_DIR, `${song.label}_cryo_master.wav`);
  await writeFile(wavPath, wavBuf);
  console.log(`[${song.label}] ✓ WAV saved: ${wavPath} (${(wavBuf.byteLength / 1024 / 1024).toFixed(2)}MB)`);

  // Summary (no secrets / no URLs).
  const summary = {
    label: song.label,
    mode,
    purchase: { status: purchaseRes.status, code: purchaseRes.code, message: purchaseRes.message, data: purchaseRes.data },
    postPurchaseKeys: keys,
    wavKey,
    wavBytes: wavBuf.byteLength,
    wavPath,
  };
  await writeFile(resolve(OUT_DIR, `phase-b-${song.label}.json`), JSON.stringify(summary, null, 2));
  console.log(`[${song.label}] === DONE (mode=${mode}) ===`);
}

void main();
