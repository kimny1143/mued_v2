/**
 * Idempotent apply of migration 0050 (dial_sessions.first_touch) to .env.local's DATABASE_URL.
 * Safe to run twice. Prints the target host (no creds) for prod-target confirmation.
 *
 * ⚠️ Run this against PRODUCTION Neon BEFORE merging the first-touch PR (the code writes to
 * dial_sessions.first_touch; merge = auto-deploy, so column-first avoids a 42703 missing-column
 * error — same ordering lesson as migration 0048 / 0049).
 *
 * Run (kimny):  npx tsx scripts/apply-migration-0050.ts
 */
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: '.env.local' });
// @ts-expect-error - WebSocket polyfill for Node.js
globalThis.WebSocket = ws;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('ERR: DATABASE_URL not set'); process.exit(1); }
  console.log(`>> Target DB host: ${(() => { try { return new URL(url).host; } catch { return '(unparseable)'; } })()}`);
  console.log('>> Confirm this is the PRODUCTION Neon host before trusting the result.\n');

  const pool = new Pool({ connectionString: url });
  try {
    console.log('>> ALTER TABLE dial_sessions ADD COLUMN IF NOT EXISTS first_touch JSONB ...');
    await pool.query('ALTER TABLE dial_sessions ADD COLUMN IF NOT EXISTS first_touch JSONB');

    const check = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'dial_sessions' AND column_name = 'first_touch'`);
    console.log(check.rows.length === 1
      ? '\n✅ DONE. dial_sessions.first_touch present. Safe to merge/deploy the first-touch PR.'
      : '\n⚠️ Column still not found after apply — investigate (wrong DB? permissions?).');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error('ERR', e?.message ?? e); process.exit(1); });
