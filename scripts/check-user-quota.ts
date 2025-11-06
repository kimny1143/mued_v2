import { config } from 'dotenv';
import { db } from '../db';
import { users, subscriptions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Check current user's quota and usage
 */

config({ path: '.env.local' });

async function checkUserQuota() {
  console.log('🔍 Checking user quota...\n');

  // Get all users
  const allUsers = await db.select().from(users);

  console.log(`Found ${allUsers.length} users\n`);

  for (const user of allUsers) {
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`   Clerk ID: ${user.clerkId}`);

    // Get subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (subscription) {
      console.log(`   Tier: ${subscription.tier}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   AI Materials Used: ${subscription.aiMaterialsUsed}`);
      console.log(`   Reservations Used: ${subscription.reservationsUsed}`);
      console.log(`   Stripe Customer ID: ${subscription.stripeCustomerId || 'None'}`);
      console.log(`   Stripe Subscription ID: ${subscription.stripeSubscriptionId || 'None'}`);
    } else {
      console.log(`   No subscription found (default to freemium)`);
    }

    console.log('');
  }

  console.log('✨ Check complete!');
}

checkUserQuota()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
