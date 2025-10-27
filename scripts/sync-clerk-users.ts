/**
 * Sync Clerk Users to Database
 *
 * This script synchronizes existing Clerk users to the local database.
 * Run this once to migrate legacy users created before webhook implementation.
 *
 * Usage:
 *   npx tsx scripts/sync-clerk-users.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClerkClient } from '@clerk/backend';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

async function syncClerkUsers() {
  console.log('🔄 Starting Clerk users synchronization...\n');

  // Verify environment variables
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is not set in environment variables');
  }

  console.log('✅ Environment variables loaded\n');

  try {
    // Initialize Clerk client for backend use
    const client = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Fetch all users from Clerk
    const clerkUsers = await client.users.getUserList({ limit: 500 });

    console.log(`📊 Found ${clerkUsers.data.length} users in Clerk\n`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const clerkUser of clerkUsers.data) {
      try {
        // Check if user already exists in database
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkUser.id))
          .limit(1);

        if (existingUser) {
          console.log(`⏭️  Skipping ${clerkUser.id} (already exists)`);
          skipped++;
          continue;
        }

        // Insert new user
        await db.insert(users).values({
          clerkId: clerkUser.id,
          email:
            clerkUser.emailAddresses?.[0]?.emailAddress ||
            clerkUser.username ||
            'unknown@example.com',
          name:
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
            clerkUser.username ||
            'Unknown User',
          profileImageUrl: clerkUser.imageUrl,
          role: 'student',
        });

        console.log(`✅ Synced ${clerkUser.id} - ${clerkUser.emailAddresses?.[0]?.emailAddress}`);
        synced++;
      } catch (error) {
        console.error(`❌ Error syncing ${clerkUser.id}:`, error);
        errors++;
      }
    }

    console.log('\n📈 Synchronization Summary:');
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${clerkUsers.data.length}\n`);

    console.log('✨ Synchronization completed!');
  } catch (error) {
    console.error('❌ Fatal error during synchronization:', error);
    process.exit(1);
  }
}

// Run the script
syncClerkUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
