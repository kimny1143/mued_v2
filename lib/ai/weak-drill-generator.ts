/**
 * Weak Drill Generator
 *
 * 個人の弱点箇所に基づいて練習ドリルを生成
 * 同難易度・+1・-1の3パターンを生成
 */

import OpenAI from 'openai';
import { validateAbcSyntax } from '@/lib/abc-validator';
import { analyzeAbc, type AbcAnalysis } from '@/lib/abc-analyzer';
import { getWeakDrillSystemPrompt, buildWeakDrillPrompt } from '@/lib/ai/prompts/weak-drill';

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
    analysis: AbcAnalysis;
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

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const isGPT5 = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o1');

    const params: import('@/types/openai').OpenAICompletionParams = {
      model,
      messages: [
        {
          role: 'system',
          content: getWeakDrillSystemPrompt(instrument),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    if (isGPT5) {
      params.max_completion_tokens = 2500;
    } else {
      params.max_tokens = 2500;
      params.temperature = 0.8;
    }

    const response = await openai.chat.completions.create(params);

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
 * AIレスポンスをパース
 */
function parseWeakDrillResponse(
  content: string,
  originalSection: string,
  startBar: number,
  endBar: number,
  originalAnalysis: AbcAnalysis
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
