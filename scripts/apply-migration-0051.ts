/**
 * Idempotent apply of migration 0051 (dial_comp_ledger) to .env.local's DATABASE_URL.
 * Safe to run twice. Prints the target host (no creds) for prod-target confirmation.
 *
 * ⚠️ Run this against PRODUCTION Neon BEFORE merging the comp PR (the comp endpoint writes to
 * dial_comp_ledger; merge = auto-deploy, so table-first avoids a missing-table error — same
 * ordering lesson as migration 0048 / 0049).
 *
 * Run (kimny):  npx tsx scripts/apply-migration-0051.ts
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
    console.log('>> CREATE TABLE IF NOT EXISTS dial_comp_ledger ...');
    await pool.query(`CREATE TABLE IF NOT EXISTS dial_comp_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      session_id UUID NOT NULL,
      comp_type TEXT NOT NULL,
      estimated_cr INTEGER NOT NULL,
      reason TEXT,
      granted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS dial_comp_ledger_unique_session ON dial_comp_ledger(session_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_dial_comp_ledger_admin ON dial_comp_ledger(admin_user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_dial_comp_ledger_granted ON dial_comp_ledger(granted_at)');

    const check = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'dial_comp_ledger'`);
    console.log(check.rows.length === 1
      ? '\n✅ DONE. dial_comp_ledger present. Safe to merge/deploy the comp PR.'
      : '\n⚠️ Table still not found after apply — investigate (wrong DB? permissions?).');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error('ERR', e?.message ?? e); process.exit(1); });
