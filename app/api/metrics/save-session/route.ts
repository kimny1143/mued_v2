/**
 * Save Practice Session API
 *
 * 練習セッションのメトリクスをDBに保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { learningMetrics } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateLearningMetrics, type PracticeSession } from '@/lib/metrics/learning-tracker';

export async function POST(req: NextRequest) {
  try {
    // 認証確認
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session: PracticeSession = await req.json();

    // セッションデータのバリデーション
    if (!session.materialId || !session.userId || !session.instrument) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clerk UserIDとリクエストのUserIDが一致するか確認
    // Note: session.userIdはDB上のUUID、clerkUserIdはClerk ID
    // 実際の実装では users テーブルから userId を取得する必要がある

    // 学習メトリクスを計算
    const metrics = calculateLearningMetrics(session);

    // 既存のメトリクスレコードを検索
    const existingMetrics = await db
      .select()
      .from(learningMetrics)
      .where(
        and(
          eq(learningMetrics.userId, session.userId),
          eq(learningMetrics.materialId, session.materialId)
        )
      )
      .limit(1);

    if (existingMetrics.length > 0) {
      // 既存レコードを更新（累積）
      const existing = existingMetrics[0];

      const newSectionsCompleted = Math.max(
        existing.sectionsCompleted,
        session.sectionsCompleted
      );

      const newAchievementRate = calculateAchievementRate(
        newSectionsCompleted,
        session.sectionsTotal
      );

      const newRepetitionCount = existing.repetitionCount + session.loopEvents.length;

      const newRepetitionIndex =
        ((existing.repetitionIndex as any) * existing.repetitionCount + metrics.repetitionIndex * session.loopEvents.length) /
        (existing.repetitionCount + session.loopEvents.length);

      const newAchievedTempo = Math.max(existing.achievedTempo, session.achievedTempo);

      const newTempoAchievement = calculateTempoAchievement(
        newAchievedTempo,
        session.targetTempo
      );

      // 弱点箇所をマージ
      const existingWeakSpots = (existing.weakSpots as any) || [];
      const newWeakSpots = mergeWeakSpots(existingWeakSpots, metrics.weakSpots);

      const newTotalPracticeTime = existing.totalPracticeTime + session.duration;
      const newSessionCount = existing.sessionCount + 1;

      await db
        .update(learningMetrics)
        .set({
          sectionsCompleted: newSectionsCompleted,
          sectionsTotal: session.sectionsTotal,
          achievementRate: newAchievementRate.toFixed(2),
          repetitionCount: newRepetitionCount,
          repetitionIndex: newRepetitionIndex.toFixed(2),
          achievedTempo: newAchievedTempo,
          tempoAchievement: newTempoAchievement.toFixed(2),
          weakSpots: newWeakSpots,
          totalPracticeTime: newTotalPracticeTime,
          lastPracticedAt: new Date(),
          sessionCount: newSessionCount,
          updatedAt: new Date(),
        })
        .where(eq(learningMetrics.id, existing.id));

      console.log('[SaveSession] Updated existing metrics:', existing.id);
    } else {
      // 新規レコード作成
      await db.insert(learningMetrics).values({
        userId: session.userId,
        materialId: session.materialId,
        sectionsCompleted: session.sectionsCompleted,
        sectionsTotal: session.sectionsTotal,
        achievementRate: metrics.achievementRate.toFixed(2),
        repetitionCount: session.loopEvents.length,
        repetitionIndex: metrics.repetitionIndex.toFixed(2),
        targetTempo: session.targetTempo,
        achievedTempo: session.achievedTempo,
        tempoAchievement: metrics.tempoAchievement.toFixed(2),
        weakSpots: metrics.weakSpots,
        totalPracticeTime: session.duration,
        lastPracticedAt: new Date(),
        instrument: session.instrument,
        sessionCount: 1,
      });

      console.log('[SaveSession] Created new metrics record');
    }

    return NextResponse.json({
      success: true,
      metrics: {
        achievementRate: metrics.achievementRate,
        repetitionIndex: metrics.repetitionIndex,
        tempoAchievement: metrics.tempoAchievement,
        weakSpots: metrics.weakSpots,
      },
    });
  } catch (error) {
    console.error('[SaveSession] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 達成率を計算
 */
function calculateAchievementRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, (completed / total) * 100);
}

/**
 * テンポ到達率を計算
 */
function calculateTempoAchievement(achieved: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, (achieved / target) * 100);
}

/**
 * 弱点箇所をマージ（既存 + 新規）
 */
function mergeWeakSpots(
  existing: Array<{ startBar: number; endBar: number; loopCount: number; lastPracticedAt: string }>,
  newSpots: Array<{ startBar: number; endBar: number; loopCount: number; lastPracticedAt: string }>
): Array<{ startBar: number; endBar: number; loopCount: number; lastPracticedAt: string }> {
  const merged = new Map<string, any>();

  // 既存の弱点箇所を追加
  for (const spot of existing) {
    const key = `${spot.startBar}-${spot.endBar}`;
    merged.set(key, spot);
  }

  // 新しい弱点箇所を追加またはマージ
  for (const spot of newSpots) {
    const key = `${spot.startBar}-${spot.endBar}`;
    const existingSpot = merged.get(key);

    if (existingSpot) {
      merged.set(key, {
        ...existingSpot,
        loopCount: existingSpot.loopCount + spot.loopCount,
        lastPracticedAt: spot.lastPracticedAt, // 最新の日時に更新
      });
    } else {
      merged.set(key, spot);
    }
  }

  // カウントの多い順にソートして上位5件を返す
  return Array.from(merged.values())
    .sort((a, b) => b.loopCount - a.loopCount)
    .slice(0, 5);
}
