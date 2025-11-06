#!/usr/bin/env npx tsx

/**
 * GPT-5 Medium Complexity Test - 12 bars, simplified prompt
 */

import 'dotenv/config';
import { createChatCompletion } from '../lib/openai';
import { MultiTrackJSON, MultiTrackJSONSchema } from '../lib/types/music';

async function main() {
  console.log('🚀 Testing GPT-5 with Medium Complexity (12 bars, 2 tracks)\n');

  // Simplified prompt (much shorter than MULTI_TRACK_MUSIC_PROMPT)
  // GPT-5 works better with concise prompts that let the model reason
  const prompt = `Generate a 12-bar intermediate jazz duo (Piano + Bass) in C minor for music education.

Music requirements:
- Piano: blues scale melody, 48 quarter notes
- Bass: walking bass line, 48 quarter notes
- Tempo: 100 BPM, 4/4 time

Educational requirements:
- Title and description
- 5 learning points (15-30 words each)
- 5 practice instructions (20-40 words each)

Output EXACTLY this JSON structure with ALL fields:

{
  "type": "multi-track-music",
  "title": "string",
  "description": "string",
  "tracks": [
    {"instrument": "Piano", "midiProgram": 1, "notes": [{"pitch": "C4", "duration": "quarter", "velocity": 80, "time": 0}, ...]},
    {"instrument": "Acoustic Bass", "midiProgram": 33, "notes": [...]}
  ],
  "tempo": 100,
  "timeSignature": "4/4",
  "keySignature": "C minor",
  "totalBars": 12,
  "metadata": {"difficulty": "intermediate", "composer": "AI"},
  "learningPoints": ["string", "string", "string", "string", "string"],
  "practiceInstructions": ["string", "string", "string", "string", "string"]
}

Generate complete JSON:`;

  console.log(`📝 Prompt length: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens)\n`);

  try {
    const startTime = Date.now();

    const { completion, usage: metrics } = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-5',
        maxTokens: 16000,
        // No reasoning_effort = let GPT-5 decide optimal reasoning level
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

    // Debug: Show raw content
    console.log('📄 Raw content preview (first 500 chars):\n');
    console.log(content.substring(0, 500));
    console.log('\n...\n');

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
    console.log(`   Total Bars: ${validated.totalBars || 'N/A'}\n`);

    console.log('💰 Cost:');
    console.log(`   Model: ${metrics.model}`);
    console.log(`   Total tokens: ${metrics.totalTokens}`);
    console.log(`   Cost: $${metrics.estimatedCost.toFixed(4)}\n`);

    const fs = await import('fs/promises');
    await fs.mkdir('tmp/phase2-poc-test', { recursive: true });
    await fs.writeFile(
      'tmp/phase2-poc-test/gpt5-medium.json',
      JSON.stringify(validated, null, 2)
    );
    console.log('💾 Saved to: tmp/phase2-poc-test/gpt5-medium.json\n');

    console.log('✨ Test complete!\n');
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
