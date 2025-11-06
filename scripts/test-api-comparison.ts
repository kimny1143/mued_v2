#!/usr/bin/env npx tsx

/**
 * API Comparison PoC: GPT-5 vs Claude Haiku 4.5
 *
 * Purpose: Compare cost, quality, and performance for MultiTrackJSON generation
 *
 * Test scenario:
 * - Generate intermediate-level music material (2-3 tracks, 24 bars)
 * - Compare token usage and cost
 * - Validate JSON output
 */

// MUST load .env.local BEFORE importing any modules that use env vars
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createChatCompletion } from '../lib/openai';
import { createMessage, extractTextContent } from '../lib/anthropic';
import { MULTI_TRACK_MUSIC_PROMPT } from '../lib/prompts/multi-track-music-prompt';
import { MultiTrackJSON, MultiTrackJSONSchema } from '../lib/types/music';
import type { UsageMetrics as OpenAIUsageMetrics } from '../lib/openai';
import type { UsageMetrics as ClaudeUsageMetrics } from '../lib/anthropic';

// Test request parameters
const TEST_REQUEST = {
  subject: 'Music Theory',
  topic: 'Jazz Piano Improvisation - Blues Scale Exercise',
  difficulty: 'intermediate' as const,
  instrument: 'Piano, Bass, Drums',
  context: 'Create a 24-bar jazz trio piece focusing on blues scale patterns and swing rhythm. Include walking bass line and basic drum comping.',
};

/**
 * Test GPT-5 with Structured Outputs
 */
async function testGPT5(): Promise<{
  result: MultiTrackJSON | null;
  usage: OpenAIUsageMetrics;
  error?: string;
}> {
  console.log('\n🤖 Testing GPT-5 with Structured Outputs...\n');

  const prompt = MULTI_TRACK_MUSIC_PROMPT
    .replace('{subject}', TEST_REQUEST.subject)
    .replace('{topic}', TEST_REQUEST.topic)
    .replace('{difficulty}', TEST_REQUEST.difficulty)
    .replace('{instrument}', TEST_REQUEST.instrument)
    .replace('{context}', TEST_REQUEST.context);

  try {
    const { completion, usage } = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-5-mini', // Using mini for cost comparison
        temperature: 0.7,
        maxTokens: 16000,
      }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const result = JSON.parse(jsonString) as MultiTrackJSON;

    // Validate with Zod schema
    const validatedResult = MultiTrackJSONSchema.parse(result);

    console.log('✅ GPT-5 generation successful');
    console.log(`   Model: ${usage.model}`);
    console.log(`   Prompt tokens: ${usage.promptTokens}`);
    console.log(`   Completion tokens: ${usage.completionTokens}`);
    console.log(`   Total tokens: ${usage.totalTokens}`);
    console.log(`   Estimated cost: $${usage.estimatedCost.toFixed(4)}`);
    console.log(`   Tracks generated: ${validatedResult.tracks.length}`);
    console.log(`   Total bars: ${validatedResult.totalBars || 'N/A'}`);

    return { result: validatedResult, usage };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ GPT-5 generation failed:', errorMessage);
    return {
      result: null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        model: 'gpt-5-mini',
        timestamp: new Date(),
      },
      error: errorMessage,
    };
  }
}

/**
 * Test Claude Haiku 4.5
 */
async function testClaudeHaiku(): Promise<{
  result: MultiTrackJSON | null;
  usage: ClaudeUsageMetrics;
  error?: string;
}> {
  console.log('\n🧠 Testing Claude Haiku 4.5...\n');

  const prompt = MULTI_TRACK_MUSIC_PROMPT
    .replace('{subject}', TEST_REQUEST.subject)
    .replace('{topic}', TEST_REQUEST.topic)
    .replace('{difficulty}', TEST_REQUEST.difficulty)
    .replace('{instrument}', TEST_REQUEST.instrument)
    .replace('{context}', TEST_REQUEST.context);

  // Add explicit JSON output instruction
  const enhancedPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON in the specified format. Do not include any markdown formatting or explanatory text.`;

  try {
    const { message, usage } = await createMessage(
      [{ role: 'user', content: enhancedPrompt }],
      {
        model: 'claude-haiku-4.5-20251015',
        temperature: 0.7,
        maxTokens: 8192,
      }
    );

    const content = extractTextContent(message);
    if (!content) {
      throw new Error('No content in response');
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const result = JSON.parse(jsonString) as MultiTrackJSON;

    // Validate with Zod schema
    const validatedResult = MultiTrackJSONSchema.parse(result);

    console.log('✅ Claude Haiku generation successful');
    console.log(`   Model: ${usage.model}`);
    console.log(`   Prompt tokens: ${usage.promptTokens}`);
    console.log(`   Completion tokens: ${usage.completionTokens}`);
    console.log(`   Total tokens: ${usage.totalTokens}`);
    console.log(`   Estimated cost: $${usage.estimatedCost.toFixed(4)}`);
    console.log(`   Tracks generated: ${validatedResult.tracks.length}`);
    console.log(`   Total bars: ${validatedResult.totalBars || 'N/A'}`);

    return { result: validatedResult, usage };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Claude Haiku generation failed:', errorMessage);
    return {
      result: null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        model: 'claude-haiku-4.5-20251015',
        timestamp: new Date(),
      },
      error: errorMessage,
    };
  }
}

/**
 * Compare results
 */
function compareResults(
  gpt5Result: { result: MultiTrackJSON | null; usage: OpenAIUsageMetrics; error?: string },
  claudeResult: { result: MultiTrackJSON | null; usage: ClaudeUsageMetrics; error?: string }
) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON RESULTS');
  console.log('='.repeat(60) + '\n');

  // Success rate
  console.log('✅ Success Rate:');
  console.log(`   GPT-5 mini: ${gpt5Result.result ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Claude Haiku 4.5: ${claudeResult.result ? '✅ Success' : '❌ Failed'}\n`);

  if (!gpt5Result.result && !claudeResult.result) {
    console.log('❌ Both APIs failed. Check error messages above.\n');
    return;
  }

  // Cost comparison
  console.log('💰 Cost Analysis:');
  console.log(`   GPT-5 mini: $${gpt5Result.usage.estimatedCost.toFixed(4)}`);
  console.log(`   Claude Haiku 4.5: $${claudeResult.usage.estimatedCost.toFixed(4)}`);

  if (gpt5Result.usage.estimatedCost > 0 && claudeResult.usage.estimatedCost > 0) {
    const costDiff = ((gpt5Result.usage.estimatedCost - claudeResult.usage.estimatedCost) / gpt5Result.usage.estimatedCost * 100);
    console.log(`   Winner: ${costDiff > 0 ? '🏆 Claude Haiku' : '🏆 GPT-5 mini'} (${Math.abs(costDiff).toFixed(1)}% cheaper)\n`);
  } else {
    console.log('\n');
  }

  // Token usage comparison
  console.log('📝 Token Usage:');
  console.log(`   GPT-5 mini: ${gpt5Result.usage.totalTokens} tokens (${gpt5Result.usage.promptTokens} in / ${gpt5Result.usage.completionTokens} out)`);
  console.log(`   Claude Haiku 4.5: ${claudeResult.usage.totalTokens} tokens (${claudeResult.usage.promptTokens} in / ${claudeResult.usage.completionTokens} out)\n`);

  // Quality comparison (basic)
  if (gpt5Result.result && claudeResult.result) {
    console.log('🎵 Quality Indicators:');
    console.log(`   GPT-5 mini: ${gpt5Result.result.tracks.length} tracks, ${gpt5Result.result.totalBars || 'N/A'} bars`);
    console.log(`   Claude Haiku 4.5: ${claudeResult.result.tracks.length} tracks, ${claudeResult.result.totalBars || 'N/A'} bars\n`);
  }

  // Recommendation
  console.log('🎯 Recommendation:');
  if (gpt5Result.result && claudeResult.result) {
    if (claudeResult.usage.estimatedCost < gpt5Result.usage.estimatedCost * 0.7) {
      console.log('   → Claude Haiku 4.5 (Significant cost savings with good quality)');
    } else if (gpt5Result.result && !gpt5Result.error) {
      console.log('   → GPT-5 mini (Structured Outputs ensure type safety)');
    } else {
      console.log('   → Both viable - test with production workload');
    }
  } else if (gpt5Result.result) {
    console.log('   → GPT-5 mini (Only successful option)');
  } else if (claudeResult.result) {
    console.log('   → Claude Haiku 4.5 (Only successful option)');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting API Comparison PoC');
  console.log('=' + '='.repeat(59));
  console.log(`Test Request:`);
  console.log(`  Subject: ${TEST_REQUEST.subject}`);
  console.log(`  Topic: ${TEST_REQUEST.topic}`);
  console.log(`  Difficulty: ${TEST_REQUEST.difficulty}`);
  console.log(`  Instruments: ${TEST_REQUEST.instrument}`);
  console.log('=' + '='.repeat(59));

  // Check if API keys are available
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  console.log(`\n🔑 API Keys Status:`);
  console.log(`   OpenAI: ${hasOpenAI ? '✅ Available' : '❌ Missing'}`);
  console.log(`   Anthropic: ${hasClaude ? '✅ Available' : '❌ Missing (Skipping Claude tests)'}\n`);

  // Run tests based on available API keys
  let gpt5Result: Awaited<ReturnType<typeof testGPT5>>;
  let claudeResult: Awaited<ReturnType<typeof testClaudeHaiku>>;

  if (hasOpenAI && hasClaude) {
    // Run both in parallel
    [gpt5Result, claudeResult] = await Promise.all([
      testGPT5(),
      testClaudeHaiku(),
    ]);
  } else if (hasOpenAI) {
    // Run only GPT-5
    gpt5Result = await testGPT5();
    claudeResult = {
      result: null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        model: 'claude-haiku-4.5-20251015',
        timestamp: new Date(),
      },
      error: 'ANTHROPIC_API_KEY not configured',
    };
  } else if (hasClaude) {
    // Run only Claude
    claudeResult = await testClaudeHaiku();
    gpt5Result = {
      result: null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        model: 'gpt-5-mini',
        timestamp: new Date(),
      },
      error: 'OPENAI_API_KEY not configured',
    };
  } else {
    // No API keys available
    console.error('❌ No API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local');
    process.exit(1);
  }

  // Compare results
  compareResults(gpt5Result, claudeResult);

  // Save results to file for manual inspection
  if (gpt5Result.result) {
    const fs = await import('fs/promises');
    await fs.writeFile(
      'tmp/phase2-poc-test/gpt5-multitrack.json',
      JSON.stringify(gpt5Result.result, null, 2)
    );
    console.log('💾 GPT-5 result saved to: tmp/phase2-poc-test/gpt5-multitrack.json');
  }

  if (claudeResult.result) {
    const fs = await import('fs/promises');
    await fs.writeFile(
      'tmp/phase2-poc-test/claude-multitrack.json',
      JSON.stringify(claudeResult.result, null, 2)
    );
    console.log('💾 Claude result saved to: tmp/phase2-poc-test/claude-multitrack.json');
  }

  console.log('\n✨ PoC complete!\n');
}

main().catch(console.error);
