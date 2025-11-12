/**
 * Check Material Content Structure
 */

import { db } from '../db';
import { materials } from '../db/schema';
import { eq } from 'drizzle-orm';

async function checkMaterialContent() {
  try {
    const materialId = '9a2bb1eb-8db1-42c9-bd3a-620453074047';

    const [material] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    if (!material) {
      console.log('Material not found');
      return;
    }

    console.log('=== Material Data ===');
    console.log('Title:', material.title);
    console.log('Type:', material.type);
    console.log('\n=== Raw Content ===');
    console.log(material.content);

    console.log('\n=== Parsed Content ===');
    try {
      const parsed = typeof material.content === 'string'
        ? JSON.parse(material.content)
        : material.content;
      console.log(JSON.stringify(parsed, null, 2));

      console.log('\n=== Content Structure Check ===');
      console.log('Has type:', 'type' in parsed);
      console.log('Has abcNotation:', 'abcNotation' in parsed);
      console.log('Has learningPoints:', 'learningPoints' in parsed);
      console.log('Has practiceInstructions:', 'practiceInstructions' in parsed);
    } catch (e) {
      console.log('Failed to parse content as JSON');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkMaterialContent();
