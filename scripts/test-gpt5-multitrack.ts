#!/usr/bin/env npx tsx

/**
 * GPT-5 MultiTrackJSON Generation Test
 *
 * Purpose: Validate GPT-5 can generate multi-track music materials
 *
 * GPT-5 Characteristics (as of 2025-08):
 * - Reasoning model: Uses reasoning_tokens before generating output
 * - Requires larger max_completion_tokens (64K recommended)
 * - Best for complex reasoning, structured outputs, and coding
 * - Supports json_schema and Context-Free Grammar (CFG)
 * - Fewer schema violations than GPT-4o
 *
 * Reference: https://openai.com/index/introducing-gpt-5/
 */

// MUST load .env.local BEFORE importing any modules that use env vars
import 'dotenv/config';

import { createChatCompletion } from '../lib/openai';
import { MULTI_TRACK_MUSIC_PROMPT } from '../lib/prompts/multi-track-music-prompt';
import { MultiTrackJSON, MultiTrackJSONSchema } from '../lib/types/music';

// Test request parameters
const TEST_REQUEST = {
  subject: 'Music Theory',
  topic: 'Jazz Piano Improvisation - Blues Scale Exercise',
  difficulty: 'intermediate' as const,
  instrument: 'Piano, Bass, Drums',
  context: 'Create a 24-bar jazz trio piece focusing on blues scale patterns and swing rhythm. Include walking bass line and basic drum comping.',
};

async function main() {
  console.log('🚀 Testing GPT-5 MultiTrackJSON Generation\n');
  console.log('Test Parameters:');
  console.log(`  Subject: ${TEST_REQUEST.subject}`);
  console.log(`  Topic: ${TEST_REQUEST.topic}`);
  console.log(`  Difficulty: ${TEST_REQUEST.difficulty}`);
  console.log(`  Instruments: ${TEST_REQUEST.instrument}\n`);

  const prompt = MULTI_TRACK_MUSIC_PROMPT
    .replace('{subject}', TEST_REQUEST.subject)
    .replace('{topic}', TEST_REQUEST.topic)
    .replace('{difficulty}', TEST_REQUEST.difficulty)
    .replace('{instrument}', TEST_REQUEST.instrument)
    .replace('{context}', TEST_REQUEST.context);

  console.log('📤 Sending request to GPT-5...');
  console.log('   (Note: GPT-5 may take longer due to reasoning process)\n');

  try {
    const startTime = Date.now();

    const { completion, usage: metrics } = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-5',
        maxTokens: 64000, // GPT-5 requires large limit for reasoning + output
        reasoning_effort: 'low', // Reduce reasoning time for practical use
      }
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  API Response time: ${elapsedTime}s\n`);

    const usage = completion.usage;

    // Display reasoning token usage (GPT-5 specific)
    if (usage?.completion_tokens_details?.reasoning_tokens) {
      console.log('🧠 GPT-5 Reasoning:');
      console.log(`   Reasoning tokens: ${usage.completion_tokens_details.reasoning_tokens}`);
      console.log(`   Output tokens: ${usage.completion_tokens - usage.completion_tokens_details.reasoning_tokens}\n`);
    }

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ No content in response.');
      console.error('   Finish reason:', completion.choices[0]?.finish_reason);
      console.error('   Usage:', JSON.stringify(usage, null, 2));
      throw new Error('No content in response - GPT-5 may have used all tokens for reasoning');
    }

    console.log('✅ Response received\n');

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    console.log('🔍 Parsing and validating JSON...\n');

    const result = JSON.parse(jsonString) as MultiTrackJSON;
    const validatedResult = MultiTrackJSONSchema.parse(result);

    console.log('✅ Validation successful!\n');
    console.log('📊 Generation Summary:');
    console.log(`   Title: ${validatedResult.title || 'N/A'}`);
    console.log(`   Tracks: ${validatedResult.tracks.length}`);
    validatedResult.tracks.forEach((track, i) => {
      console.log(`     ${i + 1}. ${track.instrument} (${track.notes.length} notes)`);
    });
    console.log(`   Tempo: ${validatedResult.tempo} BPM`);
    console.log(`   Time Signature: ${validatedResult.timeSignature}`);
    console.log(`   Key: ${validatedResult.keySignature}`);
    console.log(`   Total Bars: ${validatedResult.totalBars || 'N/A'}\n`);

    console.log('💰 Cost Analysis:');
    console.log(`   Model: ${metrics.model}`);
    console.log(`   Prompt tokens: ${metrics.promptTokens}`);
    console.log(`   Completion tokens: ${metrics.completionTokens}`);
    console.log(`   Total tokens: ${metrics.totalTokens}`);
    console.log(`   Estimated cost: $${metrics.estimatedCost.toFixed(4)}\n`);

    console.log('📝 Learning Points:');
    if (validatedResult.learningPoints && validatedResult.learningPoints.length > 0) {
      validatedResult.learningPoints.slice(0, 3).forEach((point, i) => {
        console.log(`   ${i + 1}. ${point}`);
      });
      if (validatedResult.learningPoints.length > 3) {
        console.log(`   ... and ${validatedResult.learningPoints.length - 3} more\n`);
      }
    } else {
      console.log('   (None generated)\n');
    }

    // Save result to file
    const fs = await import('fs/promises');
    await fs.mkdir('tmp/phase2-poc-test', { recursive: true });
    await fs.writeFile(
      'tmp/phase2-poc-test/gpt5-multitrack.json',
      JSON.stringify(validatedResult, null, 2)
    );
    console.log('💾 Result saved to: tmp/phase2-poc-test/gpt5-multitrack.json\n');

    console.log('✨ Test complete! GPT-5 successfully generated MultiTrackJSON.\n');
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

main().catch(console.error);
