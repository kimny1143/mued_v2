/**
 * Weak Spots Aggregator
 *
 * クラス全体の弱点箇所を集約して小テスト生成用の情報を抽出
 */

import { db } from '@/db';
import { learningMetrics, materials, users } from '@/db/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';

export interface WeakSpot {
  startBar: number;
  endBar: number;
  loopCount: number;
  lastPracticedAt: string;
}

export interface AggregatedWeakSpot {
  startBar: number;
  endBar: number;
  totalLoopCount: number; // クラス全体での累計ループ回数
  affectedStudentCount: number; // この箇所で苦戦している生徒数
  avgLoopCount: number; // 生徒あたりの平均ループ回数
  difficulty: 'high' | 'medium' | 'low'; // 難易度判定
}

export interface WeakSpotsAggregation {
  materialId: string;
  materialTitle: string;
  totalStudents: number;
  studentsWithMetrics: number;
  topWeakSpots: AggregatedWeakSpot[];
  instrument: string;
  targetTempo: number;
}

/**
 * クラス全体の弱点箇所を集約
 */
export async function aggregateClassWeakSpots(
  materialId: string,
  classUserIds: string[]
): Promise<WeakSpotsAggregation | null> {
  if (classUserIds.length === 0) {
    console.warn('[WeakSpotsAggregator] No users provided');
    return null;
  }

  try {
    // 教材情報を取得
    const material = await db
      .select()
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    if (material.length === 0) {
      console.error('[WeakSpotsAggregator] Material not found:', materialId);
      return null;
    }

    // クラス全員の学習メトリクスを取得
    const metricsRecords = await db
      .select()
      .from(learningMetrics)
      .where(
        and(
          eq(learningMetrics.materialId, materialId),
          inArray(learningMetrics.userId, classUserIds),
          isNotNull(learningMetrics.weakSpots)
        )
      );

    if (metricsRecords.length === 0) {
      console.warn('[WeakSpotsAggregator] No metrics found for material:', materialId);
      return null;
    }

    // 弱点箇所を集約
    const weakSpotsMap = new Map<
      string,
      {
        startBar: number;
        endBar: number;
        totalLoopCount: number;
        studentIds: Set<string>;
      }
    >();

    let totalTempo = 0;
    let tempoCount = 0;
    const instrumentSet = new Set<string>();

    for (const record of metricsRecords) {
      const weakSpots = record.weakSpots as WeakSpot[] | null;
      if (!weakSpots || weakSpots.length === 0) continue;

      for (const spot of weakSpots) {
        const key = `${spot.startBar}-${spot.endBar}`;
        const existing = weakSpotsMap.get(key);

        if (existing) {
          existing.totalLoopCount += spot.loopCount;
          existing.studentIds.add(record.userId);
        } else {
          weakSpotsMap.set(key, {
            startBar: spot.startBar,
            endBar: spot.endBar,
            totalLoopCount: spot.loopCount,
            studentIds: new Set([record.userId]),
          });
        }
      }

      // 楽器とテンポの情報を集約
      if (record.instrument) {
        instrumentSet.add(record.instrument);
      }
      if (record.targetTempo) {
        totalTempo += record.targetTempo;
        tempoCount++;
      }
    }

    // 集約結果を配列に変換
    const aggregated: AggregatedWeakSpot[] = Array.from(weakSpotsMap.values()).map(
      (item) => {
        const avgLoopCount = item.totalLoopCount / item.studentIds.size;

        // 難易度判定: 多くの生徒が苦戦 && 平均ループ回数が多い
        let difficulty: 'high' | 'medium' | 'low';
        const studentRatio = item.studentIds.size / metricsRecords.length;

        if (studentRatio >= 0.5 && avgLoopCount >= 5) {
          difficulty = 'high'; // 半数以上が苦戦 && 平均5回以上
        } else if (studentRatio >= 0.3 || avgLoopCount >= 4) {
          difficulty = 'medium'; // 3割以上が苦戦 or 平均4回以上
        } else {
          difficulty = 'low';
        }

        return {
          startBar: item.startBar,
          endBar: item.endBar,
          totalLoopCount: item.totalLoopCount,
          affectedStudentCount: item.studentIds.size,
          avgLoopCount: Math.round(avgLoopCount * 10) / 10,
          difficulty,
        };
      }
    );

    // 難易度順 → 影響生徒数順 → ループ回数順にソート
    const sortedWeakSpots = aggregated.sort((a, b) => {
      // 難易度優先
      const difficultyOrder = { high: 3, medium: 2, low: 1 };
      if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
        return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
      }

      // 影響生徒数
      if (a.affectedStudentCount !== b.affectedStudentCount) {
        return b.affectedStudentCount - a.affectedStudentCount;
      }

      // 総ループ回数
      return b.totalLoopCount - a.totalLoopCount;
    });

    // 上位5件を選択
    const topWeakSpots = sortedWeakSpots.slice(0, 5);

    // 最も多い楽器を選択
    const instrumentCounts = Array.from(instrumentSet).map((inst) => ({
      instrument: inst,
      count: metricsRecords.filter((r) => r.instrument === inst).length,
    }));
    const dominantInstrument =
      instrumentCounts.sort((a, b) => b.count - a.count)[0]?.instrument || 'piano';

    // 平均テンポ
    const avgTempo = tempoCount > 0 ? Math.round(totalTempo / tempoCount) : 120;

    return {
      materialId,
      materialTitle: material[0].title,
      totalStudents: classUserIds.length,
      studentsWithMetrics: metricsRecords.length,
      topWeakSpots,
      instrument: dominantInstrument,
      targetTempo: avgTempo,
    };
  } catch (error) {
    console.error('[WeakSpotsAggregator] Error:', error);
    return null;
  }
}

/**
 * 弱点箇所から練習用の小節範囲を生成
 * 8小節単位に正規化
 */
export function normalizeToEightBarSections(
  weakSpots: AggregatedWeakSpot[]
): Array<{ startBar: number; endBar: number; difficulty: 'high' | 'medium' | 'low' }> {
  const sections: Array<{
    startBar: number;
    endBar: number;
    difficulty: 'high' | 'medium' | 'low';
  }> = [];

  for (const spot of weakSpots) {
    // 弱点箇所を含む8小節区間を計算
    const centerBar = Math.floor((spot.startBar + spot.endBar) / 2);
    const startBar = Math.max(1, Math.floor((centerBar - 1) / 8) * 8 + 1);
    const endBar = startBar + 7;

    // 重複チェック
    const exists = sections.some((s) => s.startBar === startBar && s.endBar === endBar);

    if (!exists) {
      sections.push({
        startBar,
        endBar,
        difficulty: spot.difficulty,
      });
    }
  }

  return sections;
}
