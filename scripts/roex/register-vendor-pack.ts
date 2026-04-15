#!/usr/bin/env tsx
/**
 * Register RoEx Vendor Credit Pack
 *
 * Records a bulk credit purchase from RoEx into the roex_vendor_packs table.
 * Run this each time kimny purchases credits from RoEx dashboard.
 *
 * Usage (via shell wrapper):
 *   ./scripts/register_roex_pack.sh <amount_usd> <credits> [note]
 *
 * Usage (direct):
 *   npx tsx scripts/roex/register-vendor-pack.ts 80 10000 "Large pack 2026-04-15"
 *   npx tsx scripts/roex/register-vendor-pack.ts 80 10000
 */

import { db } from '@/db';
import { roexVendorPacks } from '@/db/schema/dial';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const [, , amountArg, creditsArg, ...noteArgs] = process.argv;
const note = noteArgs.join(' ') || null;

if (!amountArg || !creditsArg) {
  console.error('Usage: register-vendor-pack.ts <amount_usd> <credits> [note]');
  console.error('Example: register-vendor-pack.ts 80 10000 "Large pack 2026-04-15"');
  process.exit(1);
}

const amountUsd = parseFloat(amountArg);
const creditsTotal = parseInt(creditsArg, 10);

if (isNaN(amountUsd) || amountUsd <= 0) {
  console.error(`Invalid amount_usd: ${amountArg}`);
  process.exit(1);
}

if (isNaN(creditsTotal) || creditsTotal <= 0) {
  console.error(`Invalid credits: ${creditsArg}`);
  process.exit(1);
}

async function main() {
  console.log(`Registering RoEx vendor pack:`);
  console.log(`  Amount: $${amountUsd}`);
  console.log(`  Credits: ${creditsTotal.toLocaleString()}`);
  console.log(`  Note: ${note ?? '(none)'}`);

  const [inserted] = await db.insert(roexVendorPacks).values({
    purchasedAt: new Date(),
    amountUsd: amountUsd.toFixed(2),
    creditsTotal,
    creditsRemaining: creditsTotal,
    note,
  }).returning();

  console.log(`\n✅ Registered successfully.`);
  console.log(`  ID: ${inserted.id}`);
  console.log(`  purchased_at: ${inserted.purchasedAt.toISOString()}`);

  // Print remaining balance summary
  const result = await db.execute(
    sql`SELECT COALESCE(SUM(credits_remaining), 0) AS total_remaining FROM roex_vendor_packs`
  );
  const totalRemaining = result.rows[0]?.total_remaining ?? 0;
  console.log(`\n📊 Total RoEx credits remaining across all packs: ${Number(totalRemaining).toLocaleString()}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
