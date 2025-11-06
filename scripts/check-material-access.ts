import { db } from '../db';
import { materials, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkMaterialAccess() {
  console.log('\n=== AI Generated Materials Access Check ===\n');

  // Get all materials with creator info
  const allMaterials = await db
    .select({
      id: materials.id,
      title: materials.title,
      type: materials.type,
      creatorId: materials.creatorId,
      createdAt: materials.createdAt,
      creator: users,
    })
    .from(materials)
    .leftJoin(users, eq(materials.creatorId, users.id))
    .orderBy(desc(materials.createdAt))
    .limit(10);

  console.log(`Total materials found: ${allMaterials.length}\n`);

  allMaterials.forEach((mat, idx) => {
    console.log(`${idx + 1}. "${mat.title}"`);
    console.log(`   ID: ${mat.id}`);
    console.log(`   Type: ${mat.type}`);
    console.log(`   Creator ID: ${mat.creatorId}`);
    console.log(`   Creator Name: ${mat.creator?.name || 'NULL'}`);
    console.log(`   Creator Clerk ID: ${mat.creator?.clerkId || 'NULL'}`);
    console.log(`   Created: ${mat.createdAt}`);
    console.log('');
  });

  // Get current user info
  const allUsers = await db.select().from(users);
  console.log(`\n=== All Users (${allUsers.length}) ===\n`);
  allUsers.forEach((user) => {
    console.log(`- ${user.name} (${user.email})`);
    console.log(`  Internal ID: ${user.id}`);
    console.log(`  Clerk ID: ${user.clerkId}`);
    console.log('');
  });

  process.exit(0);
}

checkMaterialAccess().catch(console.error);
