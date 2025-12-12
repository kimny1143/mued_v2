/**
 * A/B Test Material Splitter
 *
 * 同一テーマで2つのバリエーションを生成し、自動的に勝者を選択
 */

import { db } from '@/db';
import { materials, learningMetrics } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export interface ABTestConfig {
  materialIdA: string;
  materialIdB: string;
  theme: string;
  startDate: Date;
  minSampleSize: number; // 最小サンプル数（例: 10人）
  evaluationPeriod: number; // 評価期間（日数）
}

export interface ABTestResult {
  variantA: VariantMetrics;
  variantB: VariantMetrics;
  winner: 'A' | 'B' | 'tie';
  confidence: number; // 0-100%
  recommendation: string;
}

export interface VariantMetrics {
  materialId: string;
  studentCount: number;
  avgAchievementRate: number;
  avgTempoAchievement: number;
  avgPracticeTime: number;
  avgLearningValueScore: number;
  completionRate: number; // 最後まで完了した生徒の割合
}

/**
 * A/Bテスト用に生徒を均等に割り当て
 */
export function assignStudentToVariant(
  studentId: string,
  materialIdA: string,
  materialIdB: string
): string {
  // 学生IDのハッシュ値を使って決定論的に割り当て
  const hash = simpleHash(studentId);
  return hash % 2 === 0 ? materialIdA : materialIdB;
}

/**
 * A/Bテストの結果を評価
 */
export async function evaluateABTest(
  config: ABTestConfig
): Promise<ABTestResult | null> {
  try {
    const { materialIdA, materialIdB, minSampleSize, evaluationPeriod, startDate } = config;

    // 評価期間内のメトリクスを取得
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - evaluationPeriod);

    // Variant A のメトリクス
    const metricsA = await db
      .select()
      .from(learningMetrics)
      .where(
        and(
          eq(learningMetrics.materialId, materialIdA),
          gte(learningMetrics.createdAt, startDate)
        )
      );

    // Variant B のメトリクス
    const metricsB = await db
      .select()
      .from(learningMetrics)
      .where(
        and(
          eq(learningMetrics.materialId, materialIdB),
          gte(learningMetrics.createdAt, startDate)
        )
      );

    // サンプルサイズのチェック
    if (metricsA.length < minSampleSize || metricsB.length < minSampleSize) {
      console.warn(
        `[ABTest] Insufficient sample size: A=${metricsA.length}, B=${metricsB.length} (min=${minSampleSize})`
      );
      return null;
    }

    // Variant A の集計
    const variantA = calculateVariantMetrics(materialIdA, metricsA);

    // Variant B の集計
    const variantB = calculateVariantMetrics(materialIdB, metricsB);

    // 勝者を決定
    const { winner, confidence } = determineWinner(variantA, variantB);

    // 推奨アクションを生成
    const recommendation = generateRecommendation(variantA, variantB, winner, confidence);

    return {
      variantA,
      variantB,
      winner,
      confidence,
      recommendation,
    };
  } catch (error) {
    console.error('[ABTest] Evaluation error:', error);
    return null;
  }
}

/**
 * バリアントのメトリクスを計算
 */
function calculateVariantMetrics(
  materialId: string,
  // Using the actual schema type from learningMetrics table
  metrics: Array<typeof learningMetrics.$inferSelect>
): VariantMetrics {
  if (metrics.length === 0) {
    return {
      materialId,
      studentCount: 0,
      avgAchievementRate: 0,
      avgTempoAchievement: 0,
      avgPracticeTime: 0,
      avgLearningValueScore: 0,
      completionRate: 0,
    };
  }

  const studentCount = metrics.length;

  const totalAchievement = metrics.reduce(
    (sum, m) => sum + parseFloat(m.achievementRate || '0'),
    0
  );
  const avgAchievementRate = totalAchievement / studentCount;

  const totalTempo = metrics.reduce(
    (sum, m) => sum + parseFloat(m.tempoAchievement || '0'),
    0
  );
  const avgTempoAchievement = totalTempo / studentCount;

  const totalPracticeTime = metrics.reduce(
    (sum, m) => sum + (m.totalPracticeTime || 0),
    0
  );
  const avgPracticeTime = totalPracticeTime / studentCount;

  // 完了率（achievementRate >= 80%の生徒の割合）
  const completedStudents = metrics.filter(
    (m) => parseFloat(m.achievementRate || '0') >= 80
  ).length;
  const completionRate = (completedStudents / studentCount) * 100;

  // 教材の学習価値スコアの平均（材料テーブルから取得する必要があるため、仮で0）
  const avgLearningValueScore = 0; // TODO: materials テーブルから取得

  return {
    materialId,
    studentCount,
    avgAchievementRate,
    avgTempoAchievement,
    avgPracticeTime,
    avgLearningValueScore,
    completionRate,
  };
}

/**
 * 勝者を決定
 */
function determineWinner(
  variantA: VariantMetrics,
  variantB: VariantMetrics
): { winner: 'A' | 'B' | 'tie'; confidence: number } {
  // 重み付けスコアを計算
  const scoreA = calculateWeightedScore(variantA);
  const scoreB = calculateWeightedScore(variantB);

  // 差分を計算
  const diff = Math.abs(scoreA - scoreB);
  const avgScore = (scoreA + scoreB) / 2;
  const relativeImprovement = (diff / avgScore) * 100;

  // 信頼度を計算（相対改善率ベース）
  let confidence = 0;
  if (relativeImprovement >= 20) {
    confidence = 95; // 20%以上の改善 → 高信頼度
  } else if (relativeImprovement >= 10) {
    confidence = 85; // 10%以上の改善 → 中信頼度
  } else if (relativeImprovement >= 5) {
    confidence = 70; // 5%以上の改善 → 低信頼度
  } else {
    confidence = 50; // 5%未満 → 引き分け
  }

  // 勝者を決定
  if (relativeImprovement < 5) {
    return { winner: 'tie', confidence: 50 };
  } else if (scoreA > scoreB) {
    return { winner: 'A', confidence };
  } else {
    return { winner: 'B', confidence };
  }
}

/**
 * 重み付けスコアを計算
 * 達成率40%、テンポ到達30%、完了率30%
 */
function calculateWeightedScore(variant: VariantMetrics): number {
  return (
    variant.avgAchievementRate * 0.4 +
    variant.avgTempoAchievement * 0.3 +
    variant.completionRate * 0.3
  );
}

/**
 * 推奨アクションを生成
 */
function generateRecommendation(
  variantA: VariantMetrics,
  variantB: VariantMetrics,
  winner: 'A' | 'B' | 'tie',
  confidence: number
): string {
  if (winner === 'tie') {
    return 'No significant difference detected. Continue monitoring or try different variations.';
  }

  const winnerVariant = winner === 'A' ? variantA : variantB;
  const loserVariant = winner === 'A' ? variantB : variantA;

  const achievementDiff =
    winnerVariant.avgAchievementRate - loserVariant.avgAchievementRate;
  const tempoDiff =
    winnerVariant.avgTempoAchievement - loserVariant.avgTempoAchievement;
  const completionDiff = winnerVariant.completionRate - loserVariant.completionRate;

  let recommendation = `Variant ${winner} is the winner with ${confidence}% confidence. `;

  const improvements: string[] = [];
  if (achievementDiff >= 5) {
    improvements.push(
      `${achievementDiff.toFixed(1)}% higher achievement rate`
    );
  }
  if (tempoDiff >= 5) {
    improvements.push(`${tempoDiff.toFixed(1)}% better tempo achievement`);
  }
  if (completionDiff >= 5) {
    improvements.push(`${completionDiff.toFixed(1)}% higher completion rate`);
  }

  if (improvements.length > 0) {
    recommendation += `Key improvements: ${improvements.join(', ')}. `;
  }

  if (confidence >= 85) {
    recommendation +=
      'Recommendation: Hide the losing variant and use the winner for all students.';
  } else {
    recommendation +=
      'Recommendation: Continue monitoring for more data before making final decision.';
  }

  return recommendation;
}

/**
 * 簡易ハッシュ関数
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * 品質ゲート不合格の教材を自動非表示
 */
export async function autoHideFailedMaterials(): Promise<{
  hiddenCount: number;
  materials: Array<{ id: string; title: string; score: number }>;
}> {
  try {
    // 品質ゲート不合格の教材を検索（learning_value_score < 6.0 かつ isPublic = true）
    const failedMaterials = await db
      .select()
      .from(materials)
      .where(eq(materials.isPublic, true));

    const toHide: Array<{ id: string; title: string; score: number }> = [];

    for (const material of failedMaterials) {
      // learningValueScore can be string or number in the schema, handle both
      const scoreValue = material.learningValueScore;
      const score = parseFloat((typeof scoreValue === 'string' ? scoreValue : String(scoreValue)) || '0');

      if (score > 0 && score < 6.0) {
        toHide.push({
          id: material.id,
          title: material.title,
          score,
        });

        // 非公開に設定
        await db
          .update(materials)
          .set({
            isPublic: false,
            qualityStatus: 'draft',
            updatedAt: new Date(),
          })
          .where(eq(materials.id, material.id));
      }
    }

    console.log(`[AutoHide] Hidden ${toHide.length} materials due to quality gate failure`);

    return {
      hiddenCount: toHide.length,
      materials: toHide,
    };
  } catch (error) {
    console.error('[AutoHide] Error:', error);
    return { hiddenCount: 0, materials: [] };
  }
}
