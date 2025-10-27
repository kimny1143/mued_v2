/**
 * Quality Gate
 *
 * AI生成教材の品質判定と公開制御
 */

import { analyzeAbc, passesQualityGate, type AbcAnalysis } from './abc-analyzer';
import { extractAbcBlocks } from './abc-validator';

export const QUALITY_THRESHOLD = 6.0; // learning_value_score の最低ライン

export type QualityStatus = 'pending' | 'draft' | 'approved';

export interface QualityGateResult {
  status: QualityStatus;
  canPublish: boolean;
  playabilityScore: number;
  learningValueScore: number;
  analysis: AbcAnalysis | null;
  message: string;
}

/**
 * 教材コンテンツを品質ゲートでチェック
 */
export function checkQualityGate(
  content: string,
  instrument: string = 'piano',
  threshold: number = QUALITY_THRESHOLD
): QualityGateResult {
  // ABC記法ブロックを抽出
  const abcBlocks = extractAbcBlocks(content);

  if (abcBlocks.length === 0) {
    // ABC記法がない教材は手動承認待ち
    return {
      status: 'pending',
      canPublish: false,
      playabilityScore: 0,
      learningValueScore: 0,
      analysis: null,
      message: 'ABC notation not found. Manual review required.',
    };
  }

  // 最初のABCブロックを分析（複数ある場合は最初のメイン教材）
  const primaryAbc = abcBlocks[0].abc;
  const analysis = analyzeAbc(primaryAbc, instrument);

  if (!analysis) {
    return {
      status: 'draft',
      canPublish: false,
      playabilityScore: 0,
      learningValueScore: 0,
      analysis: null,
      message: 'Failed to analyze ABC notation. Invalid syntax.',
    };
  }

  // 品質ゲート判定
  const passes = passesQualityGate(analysis, threshold);

  if (passes) {
    return {
      status: 'approved',
      canPublish: true,
      playabilityScore: analysis.playability_score,
      learningValueScore: analysis.learning_value_score,
      analysis,
      message: `Quality gate passed. Learning value score: ${analysis.learning_value_score.toFixed(1)}/10`,
    };
  } else {
    return {
      status: 'draft',
      canPublish: false,
      playabilityScore: analysis.playability_score,
      learningValueScore: analysis.learning_value_score,
      analysis,
      message: `Quality gate failed. Learning value score: ${analysis.learning_value_score.toFixed(1)}/10 (threshold: ${threshold})`,
    };
  }
}

/**
 * 品質スコアに基づいて推奨アクションを提案
 */
export function suggestImprovements(analysis: AbcAnalysis): string[] {
  const suggestions: string[] = [];

  // 音域の問題
  if (!analysis.range_ok) {
    suggestions.push(
      `音域が楽器の快適範囲外です。${analysis.instrument}の快適範囲に収まるよう調整してください。`
    );
  }

  // 跳躍が多すぎる
  if (analysis.leap_mean > 5) {
    suggestions.push(
      `平均跳躍幅が${analysis.leap_mean.toFixed(1)}半音と大きすぎます。より段階的な音程進行にしてください。`
    );
  }

  // 半音階進行が多すぎる
  if (analysis.chromatic_density > 0.4) {
    suggestions.push(
      `半音階進行が${(analysis.chromatic_density * 100).toFixed(0)}%と多すぎます。より自然な音階進行を増やしてください。`
    );
  }

  // テンポが不適切
  if (analysis.tempo_qpm > 160) {
    suggestions.push(`テンポが${analysis.tempo_qpm}BPMと速すぎます。学習には120-140BPM程度が適切です。`);
  } else if (analysis.tempo_qpm < 60) {
    suggestions.push(`テンポが${analysis.tempo_qpm}BPMと遅すぎます。学習効率が低下する可能性があります。`);
  }

  // 反復が少なすぎる
  if (analysis.repetition_ratio < 0.1) {
    suggestions.push(
      `反復パターンが${(analysis.repetition_ratio * 100).toFixed(0)}%と少なすぎます。記憶定着のため、適度な反復を追加してください。`
    );
  }

  // 反復が多すぎる
  if (analysis.repetition_ratio > 0.6) {
    suggestions.push(
      `反復パターンが${(analysis.repetition_ratio * 100).toFixed(0)}%と多すぎます。単調になるため、バリエーションを追加してください。`
    );
  }

  // 音符密度が高すぎる
  if (analysis.notes_per_measure > 12) {
    suggestions.push(
      `小節あたり${analysis.notes_per_measure.toFixed(1)}音符と密度が高すぎます。読譜が困難になります。`
    );
  }

  // 音符密度が低すぎる
  if (analysis.notes_per_measure < 2) {
    suggestions.push(
      `小節あたり${analysis.notes_per_measure.toFixed(1)}音符と密度が低すぎます。学習効率が低下します。`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('教材の品質は良好です。改善点は特にありません。');
  }

  return suggestions;
}

/**
 * 品質スコアの説明文を生成
 */
export function explainQualityScore(analysis: AbcAnalysis): {
  playability: string;
  learningValue: string;
  overall: string;
} {
  const playability =
    analysis.playability_score >= 8
      ? '非常に演奏しやすい教材です。'
      : analysis.playability_score >= 6
        ? '演奏可能な教材です。'
        : analysis.playability_score >= 4
          ? '演奏にやや難があります。'
          : '演奏が困難な教材です。';

  const learningValue =
    analysis.learning_value_score >= 8
      ? '学習価値が非常に高い教材です。'
      : analysis.learning_value_score >= 6
        ? '学習価値が十分にある教材です。'
        : analysis.learning_value_score >= 4
          ? '学習価値がやや低い教材です。'
          : '学習価値が不足しています。';

  const overall = passesQualityGate(analysis)
    ? '✅ この教材は品質基準を満たしており、公開可能です。'
    : '⚠️ この教材は品質基準を満たしていません。改善が必要です。';

  return { playability, learningValue, overall };
}

/**
 * 動的な品質閾値を計算（運用フェーズで使用）
 * コホートの平均スコアから適切な閾値を算出
 */
export function calculateDynamicThreshold(
  recentScores: number[],
  defaultThreshold: number = QUALITY_THRESHOLD
): number {
  if (recentScores.length < 10) {
    // データが少ない場合はデフォルト値を使用
    return defaultThreshold;
  }

  // 平均値と標準偏差を計算
  const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const variance =
    recentScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / recentScores.length;
  const stdDev = Math.sqrt(variance);

  // 平均 - 1σ を閾値とする（下位約16%を除外）
  const dynamicThreshold = mean - stdDev;

  // 最低5.0、最高7.0の範囲に制限
  return Math.max(5.0, Math.min(7.0, dynamicThreshold));
}

/**
 * 品質スコアのトレンドを分析
 */
export interface QualityTrend {
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  recentAverage: number; // 直近10件の平均
  overallAverage: number; // 全体の平均
  passRate: number; // 合格率（%）
}

export function analyzeQualityTrend(scores: number[], threshold: number = QUALITY_THRESHOLD): QualityTrend {
  if (scores.length === 0) {
    return {
      average: 0,
      trend: 'stable',
      recentAverage: 0,
      overallAverage: 0,
      passRate: 0,
    };
  }

  const overallAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
  const recentScores = scores.slice(-10);
  const recentAverage = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  // トレンド判定（直近平均 vs 全体平均）
  let trend: 'improving' | 'stable' | 'declining';
  const diff = recentAverage - overallAverage;

  if (diff > 0.5) {
    trend = 'improving';
  } else if (diff < -0.5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // 合格率
  const passCount = scores.filter((s) => s >= threshold).length;
  const passRate = (passCount / scores.length) * 100;

  return {
    average: overallAverage,
    trend,
    recentAverage,
    overallAverage,
    passRate,
  };
}
