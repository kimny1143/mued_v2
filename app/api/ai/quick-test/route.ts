/**
 * Quick Test API
 *
 * クラス全体の弱点箇所に基づいて5分間小テストを生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { aggregateClassWeakSpots } from '@/lib/ai/weak-spots-aggregator';
import { generateQuickTest } from '@/lib/ai/quick-test-generator';

export async function POST(req: NextRequest) {
  try {
    // 認証確認
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザー情報取得
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (user.length === 0 || user[0].role !== 'mentor') {
      return NextResponse.json(
        { error: 'Only teachers can generate quick tests' },
        { status: 403 }
      );
    }

    const { materialId, classUserIds, sectionsCount = 3 } = await req.json();

    // バリデーション
    if (!materialId || !classUserIds || !Array.isArray(classUserIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: materialId, classUserIds' },
        { status: 400 }
      );
    }

    if (classUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No students in class' },
        { status: 400 }
      );
    }

    console.log('[QuickTest] Aggregating weak spots for material:', materialId);

    // クラス全体の弱点箇所を集約
    const aggregation = await aggregateClassWeakSpots(materialId, classUserIds);

    if (!aggregation) {
      return NextResponse.json(
        { error: 'Failed to aggregate weak spots. Ensure students have practice data.' },
        { status: 404 }
      );
    }

    if (aggregation.topWeakSpots.length === 0) {
      return NextResponse.json(
        {
          error: 'No weak spots identified yet. Students need to practice first.',
          aggregation: {
            materialTitle: aggregation.materialTitle,
            totalStudents: aggregation.totalStudents,
            studentsWithMetrics: aggregation.studentsWithMetrics,
          },
        },
        { status: 404 }
      );
    }

    console.log(
      `[QuickTest] Found ${aggregation.topWeakSpots.length} weak spots across ${aggregation.studentsWithMetrics} students`
    );

    // 難易度を判定（弱点箇所の平均難易度）
    const highCount = aggregation.topWeakSpots.filter((s) => s.difficulty === 'high').length;
    const mediumCount = aggregation.topWeakSpots.filter((s) => s.difficulty === 'medium')
      .length;

    let difficulty: 'beginner' | 'intermediate' | 'advanced';
    if (highCount >= aggregation.topWeakSpots.length / 2) {
      difficulty = 'advanced';
    } else if (mediumCount >= aggregation.topWeakSpots.length / 2) {
      difficulty = 'intermediate';
    } else {
      difficulty = 'beginner';
    }

    console.log(`[QuickTest] Generating test with difficulty: ${difficulty}`);

    // 小テストを生成
    const quickTest = await generateQuickTest({
      materialTitle: aggregation.materialTitle,
      instrument: aggregation.instrument,
      targetTempo: aggregation.targetTempo,
      weakSpots: aggregation.topWeakSpots,
      difficulty,
      sectionsCount: Math.min(sectionsCount, aggregation.topWeakSpots.length),
    });

    if (!quickTest) {
      return NextResponse.json(
        { error: 'Failed to generate quick test' },
        { status: 500 }
      );
    }

    console.log(`[QuickTest] Generated ${quickTest.problems.length} problems successfully`);

    return NextResponse.json({
      success: true,
      quickTest,
      aggregation: {
        materialTitle: aggregation.materialTitle,
        totalStudents: aggregation.totalStudents,
        studentsWithMetrics: aggregation.studentsWithMetrics,
        topWeakSpots: aggregation.topWeakSpots,
        instrument: aggregation.instrument,
        targetTempo: aggregation.targetTempo,
      },
    });
  } catch (error) {
    console.error('[QuickTest] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate quick test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
