/**
 * Idempotent apply of migration 0059 (plugin_entitlements.portal_registered_at) to .env.local's
 * DATABASE_URL. Safe to run twice (ADD COLUMN IF NOT EXISTS). Prints the target host (no creds) for
 * prod-target confirmation — same pattern as apply-migration-0049/0050/0051.
 *
 * ⚠️ Run this against PRODUCTION Neon BEFORE merging PR #710 (migration-first). markPortalRegistered
 * writes portal_registered_at on the authed portal view; it is FAIL-OPEN (a missing column is caught
 * and swallowed), so a merge before apply would not crash — but the registration signal would silently
 * record nothing. Apply first so the signal is live the moment the code deploys.
 *
 * Run (kimny):  npx tsx scripts/apply-migration-0059.ts
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
    console.log('>> ALTER TABLE plugin_entitlements ADD COLUMN IF NOT EXISTS portal_registered_at ...');
    await pool.query(
      `ALTER TABLE plugin_entitlements ADD COLUMN IF NOT EXISTS portal_registered_at timestamp`,
    );

    const check = await pool.query(
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_name = 'plugin_entitlements' AND column_name = 'portal_registered_at'`,
    );
    if (check.rows.length === 1) {
      const { data_type, is_nullable } = check.rows[0];
      console.log(`\n✅ DONE. portal_registered_at present (type=${data_type}, nullable=${is_nullable}).`);
      console.log('   Safe to merge/deploy PR #710.');
    } else {
      console.log('\n⚠️ Column still not found after apply — investigate (wrong DB? permissions?).');
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error('ERR', e?.message ?? e); process.exit(1); });
