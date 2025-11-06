#!/usr/bin/env npx tsx

/**
 * GPT-5 Debug Test - Verbose logging to diagnose connection issues
 */

import 'dotenv/config';
import OpenAI from 'openai';

async function main() {
  console.log('🔍 Debug Test: GPT-5 Connection\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  console.log('✅ API Key loaded:', apiKey.substring(0, 10) + '...');

  const openai = new OpenAI({
    apiKey,
    timeout: 120000, // 2 minutes explicit timeout
    maxRetries: 0, // No retries for debugging
  });

  console.log('\n📤 Sending test request to GPT-5...');
  console.log('   Model: gpt-5');
  console.log('   Prompt: "Generate a simple 4-bar melody"\n');

  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Generate a simple 4-bar C major piano melody in JSON format: {"notes": [{"pitch": "C4", "time": 0}]}'
        }
      ],
      max_completion_tokens: 2000,
      reasoning_effort: 'low',
    });

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Response received in ${elapsedTime}s\n`);

    console.log('✅ Success!');
    console.log('   Model:', completion.model);
    console.log('   Finish reason:', completion.choices[0]?.finish_reason);
    console.log('   Content length:', completion.choices[0]?.message?.content?.length || 0);
    console.log('   Usage:', JSON.stringify(completion.usage, null, 2));

    if (completion.usage?.completion_tokens_details?.reasoning_tokens) {
      console.log('\n🧠 Reasoning tokens:', completion.usage.completion_tokens_details.reasoning_tokens);
    }

    console.log('\n✨ GPT-5 is working correctly!\n');
  } catch (error) {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Failed after ${elapsedTime}s`);

    if (error instanceof OpenAI.APIError) {
      console.error('\nOpenAI API Error:');
      console.error('   Status:', error.status);
      console.error('   Message:', error.message);
      console.error('   Type:', error.type);
      console.error('   Code:', error.code);
    } else {
      console.error('\nError:', error);
    }

    process.exit(1);
  }
}

main().catch(console.error);
