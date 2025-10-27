/**
 * Quick Test Generator
 *
 * 弱点箇所に基づいて5分間小テスト用の練習問題を生成
 */

import OpenAI from 'openai';
import { validateAbcSyntax } from '@/lib/abc-validator';
import { analyzeAbc } from '@/lib/abc-analyzer';
import type { AggregatedWeakSpot } from './weak-spots-aggregator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QuickTestParams {
  materialTitle: string;
  instrument: string;
  targetTempo: number;
  weakSpots: AggregatedWeakSpot[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sectionsCount: number; // 生成する問題数（通常3-5問）
}

export interface QuickTestResult {
  title: string;
  description: string;
  problems: QuickTestProblem[];
  estimatedTime: number; // 分
  totalBars: number;
}

export interface QuickTestProblem {
  problemNumber: number;
  title: string;
  instruction: string;
  abc: string;
  targetBars: { startBar: number; endBar: number };
  difficulty: 'high' | 'medium' | 'low';
  estimatedTime: number; // 秒
}

/**
 * 5分間小テストを生成
 */
export async function generateQuickTest(
  params: QuickTestParams
): Promise<QuickTestResult | null> {
  const { materialTitle, instrument, targetTempo, weakSpots, difficulty, sectionsCount } =
    params;

  if (weakSpots.length === 0) {
    console.warn('[QuickTestGenerator] No weak spots provided');
    return null;
  }

  try {
    // 弱点箇所を選択（上位N件）
    const selectedSpots = weakSpots.slice(0, Math.min(sectionsCount, weakSpots.length));

    const prompt = buildQuickTestPrompt(
      materialTitle,
      instrument,
      targetTempo,
      selectedSpots,
      difficulty
    );

    console.log('[QuickTestGenerator] Generating test with OpenAI...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert music educator specializing in ${instrument}. You create focused practice exercises that target specific technical challenges. Your exercises are pedagogically sound, progressively challenging, and designed to be completed in 5 minutes.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedContent = response.choices[0]?.message?.content;

    if (!generatedContent) {
      console.error('[QuickTestGenerator] No content generated');
      return null;
    }

    // レスポンスをパース
    const result = parseQuickTestResponse(generatedContent, selectedSpots);

    if (!result) {
      console.error('[QuickTestGenerator] Failed to parse response');
      return null;
    }

    // 各問題のABC記法を検証
    for (const problem of result.problems) {
      const validationError = validateAbcSyntax(problem.abc);
      if (validationError) {
        console.error(
          `[QuickTestGenerator] Problem ${problem.problemNumber} validation failed:`,
          validationError
        );
        return null;
      }

      // 品質チェック
      const analysis = analyzeAbc(problem.abc, instrument);
      if (!analysis || analysis.learning_value_score < 5.0) {
        console.warn(
          `[QuickTestGenerator] Problem ${problem.problemNumber} has low quality score`
        );
      }
    }

    console.log('[QuickTestGenerator] Quick test generated successfully');

    return result;
  } catch (error) {
    console.error('[QuickTestGenerator] Error:', error);
    return null;
  }
}

/**
 * プロンプトを構築
 */
function buildQuickTestPrompt(
  materialTitle: string,
  instrument: string,
  targetTempo: number,
  weakSpots: AggregatedWeakSpot[],
  difficulty: string
): string {
  const spotsDescription = weakSpots
    .map(
      (spot, idx) =>
        `${idx + 1}. Bars ${spot.startBar}-${spot.endBar} (Difficulty: ${spot.difficulty}, ${spot.affectedStudentCount} students struggling, avg ${spot.avgLoopCount} loops)`
    )
    .join('\n');

  return `Create a 5-minute quick test for students learning "${materialTitle}" on ${instrument}.

**Weak spots identified in class:**
${spotsDescription}

**Requirements:**
- Generate ${weakSpots.length} practice problems, one for each weak spot
- Each problem should be exactly 8 bars long
- Target tempo: ${targetTempo} BPM
- Difficulty level: ${difficulty}
- Problems should progressively build on each other
- Use ABC notation format
- Focus on the specific technical challenges in each weak spot

**For each problem, provide:**
1. Problem number (1, 2, 3, etc.)
2. Title (e.g., "Arpeggio Practice")
3. Instruction (1-2 sentences explaining what to focus on)
4. ABC notation (8 bars, proper ABC format with headers)
5. Target bars (same as the weak spot bars)
6. Estimated time in seconds (60-90 seconds per problem)

**ABC Format Requirements:**
- Must include: X:, T:, M:, L:, Q:, K: headers
- Must be exactly 8 bars
- Must be playable on ${instrument}
- Tempo should be around ${targetTempo} BPM

**Response Format:**
Return a JSON object with this structure:
\`\`\`json
{
  "title": "Quick Test: [Material Title]",
  "description": "5-minute practice focusing on class weak spots",
  "problems": [
    {
      "problemNumber": 1,
      "title": "Problem title",
      "instruction": "What to focus on",
      "abc": "X:1\\nT:...\\n",
      "targetBars": { "startBar": 1, "endBar": 8 },
      "difficulty": "high",
      "estimatedTime": 75
    }
  ],
  "estimatedTime": 5,
  "totalBars": 24
}
\`\`\``;
}

/**
 * AIレスポンスをパース
 */
function parseQuickTestResponse(
  content: string,
  weakSpots: AggregatedWeakSpot[]
): QuickTestResult | null {
  try {
    // JSONブロックを抽出
    const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonString);

    // バリデーション
    if (!parsed.title || !parsed.problems || !Array.isArray(parsed.problems)) {
      console.error('[QuickTestGenerator] Invalid response structure');
      return null;
    }

    // 各問題のバリデーション
    for (const problem of parsed.problems) {
      if (
        !problem.problemNumber ||
        !problem.title ||
        !problem.instruction ||
        !problem.abc ||
        !problem.targetBars
      ) {
        console.error('[QuickTestGenerator] Invalid problem structure:', problem);
        return null;
      }
    }

    return {
      title: parsed.title,
      description: parsed.description || '',
      problems: parsed.problems,
      estimatedTime: parsed.estimatedTime || 5,
      totalBars: parsed.totalBars || parsed.problems.length * 8,
    };
  } catch (error) {
    console.error('[QuickTestGenerator] Parse error:', error);
    return null;
  }
}
