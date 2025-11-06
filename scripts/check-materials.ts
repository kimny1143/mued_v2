import { config } from 'dotenv';
import { db } from '../db';
import { materials, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Check materials in database
 */

config({ path: '.env.local' });

async function checkMaterials() {
  console.log('🔍 Checking materials in database...\n');

  // Get recent materials
  const recentMaterials = await db
    .select({
      material: materials,
      creator: users,
    })
    .from(materials)
    .leftJoin(users, eq(materials.creatorId, users.id))
    .orderBy(desc(materials.createdAt))
    .limit(10);

  console.log(`Found ${recentMaterials.length} recent materials\n`);

  for (const { material, creator } of recentMaterials) {
    console.log(`📚 Material: ${material.title}`);
    console.log(`   ID: ${material.id}`);
    console.log(`   Type: ${material.type}`);
    console.log(`   Difficulty: ${material.difficulty}`);
    console.log(`   Creator: ${creator?.name || 'Unknown'} (${creator?.email || 'N/A'})`);
    console.log(`   Created: ${material.createdAt.toLocaleString()}`);
    console.log(`   Metadata: ${material.metadata ? 'Present' : 'NULL'}`);

    if (material.metadata) {
      const meta = material.metadata as {
        model?: string;
        tokens?: number;
        generationCost?: number;
      };
      console.log(`   - Model: ${meta.model || 'N/A'}`);
      console.log(`   - Tokens: ${meta.tokens || 'N/A'}`);
      console.log(`   - Cost: ${meta.generationCost ? `$${meta.generationCost.toFixed(4)}` : 'N/A'}`);
    }

    console.log('');
  }

  console.log('✨ Check complete!');
}

checkMaterials()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
