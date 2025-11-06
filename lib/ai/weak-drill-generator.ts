/**
 * Weak Drill Generator
 *
 * 個人の弱点箇所に基づいて練習ドリルを生成
 * 同難易度・+1・-1の3パターンを生成
 */

import OpenAI from 'openai';
import { validateAbcSyntax } from '@/lib/abc-validator';
import { analyzeAbc } from '@/lib/abc-analyzer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WeakDrillParams {
  originalAbc: string; // オリジナルのABC記法（全体）
  loopStartBar: number;
  loopEndBar: number;
  instrument: string;
  currentTempo: number;
  userId: string;
  materialTitle: string;
}

export interface WeakDrillResult {
  title: string;
  originalSection: {
    abc: string;
    bars: { start: number; end: number };
    difficulty: string;
    analysis: any;
  };
  drills: {
    same: DrillVariation;
    easier: DrillVariation;
    harder: DrillVariation;
  };
}

export interface DrillVariation {
  title: string;
  description: string;
  abc: string;
  difficulty: string;
  targetTempo: number;
  estimatedTime: number; // 秒
  focusPoints: string[];
}

/**
 * 弱点ドリルを生成
 */
export async function generateWeakDrill(
  params: WeakDrillParams
): Promise<WeakDrillResult | null> {
  const { originalAbc, loopStartBar, loopEndBar, instrument, currentTempo, materialTitle } =
    params;

  try {
    // オリジナルセクションを抽出
    const originalSection = extractSection(originalAbc, loopStartBar, loopEndBar);

    if (!originalSection) {
      console.error('[WeakDrillGenerator] Failed to extract section');
      return null;
    }

    // オリジナルセクションを分析
    const originalAnalysis = analyzeAbc(originalSection, instrument);

    if (!originalAnalysis) {
      console.error('[WeakDrillGenerator] Failed to analyze original section');
      return null;
    }

    console.log('[WeakDrillGenerator] Original section analysis:', {
      difficulty: originalAnalysis.difficulty_level,
      leap_mean: originalAnalysis.leap_mean,
      tempo: originalAnalysis.tempo_qpm,
    });

    // 3つのバリエーションを生成
    const prompt = buildWeakDrillPrompt(
      originalSection,
      loopStartBar,
      loopEndBar,
      instrument,
      currentTempo,
      originalAnalysis,
      materialTitle
    );

    console.log('[WeakDrillGenerator] Generating drills with OpenAI...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert music educator specializing in ${instrument}. You create targeted practice variations that help students master difficult passages through progressive difficulty adjustment. Your variations maintain musical coherence while adjusting technical demands.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      // Note: GPT-5 only supports temperature=1 (default)
      max_tokens: 2500,
    });

    const generatedContent = response.choices[0]?.message?.content;

    if (!generatedContent) {
      console.error('[WeakDrillGenerator] No content generated');
      return null;
    }

    // レスポンスをパース
    const result = parseWeakDrillResponse(
      generatedContent,
      originalSection,
      loopStartBar,
      loopEndBar,
      originalAnalysis
    );

    if (!result) {
      console.error('[WeakDrillGenerator] Failed to parse response');
      return null;
    }

    // 各バリエーションのABC記法を検証
    for (const [key, variation] of Object.entries(result.drills)) {
      const validationError = validateAbcSyntax(variation.abc);
      if (validationError) {
        console.error(
          `[WeakDrillGenerator] Variation "${key}" validation failed:`,
          validationError
        );
        return null;
      }

      // 品質チェック
      const analysis = analyzeAbc(variation.abc, instrument);
      if (!analysis || analysis.learning_value_score < 5.0) {
        console.warn(
          `[WeakDrillGenerator] Variation "${key}" has low quality score`
        );
      }
    }

    console.log('[WeakDrillGenerator] Weak drill generated successfully');

    return result;
  } catch (error) {
    console.error('[WeakDrillGenerator] Error:', error);
    return null;
  }
}

/**
 * ABC記法から指定小節範囲を抽出
 */
function extractSection(abc: string, startBar: number, endBar: number): string | null {
  try {
    // ヘッダー部分を抽出
    const headerMatch = abc.match(/^(X:[\s\S]*?\nT:[\s\S]*?\nM:[\s\S]*?\nL:[\s\S]*?\nQ:[\s\S]*?\nK:[\s\S]*?\n)/);
    if (!headerMatch) {
      console.error('[WeakDrillGenerator] Invalid ABC format - missing headers');
      return null;
    }

    const headers = headerMatch[1];

    // 本体部分（音符）を抽出
    const bodyMatch = abc.match(/K:.*?\n([\s\S]+)/);
    if (!bodyMatch) {
      console.error('[WeakDrillGenerator] Invalid ABC format - missing body');
      return null;
    }

    const body = bodyMatch[1];

    // 小節を分割（|で区切る）
    const measures = body.split('|').filter((m) => m.trim().length > 0);

    // 指定範囲の小節を抽出（0-indexed）
    const selectedMeasures = measures.slice(startBar - 1, endBar);

    if (selectedMeasures.length === 0) {
      console.error('[WeakDrillGenerator] No measures found in range');
      return null;
    }

    // 小節番号を1に変更
    const modifiedHeaders = headers.replace(/X:\d+/, 'X:1');

    // 再構築
    const extractedAbc = modifiedHeaders + selectedMeasures.join('|') + '|';

    return extractedAbc;
  } catch (error) {
    console.error('[WeakDrillGenerator] Extract section error:', error);
    return null;
  }
}

/**
 * プロンプトを構築
 */
function buildWeakDrillPrompt(
  originalSection: string,
  startBar: number,
  endBar: number,
  instrument: string,
  currentTempo: number,
  analysis: any,
  materialTitle: string
): string {
  return `A student is struggling with bars ${startBar}-${endBar} from "${materialTitle}" on ${instrument}.

**Original Section (ABC notation):**
\`\`\`abc
${originalSection}
\`\`\`

**Current Performance:**
- Tempo achieved: ${currentTempo} BPM
- Target tempo: ${analysis.tempo_qpm} BPM
- Difficulty: ${analysis.difficulty_level}
- Average leap: ${analysis.leap_mean.toFixed(1)} semitones
- Note density: ${analysis.notes_per_measure.toFixed(1)} notes/bar

**Task:**
Generate 3 practice variations of this section:

1. **SAME difficulty** - Similar technical demands, different notes
   - Keep same leap patterns, rhythm complexity, and tempo
   - Use different pitches/keys

2. **EASIER (-1 difficulty)** - Simplified version for building confidence
   - Reduce leaps (smoother melodic line)
   - Simplify rhythms
   - Lower tempo by 10-20 BPM

3. **HARDER (+1 difficulty)** - Challenge version for growth
   - Increase leaps and technical demands
   - Add rhythmic complexity
   - Increase tempo by 10-20 BPM

**Requirements:**
- Each variation must be the same length (${endBar - startBar + 1} bars)
- Use proper ABC notation with headers (X:, T:, M:, L:, Q:, K:)
- Keep it playable on ${instrument}
- Maintain musical coherence

**Response Format:**
Return a JSON object:
\`\`\`json
{
  "drills": {
    "same": {
      "title": "Similar Pattern",
      "description": "Practice with similar technical demands",
      "abc": "X:1\\nT:...\\n",
      "difficulty": "intermediate",
      "targetTempo": ${analysis.tempo_qpm},
      "estimatedTime": 120,
      "focusPoints": ["leaps", "rhythm"]
    },
    "easier": {
      "title": "Simplified Version",
      "description": "Build confidence with easier version",
      "abc": "X:1\\nT:...\\n",
      "difficulty": "beginner",
      "targetTempo": ${Math.max(60, analysis.tempo_qpm - 20)},
      "estimatedTime": 90,
      "focusPoints": ["smooth transitions"]
    },
    "harder": {
      "title": "Challenge Version",
      "description": "Push your limits",
      "abc": "X:1\\nT:...\\n",
      "difficulty": "advanced",
      "targetTempo": ${analysis.tempo_qpm + 20},
      "estimatedTime": 150,
      "focusPoints": ["speed", "accuracy"]
    }
  }
}
\`\`\``;
}

/**
 * AIレスポンスをパース
 */
function parseWeakDrillResponse(
  content: string,
  originalSection: string,
  startBar: number,
  endBar: number,
  originalAnalysis: any
): WeakDrillResult | null {
  try {
    // JSONブロックを抽出
    const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonString);

    // バリデーション
    if (!parsed.drills || !parsed.drills.same || !parsed.drills.easier || !parsed.drills.harder) {
      console.error('[WeakDrillGenerator] Invalid response structure');
      return null;
    }

    return {
      title: `Weak Spot Drill: Bars ${startBar}-${endBar}`,
      originalSection: {
        abc: originalSection,
        bars: { start: startBar, end: endBar },
        difficulty: originalAnalysis.difficulty_level,
        analysis: originalAnalysis,
      },
      drills: {
        same: parsed.drills.same,
        easier: parsed.drills.easier,
        harder: parsed.drills.harder,
      },
    };
  } catch (error) {
    console.error('[WeakDrillGenerator] Parse error:', error);
    return null;
  }
}
