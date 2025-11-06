#!/usr/bin/env npx tsx

/**
 * GPT-5 簡潔プロンプト関数のテスト
 *
 * generateConciseMultiTrackPrompt() が正しく動作するかを検証
 */

import 'dotenv/config';
import { createChatCompletion } from '../lib/openai';
import { generateConciseMultiTrackPrompt } from '../lib/prompts/multi-track-music-prompt-concise';
import { MultiTrackJSON, MultiTrackJSONSchema } from '../lib/types/music';

async function main() {
  console.log('🚀 Testing GPT-5 with Concise Prompt Function\n');

  // テストケース: 異なるパラメータで生成
  const prompt = generateConciseMultiTrackPrompt({
    subject: 'Jazz Piano',
    topic: 'Blues Scale Improvisation - Chromatic Approach',
    difficulty: 'intermediate',
    instrument: 'Piano, Acoustic Bass',
    context: 'Focus on swing feel, blues harmony, and chromatic approach tones',
    bars: 12,
    key: 'C minor',
    tempo: 100,
    timeSignature: '4/4',
  });

  console.log(`📝 Generated Prompt length: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens)\n`);
  console.log('📄 Prompt preview (first 300 chars):\n');
  console.log(prompt.substring(0, 300));
  console.log('\n...\n');

  try {
    const startTime = Date.now();

    const { completion, usage: metrics } = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-5',
        maxTokens: 16000,
      }
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Response time: ${elapsedTime}s\n`);

    if (completion.usage?.completion_tokens_details?.reasoning_tokens) {
      console.log('🧠 Reasoning tokens:', completion.usage.completion_tokens_details.reasoning_tokens);
      console.log('📝 Output tokens:', completion.usage.completion_tokens - completion.usage.completion_tokens_details.reasoning_tokens);
      console.log();
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const result = JSON.parse(jsonString) as MultiTrackJSON;
    const validated = MultiTrackJSONSchema.parse(result);

    console.log('✅ Validation successful!\n');

    // 教育メタデータ
    console.log('📚 Educational Metadata:');
    console.log(`   Title: ${validated.title || 'N/A'}`);
    console.log(`   Description: ${validated.description ? validated.description.substring(0, 60) + '...' : 'N/A'}`);
    console.log(`   Learning Points: ${validated.learningPoints?.length || 0}`);
    console.log(`   Practice Instructions: ${validated.practiceInstructions?.length || 0}\n`);

    // 音楽データ
    console.log('🎵 Music Data:');
    console.log(`   Tracks: ${validated.tracks.length}`);
    validated.tracks.forEach((track, i) => {
      console.log(`     ${i + 1}. ${track.instrument} (${track.notes.length} notes)`);
    });
    console.log(`   Tempo: ${validated.tempo} BPM`);
    console.log(`   Key: ${validated.keySignature}`);
    console.log(`   Total Bars: ${validated.totalBars || 'N/A'}\n`);

    console.log('💰 Cost:');
    console.log(`   Model: ${metrics.model}`);
    console.log(`   Total tokens: ${metrics.totalTokens}`);
    console.log(`   Cost: $${metrics.estimatedCost.toFixed(4)}\n`);

    // 保存
    const fs = await import('fs/promises');
    await fs.mkdir('tmp/phase2-poc-test', { recursive: true });
    await fs.writeFile(
      'tmp/phase2-poc-test/gpt5-concise-function.json',
      JSON.stringify(validated, null, 2)
    );
    console.log('💾 Saved to: tmp/phase2-poc-test/gpt5-concise-function.json\n');

    console.log('✨ Test complete! Concise prompt function works correctly.\n');
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
