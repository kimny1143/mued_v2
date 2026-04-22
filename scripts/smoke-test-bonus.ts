/**
 * Stripe Bonus Smoke Test
 * Directly tests grantFirstPurchaseBonus against the real Neon DB (test Clerk user).
 * Run: npx tsx scripts/smoke-test-bonus.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db';
import { users, dialCreditPacks, dialBonusCampaignLedger } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { grantFirstPurchaseBonus } from '../lib/dial/bonus-campaign';

// Use a synthetic test clerkId (Clerk format: user_<alphanumeric>)
// We insert directly into users table — no real Clerk user needed for this test
const TEST_CLERK_ID = `user_smoke_bonus_${Date.now()}`;
const TEST_EMAIL = `smoke-bonus-${Date.now()}@test.invalid`;

async function main() {
  console.log('=== Bonus Smoke Test (direct DB) ===\n');
  const clerkId = TEST_CLERK_ID;

  try {
    // 1. (Clerk step skipped — synthetic clerkId used)
    console.log(`1. Test clerkId: ${clerkId}`);

    // 2. Seed users table
    process.stdout.write('2. Seeding users table... ');
    await db.insert(users).values({
      clerkId,
      email: TEST_EMAIL,
      dialFirstPurchaseBonusGranted: false,
    }).onConflictDoNothing();
    console.log('OK');

    // 3. First grant — should succeed
    process.stdout.write('3. First grantFirstPurchaseBonus call... ');
    const result1 = await db.transaction(tx => grantFirstPurchaseBonus(clerkId, tx));
    if (!result1.granted) throw new Error(`FAIL: granted=false (expected true). Check dialCampaignState is seeded.`);
    console.log(`OK — granted=true, cost=$${result1.newCumulativeCostUsd?.toFixed(4)}`);

    // 4. Second grant — idempotency (must NOT grant again)
    process.stdout.write('4. Second call (idempotency)... ');
    const result2 = await db.transaction(tx => grantFirstPurchaseBonus(clerkId, tx));
    if (result2.granted) throw new Error('FAIL: granted=true on second call (double-grant!)');
    console.log('OK — granted=false (idempotency confirmed)');

    // 5. Verify bonus pack exists
    process.stdout.write('5. Verifying bonus credit pack in DB... ');
    const bonusPacks = await db.select()
      .from(dialCreditPacks)
      .where(eq(dialCreditPacks.userId, clerkId));
    const bonusCount = bonusPacks.filter(p => p.source === 'bonus').length;
    if (bonusCount !== 1) throw new Error(`FAIL: expected 1 bonus pack, found ${bonusCount}`);
    console.log(`OK — 1 bonus pack (${bonusPacks.find(p => p.source === 'bonus')?.credits}cr)`);

    // 6. Verify flag in users table
    process.stdout.write('6. Verifying dialFirstPurchaseBonusGranted flag... ');
    const [u] = await db.select({ granted: users.dialFirstPurchaseBonusGranted })
      .from(users).where(eq(users.clerkId, clerkId)).limit(1);
    if (!u?.granted) throw new Error('FAIL: flag not set in users table');
    console.log('OK — flag=true');

    console.log('\n✅ ALL SCENARIOS PASSED');
    console.log('   Scenario 1: credit_pack bonus grant ✅');
    console.log('   Scenario 2: idempotency (no double-grant) ✅');

  } catch (e) {
    console.error('\n❌ SMOKE TEST FAILED:', e);
    process.exitCode = 1;
  } finally {
    // Cleanup (order: ledger → packs → users)
    process.stdout.write('\nCleaning up... ');
    const packs = await db.select({ id: dialCreditPacks.id })
      .from(dialCreditPacks).where(eq(dialCreditPacks.userId, clerkId));
    if (packs.length) {
      await db.delete(dialBonusCampaignLedger)
        .where(inArray(dialBonusCampaignLedger.creditPackId, packs.map(p => p.id)));
    }
    await db.delete(dialCreditPacks).where(eq(dialCreditPacks.userId, clerkId));
    await db.delete(users).where(eq(users.clerkId, clerkId));
    console.log('done');
    process.exit(process.exitCode ?? 0);
  }
}

main();
