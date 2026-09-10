/**
 * Cryo Mix — Phase A driver (FREE portion only, NO purchase).
 *
 * MUEDsp vs Cryo mastering real-audio comparison (Chief protocol 2026-06-22).
 * Phase A = Tier2 = conductor dispatch (no kimny gate). Runs:
 *   upload → run mastering → poll → download MP3 (free, pre-purchase)
 * and STOPS. It NEVER calls client.purchase() / POST /api/api-checkout
 * (= Phase B = Tier3 = kimny gate = first real financial action).
 *
 * Cost guard: origin=dial.mued.jp is billing-exempt + grace period active +
 * no purchase → real cost $0 (triple-safe).
 *
 * Run:  npx tsx --env-file=.env.local scripts/cryo-phase-a.ts
 * Env:  CRYOMIX_API_KEY (secret), CRYOMIX_ORIGIN=https://dial.mued.jp
 *
 * Artifacts: .cryo-phase-a/out/<song>.mp3  +  phase-a-result.json (gitignored)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createCryoMixClient, CryoMixClient } from '../lib/cryomix/client';
import type { CryoMixStatus } from '../lib/cryomix/types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // 3s × 100 = 5 min max (201s song needs headroom)
const OUT_DIR = resolve(process.cwd(), '.cryo-phase-a/out');

interface Song {
  label: string;
  /** Local path to the (already format-converted) WAV to upload. */
  path: string;
  /** Object name sent to Cryo (becomes part of the GCS object). */
  objectName: string;
}

const SONGS: Song[] = [
  {
    label: 'song1_liberation',
    path: resolve(process.cwd(), '.cryo-phase-a/in/song1_liberation_44k16.wav'),
    objectName: 'song1_liberation_44k16.wav',
  },
  {
    label: 'song2_2mix',
    path: resolve(process.cwd(), '.cryo-phase-a/in/song2_2mix_48k24.wav'),
    objectName: 'song2_2mix_48k24.wav',
  },
];

interface StepResult {
  label: string;
  sessionId: string | null;
  ok: boolean;
  steps: Record<string, { ok: boolean; ms: number; note?: string }>;
  uploadBytes?: number;
  pollStatus?: CryoMixStatus;
  pollPercentage?: number;
  downloadKeys?: string[];
  mp3Key?: string;
  mp3SavedBytes?: number;
  mp3SavedPath?: string;
  error?: string;
}

function nowNote(t0: number): string {
  return `+${((Date.now() - t0) / 1000).toFixed(1)}s`;
}

async function runSong(song: Song, runStart: number): Promise<StepResult> {
  // Fresh client per song → fresh Session-Id (one Cryo job per song).
  const client: CryoMixClient = createCryoMixClient();
  const res: StepResult = { label: song.label, sessionId: null, ok: false, steps: {} };

  const time = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const s = Date.now();
    try {
      const out = await fn();
      res.steps[name] = { ok: true, ms: Date.now() - s };
      return out;
    } catch (e) {
      res.steps[name] = { ok: false, ms: Date.now() - s, note: e instanceof Error ? e.message : String(e) };
      throw e;
    }
  };

  try {
    // ── Step 1: signed upload URL ───────────────────────────────────────
    console.log(`[${song.label} ${nowNote(runStart)}] 1/5 upload: requesting signed URL`);
    const uploadRes = await time('upload_presign', () =>
      client.upload({ objectNames: [song.objectName], contentType: 'audio/wav' }),
    );
    res.sessionId = client.getSessionId();
    const signedUrl = Object.values(uploadRes.data.upload_object_names)[0];
    if (!signedUrl) throw new Error('No signed URL returned by Cryo multi-upload');
    console.log(`[${song.label} ${nowNote(runStart)}]   sessionId=${res.sessionId}`);

    // ── Step 2: PUT local WAV bytes to signed GCS URL ───────────────────
    const fileBuf = await readFile(song.path);
    const ab = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);
    res.uploadBytes = fileBuf.byteLength;
    console.log(`[${song.label} ${nowNote(runStart)}] 2/5 upload: PUT ${(fileBuf.byteLength / 1024 / 1024).toFixed(1)}MB`);
    await time('upload_put', () => client.uploadToSignedUrl(signedUrl, ab as ArrayBuffer, 'audio/wav'));

    // ── Step 3: run mastering (default neutral macros) ──────────────────
    console.log(`[${song.label} ${nowNote(runStart)}] 3/5 mastering: POST /api/mastering (neutral)`);
    await time('run_mastering', () => client.runMastering());

    // ── Step 4: poll progress ───────────────────────────────────────────
    console.log(`[${song.label} ${nowNote(runStart)}] 4/5 poll: GET /api/percentage`);
    let status: CryoMixStatus = 'pending';
    let percentage = 0;
    const pollStart = Date.now();
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const prog = await client.pollProgress();
        status = prog.data.status;
        percentage = prog.data.percentage_complete;
        if (i % 3 === 0 || status !== 'processing') {
          console.log(`[${song.label} ${nowNote(runStart)}]   poll ${i + 1}: ${status} (${percentage}%)`);
        }
      } catch (e) {
        // 503 right after run = tracking not ready yet → retry
        console.log(`[${song.label} ${nowNote(runStart)}]   poll ${i + 1}: retry (${e instanceof Error ? e.message : e})`);
        continue;
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled') break;
    }
    res.pollStatus = status;
    res.pollPercentage = percentage;
    res.steps['poll'] = { ok: status === 'completed', ms: Date.now() - pollStart, note: `final=${status} ${percentage}%` };
    if (status !== 'completed') throw new Error(`Mastering did not complete: ${status} (${percentage}%)`);

    // ── Step 5: download (NO purchase) → MP3 only ───────────────────────
    // multi-download returns MP3 free; WAV is gated behind purchase (Phase B).
    console.log(`[${song.label} ${nowNote(runStart)}] 5/5 download: POST /api/signed-url/multi-download (NO purchase)`);
    const dl = await time('download_urls', () => client.download(3600));
    const urls = dl.data.download_audio_urls ?? {};
    res.downloadKeys = Object.keys(urls);
    console.log(`[${song.label} ${nowNote(runStart)}]   download keys: ${res.downloadKeys.join(', ') || '(none)'}`);

    const mp3Key = res.downloadKeys.find((k) => k.toLowerCase().endsWith('.mp3'));
    if (!mp3Key) throw new Error(`No MP3 key in download response (keys: ${res.downloadKeys.join(', ')})`);
    res.mp3Key = mp3Key;
    const mp3Url = urls[mp3Key];

    // Fetch ONLY the MP3 (free). WAV keys, if present, are left untouched (Phase B).
    const mp3Res = await time('download_mp3', async () => {
      const r = await fetch(mp3Url);
      if (!r.ok) throw new Error(`MP3 fetch failed: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
    const outPath = resolve(OUT_DIR, `${song.label}.mp3`);
    await writeFile(outPath, mp3Res);
    res.mp3SavedBytes = mp3Res.byteLength;
    res.mp3SavedPath = outPath;
    console.log(`[${song.label} ${nowNote(runStart)}]   ✓ MP3 saved: ${outPath} (${(mp3Res.byteLength / 1024 / 1024).toFixed(2)}MB)`);

    res.ok = true;
    return res;
  } catch (e) {
    res.error = e instanceof Error ? e.message : String(e);
    console.error(`[${song.label} ${nowNote(runStart)}]   ✗ ${res.error}`);
    return res;
  }
}

async function main() {
  // Hard structural guard: this script must never reference purchase.
  console.log('=== Cryo Phase A (FREE: upload→master→poll→MP3, NO purchase) ===');
  console.log(`origin=${process.env.CRYOMIX_ORIGIN ?? '(unset)'} | base=${process.env.CRYOMIX_API_BASE_URL ?? 'https://platform.cryo-mix.com (default)'}`);
  console.log(`API key present: ${process.env.CRYOMIX_API_KEY ? 'yes' : 'NO — will fail'}`);

  const runStart = Date.now();
  const results: StepResult[] = [];
  for (const song of SONGS) {
    console.log(`\n--- ${song.label} ---`);
    results.push(await runSong(song, runStart));
  }

  const summary = {
    ranAtMs: runStart,
    origin: process.env.CRYOMIX_ORIGIN ?? null,
    purchaseCalled: false,
    results,
  };
  const summaryPath = resolve(OUT_DIR, 'phase-a-result.json');
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.label}: ${r.ok ? '✓ MP3 OK' : '✗ ' + (r.error ?? 'failed')} | poll=${r.pollStatus ?? '-'} | keys=[${(r.downloadKeys ?? []).join(', ')}]`);
  }
  console.log(`summary → ${summaryPath}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

void main();
