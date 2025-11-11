/**
 * Test OpenAI ABC Generation
 *
 * Usage: npx tsx scripts/test-openai-abc-generation.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateAbcWithOpenAI } from '../lib/openai-abc-generator';

async function testAbcGeneration() {
  console.log('🎵 Testing OpenAI ABC Generation...\n');

  const testCases = [
    {
      name: 'Beginner Piano - C Major Scale',
      params: {
        subject: 'ピアノ',
        topic: 'C メジャースケール',
        difficulty: 'beginner' as const,
        instrument: 'piano',
        additionalContext: '初心者向けの基本的なスケール練習',
      },
    },
    {
      name: 'Intermediate Guitar - Arpeggio Exercise',
      params: {
        subject: 'クラシックギター',
        topic: 'アルペジオ',
        difficulty: 'intermediate' as const,
        instrument: 'guitar',
        additionalContext: '中級者向けのアルペジオ練習曲',
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('Parameters:', testCase.params);
    console.log('\nGenerating...\n');

    const startTime = Date.now();

    try {
      const result = await generateAbcWithOpenAI(testCase.params);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        console.log('✅ Generation successful!');
        console.log(`⏱️  Duration: ${duration}s`);
        console.log('\nMetadata:', result.metadata);
        console.log('\nABC Notation (first 300 chars):');
        console.log(result.abcNotation?.substring(0, 300));
        console.log('...');
        console.log(`\nTotal length: ${result.abcNotation?.length} characters`);
      } else {
        console.log('❌ Generation failed!');
        console.log('Error:', result.error);
      }
    } catch (error) {
      console.log('❌ Exception occurred!');
      console.error(error);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ Test completed!');
  console.log(`${'='.repeat(60)}\n`);
}

testAbcGeneration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
