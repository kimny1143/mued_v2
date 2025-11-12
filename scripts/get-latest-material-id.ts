/**
 * Get Latest Material ID
 */

import { db } from '../db';
import { materials } from '../db/schema';
import { desc } from 'drizzle-orm';

async function getLatestMaterialId() {
  try {
    const [latestMaterial] = await db
      .select({
        id: materials.id,
        title: materials.title,
        type: materials.type,
        createdAt: materials.createdAt,
      })
      .from(materials)
      .orderBy(desc(materials.createdAt))
      .limit(1);

    if (latestMaterial) {
      console.log('Latest Material:');
      console.log(`  ID: ${latestMaterial.id}`);
      console.log(`  Title: ${latestMaterial.title}`);
      console.log(`  Type: ${latestMaterial.type}`);
      console.log(`  Created: ${latestMaterial.createdAt}`);
      console.log(`\nURL: http://localhost:3000/dashboard/materials/${latestMaterial.id}`);
    } else {
      console.log('No materials found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

getLatestMaterialId();
