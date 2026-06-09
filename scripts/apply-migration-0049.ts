/**
 * Idempotent apply of migration 0049 (dial_admin_access_log) to .env.local's DATABASE_URL.
 * Safe to run twice. Prints the target host (no creds) for prod-target confirmation.
 *
 * ⚠️ Run this against PRODUCTION Neon BEFORE merging the admin-session-view PR (the code
 * writes to dial_admin_access_log; merge = auto-deploy, so table-first avoids a missing-table
 * error — same ordering lesson as migration 0048).
 *
 * Run (kimny):  npx tsx scripts/apply-migration-0049.ts
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
    console.log('>> CREATE TABLE IF NOT EXISTS dial_admin_access_log ...');
    await pool.query(`CREATE TABLE IF NOT EXISTS dial_admin_access_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      target_session_id UUID NOT NULL,
      access_type TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dial_admin_access_target ON dial_admin_access_log(target_session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dial_admin_access_created ON dial_admin_access_log(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dial_admin_access_admin ON dial_admin_access_log(admin_user_id)`);

    const check = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'dial_admin_access_log'`);
    console.log(check.rows.length === 1
      ? '\n✅ DONE. dial_admin_access_log present. Safe to merge/deploy the admin PR.'
      : '\n⚠️ Table still not found after apply — investigate (wrong DB? permissions?).');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error('ERR', e?.message ?? e); process.exit(1); });
