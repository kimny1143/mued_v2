/**
 * Test Material API
 * 教材APIのレスポンスをテスト
 */

import { getMaterialById } from '../lib/services/ai-material.service';

async function testMaterialAPI() {
  const materialId = 'c286c917-49de-4068-bfda-169a622a1644';

  console.log(`🔍 Testing material API for ID: ${materialId}\n`);

  try {
    const material = await getMaterialById(materialId);

    if (!material) {
      console.log('❌ Material not found (returned null)\n');
      return;
    }

    console.log('✅ Material found!\n');
    console.log('Material data:');
    console.log(`  - ID: ${material.id}`);
    console.log(`  - Title: ${material.title}`);
    console.log(`  - Type: ${material.type}`);
    console.log(`  - Difficulty: ${material.difficulty}`);
    console.log(`  - Status: ${material.status}`);
    console.log(`  - Creator ID: ${material.creatorId}`);

    if (material.content) {
      console.log(`  - Content: ${JSON.stringify(material.content).substring(0, 200)}...`);
    } else {
      console.log('  - Content: NULL');
    }

    if (material.metadata) {
      console.log(`  - Metadata: ${JSON.stringify(material.metadata).substring(0, 200)}...`);
    } else {
      console.log('  - Metadata: NULL');
    }

  } catch (error) {
    console.error('❌ Error fetching material:', error);
  }

  process.exit(0);
}

testMaterialAPI().catch(console.error);
