#!/usr/bin/env tsx

/**
 * Upgrade Dev Account to Premium
 *
 * Upgrades a user to premium tier with all features unlocked.
 *
 * Usage:
 *   npx tsx scripts/upgrade-dev-account.ts                    # Default: DEV_USER_EMAIL env var
 *   npx tsx scripts/upgrade-dev-account.ts user@example.com   # Specify email
 */

import { config } from 'dotenv';
config();

import { db } from '../db';
import { users, subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_EMAIL = process.env.DEV_USER_EMAIL || 'dev@example.com';
const targetEmail = process.argv[2] || DEFAULT_EMAIL;

async function main() {
  console.log(`Looking for user: ${targetEmail}`);

  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, targetEmail)).limit(1);

  if (!user) {
    console.log('❌ User not found');
    process.exit(1);
  }

  console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });

  // Find or create subscription
  const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);

  if (existingSub) {
    console.log('📋 Existing subscription:', { id: existingSub.id, tier: existingSub.tier, status: existingSub.status });

    // Update to premium
    const [updated] = await db
      .update(subscriptions)
      .set({
        tier: 'premium',
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id))
      .returning();

    console.log('✅ Upgraded to premium:', { id: updated.id, tier: updated.tier, status: updated.status });
  } else {
    console.log('📋 No subscription found, creating premium subscription...');

    // Create premium subscription
    const [created] = await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        tier: 'premium',
        status: 'active',
      })
      .returning();

    console.log('✅ Created premium subscription:', { id: created.id, tier: created.tier, status: created.status });
  }

  console.log('\n🎉 Done! All features unlocked for dev account.');
}

main().catch(console.error);
