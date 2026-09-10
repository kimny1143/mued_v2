#!/usr/bin/env tsx
/**
 * MUEDial 60pt cert — (A) full-mix provisioning. READY-TO-RUN; executes prod side only on GO.
 *
 * Real separated stems are 9×60MB WAV (can't browser-upload). This hosts them on Vercel Blob
 * (trimmed to 60s ≈ 10MB each) and seeds dedicated TEST sessions whose dial_tracks point at the
 * Blob URLs, so RoEx fetches real stems for a real mix→master→DL loop (no UI upload needed).
 *
 *   npx tsx scripts/cert-provision.ts host                 # trim + upload 9 stems → /tmp manifest  [touches prod Blob — run on GO]
 *   npx tsx scripts/cert-provision.ts seed-sql [N]         # print INSERT SQL for N sessions (dry, review)
 *   npx tsx scripts/cert-provision.ts seed [N]             # apply the seed (prod DB write — run on GO w/ auth)
 *   npx tsx scripts/cert-provision.ts cleanup              # del Blob assets + DELETE the test sessions
 *
 * Hosting = Vercel Blob (BLOB_READ_WRITE_TOKEN). Seed = empty paid dialogue+omakase-mastering
 * guest sessions (Stripe 課金なし) + 9 tracks each. guest_token generated at apply (not persisted).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import { put, del } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const SRC_DIR = 'docs/sunogen_audio/muedial/multitracks/Track 2 liberation';
const WORK = '/tmp/cert-stems';
const MANIFEST = '/tmp/cert-stems-manifest.json';
const TRIM_SEC = 60;
const BLOB_PREFIX = 'cert-stems/liberation'; // del-able namespace

// stem file → dial_tracks.instrument_group (UPPERCASE RoEx values seen in real dial_tracks data).
const STEMS: { file: string; group: string }[] = [
  { file: '0 Drums.wav', group: 'DRUMS' },
  { file: '1 Bass.wav', group: 'BASS' },
  { file: '2 Percussion.wav', group: 'DRUMS' },
  { file: '3 Synth.wav', group: 'SYNTH' },
  { file: '4 Vocal.wav', group: 'VOCAL' },
  { file: '5 Background Vocal1.wav', group: 'VOCAL' },
  { file: '6 Brass.wav', group: 'BRASS' },
  { file: '7 wood.wav', group: 'OTHER' },
  { file: '8 Strings.wav', group: 'STRINGS' },
];

type ManifestEntry = { file: string; group: string; url: string };

async function host() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not set');
  fs.mkdirSync(WORK, { recursive: true });
  const manifest: ManifestEntry[] = [];
  for (const s of STEMS) {
    const src = `${SRC_DIR}/${s.file}`;
    const safe = s.file.replace(/[^a-zA-Z0-9.]+/g, '_');
    const trimmed = `${WORK}/${safe}`;
    // trim first TRIM_SEC, 44.1k stereo 16-bit PCM (aligned start → stems stay in sync)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-t', String(TRIM_SEC), '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', trimmed]);
    const body = fs.readFileSync(trimmed);
    const { url } = await put(`${BLOB_PREFIX}/${safe}`, body, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: 'audio/wav', allowOverwrite: true });
    console.log(`hosted ${s.file} [${s.group}] → ${url} (${(body.length / 1e6).toFixed(1)}MB)`);
    manifest.push({ file: s.file, group: s.group, url });
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nmanifest → ${MANIFEST} (${manifest.length} stems)`);
}

function loadManifest(): ManifestEntry[] {
  if (!fs.existsSync(MANIFEST)) throw new Error(`no manifest at ${MANIFEST} — run 'host' first`);
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

/** Build the seed SQL for N sessions (empty paid dialogue+omakase-mastering) + their 9 tracks. */
function buildSeedSql(n: number, m: ManifestEntry[]): string {
  const sessions = `INSERT INTO dial_sessions
  (id, user_id, mode, status, state, musical_style, title, guest_email,
   guest_token, guest_token_expires_at, payment_status, is_free_campaign,
   mix_check_count, paid_cycle_count, preview_count,
   base_cycle_limit, additional_cycles_purchased, additional_cycle_limit,
   mastering_mode, draft_number, created_at, updated_at)
SELECT gen_random_uuid(), NULL, 'dialogue', 'uploading', 'uploading', 'POP',
  'E2E 60pt cert ' || n || ' (TEST — safe to delete)', 'e2e-cert-' || n || '@mued.invalid',
  encode(gen_random_bytes(32), 'hex'), now() + interval '7 days', 'paid', false,
  0, 0, 0, 5, 0, 5, 'omakase', 1, now(), now()
FROM generate_series(1, ${n}) AS n
RETURNING id, title, guest_token;`;

  const tracks = m
    .map(
      (e, i) =>
        `  (s.id, ${sqlStr(e.file)}, ${sqlStr(e.group)}, ${sqlStr(e.url)}, ${sqlStr(e.url)}, now() + (interval '1 ms' * ${i}))`,
    )
    .join(',\n');
  const trackInsert = `-- after the session insert above, for EACH new session s.id, insert the 9 tracks:
INSERT INTO dial_tracks (session_id, original_filename, instrument_group, r2_url, roex_upload_url, uploaded_at)
SELECT s.id, t.fn, t.grp, t.url, t.url, now() + (interval '1 ms' * t.ord)
FROM (SELECT id FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid') s
CROSS JOIN (VALUES
${m.map((e, i) => `  (${sqlStr(e.file)}, ${sqlStr(e.group)}, ${sqlStr(e.url)}, ${i})`).join(',\n')}
) AS t(fn, grp, url, ord);`;
  return `${sessions}\n\n${trackInsert}`;
  void tracks;
}
function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function seedSql(n: number) {
  console.log(buildSeedSql(n, loadManifest()));
}

async function seedApply(n: number) {
  const m = loadManifest();
  const created = (await sql`
    INSERT INTO dial_sessions
      (id, user_id, mode, status, state, musical_style, title, guest_email,
       guest_token, guest_token_expires_at, payment_status, is_free_campaign,
       mix_check_count, paid_cycle_count, preview_count,
       base_cycle_limit, additional_cycles_purchased, additional_cycle_limit,
       mastering_mode, draft_number, created_at, updated_at)
    SELECT gen_random_uuid(), NULL, 'dialogue', 'uploading', 'uploading', 'POP',
      'E2E 60pt cert ' || g || ' (TEST — safe to delete)', 'e2e-cert-' || g || '@mued.invalid',
      encode(gen_random_bytes(32), 'hex'), now() + interval '7 days', 'paid', false,
      0, 0, 0, 5, 0, 5, 'omakase', 1, now(), now()
    FROM generate_series(1, ${n}) AS g
    RETURNING id, title, guest_token`) as { id: string; title: string; guest_token: string }[];

  for (const s of created) {
    for (let i = 0; i < m.length; i++) {
      const e = m[i];
      await sql`INSERT INTO dial_tracks (session_id, original_filename, instrument_group, r2_url, roex_upload_url, uploaded_at)
        VALUES (${s.id}, ${e.file}, ${e.group}, ${e.url}, ${e.url}, now())`;
    }
  }
  console.log(`seeded ${created.length} sessions × ${m.length} tracks. drive URLs (runtime only):`);
  const base = process.env.DIAL_BASE_URL || 'https://dial.mued.jp';
  for (const s of created) console.log(`${base}/dial/${s.id}?token=${s.guest_token}  [${s.title}]`);
}

async function cleanup() {
  // del Blob assets
  const m = fs.existsSync(MANIFEST) ? loadManifest() : [];
  for (const e of m) { try { await del(e.url, { token: process.env.BLOB_READ_WRITE_TOKEN }); console.log('del blob', e.file); } catch { /* ignore */ } }
  // delete the test sessions (tracks cascade if FK, else delete tracks first)
  await sql`DELETE FROM dial_tracks WHERE session_id IN (SELECT id FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid')`;
  const del2 = await sql`DELETE FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid' RETURNING id`;
  console.log(`deleted ${del2.length} cert sessions`);
}

async function main() {
  const cmd = process.argv[2];
  const n = parseInt(process.argv[3] || '3', 10);
  if (cmd === 'host') return host();
  if (cmd === 'seed-sql') return seedSql(n);
  if (cmd === 'seed') return seedApply(n);
  if (cmd === 'cleanup') return cleanup();
  console.error('cmd must be: host | seed-sql [N] | seed [N] | cleanup');
  process.exit(1);
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e.message); process.exit(1); });
