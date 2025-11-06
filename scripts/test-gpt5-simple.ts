#!/usr/bin/env npx tsx

/**
 * GPT-5 Simple Test - Short prompt to verify GPT-5 is working
 */

import 'dotenv/config';
import { createChatCompletion } from '../lib/openai';

async function main() {
  console.log('🚀 Testing GPT-5 with simple prompt\n');

  const prompt = `Generate a simple 8-bar piano melody in JSON format with the following structure:

{
  "tracks": [
    {
      "instrument": "Piano",
      "midiProgram": 1,
      "notes": [
        {"pitch": "C4", "duration": "quarter", "velocity": 80, "time": 0}
      ]
    }
  ],
  "tempo": 120,
  "timeSignature": "4/4",
  "keySignature": "C major",
  "totalBars": 8
}

Please generate 32 notes (8 bars × 4 beats) for a simple C major scale melody.`;

  try {
    console.log('📤 Sending request to GPT-5...\n');

    const { completion, usage } = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-5',
        maxTokens: 8000, // Smaller limit for simple task
      }
    );

    if (completion.usage?.completion_tokens_details?.reasoning_tokens) {
      console.log('🧠 GPT-5 Reasoning:');
      console.log(`   Reasoning tokens: ${completion.usage.completion_tokens_details.reasoning_tokens}`);
      console.log(`   Output tokens: ${completion.usage.completion_tokens - completion.usage.completion_tokens_details.reasoning_tokens}\n`);
    }

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ No content in response');
      console.error('   Finish reason:', completion.choices[0]?.finish_reason);
      throw new Error('No content');
    }

    console.log('✅ Response received\n');
    console.log('📝 Content (first 500 chars):\n');
    console.log(content.substring(0, 500));
    console.log('\n...\n');

    console.log('💰 Cost Analysis:');
    console.log(`   Model: ${usage.model}`);
    console.log(`   Prompt tokens: ${usage.promptTokens}`);
    console.log(`   Completion tokens: ${usage.completionTokens}`);
    console.log(`   Total tokens: ${usage.totalTokens}`);
    console.log(`   Estimated cost: $${usage.estimatedCost.toFixed(4)}\n`);

    console.log('✨ Test complete!\n');
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
