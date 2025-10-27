/**
 * Weak Drill API
 *
 * 個人の弱点箇所に基づいて練習ドリルを生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, materials, learningMetrics } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateWeakDrill } from '@/lib/ai/weak-drill-generator';

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

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user[0].id;

    const { materialId, loopStartBar, loopEndBar, currentTempo } = await req.json();

    // バリデーション
    if (!materialId || loopStartBar == null || loopEndBar == null || !currentTempo) {
      return NextResponse.json(
        {
          error: 'Missing required fields: materialId, loopStartBar, loopEndBar, currentTempo',
        },
        { status: 400 }
      );
    }

    if (loopStartBar < 1 || loopEndBar < loopStartBar) {
      return NextResponse.json(
        { error: 'Invalid bar range' },
        { status: 400 }
      );
    }

    console.log('[WeakDrill] Generating drill for user:', userId, 'material:', materialId);

    // 教材情報を取得
    const material = await db
      .select()
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    if (material.length === 0) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const originalAbc = extractAbcFromContent(material[0].content);

    if (!originalAbc) {
      return NextResponse.json(
        { error: 'No ABC notation found in material' },
        { status: 400 }
      );
    }

    // 学習メトリクスから楽器を取得
    const metrics = await db
      .select()
      .from(learningMetrics)
      .where(
        and(
          eq(learningMetrics.userId, userId),
          eq(learningMetrics.materialId, materialId)
        )
      )
      .limit(1);

    const instrument = metrics[0]?.instrument || 'piano';

    console.log(
      `[WeakDrill] Generating drill for bars ${loopStartBar}-${loopEndBar} on ${instrument}`
    );

    // 弱点ドリルを生成
    const weakDrill = await generateWeakDrill({
      originalAbc,
      loopStartBar,
      loopEndBar,
      instrument,
      currentTempo,
      userId,
      materialTitle: material[0].title,
    });

    if (!weakDrill) {
      return NextResponse.json(
        { error: 'Failed to generate weak drill' },
        { status: 500 }
      );
    }

    console.log('[WeakDrill] Generated 3 variations successfully');

    return NextResponse.json({
      success: true,
      weakDrill,
      metadata: {
        materialTitle: material[0].title,
        instrument,
        originalBars: { start: loopStartBar, end: loopEndBar },
        currentTempo,
      },
    });
  } catch (error) {
    console.error('[WeakDrill] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate weak drill',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 教材コンテンツからABC記法を抽出
 */
function extractAbcFromContent(content: string | null): string | null {
  if (!content) return null;

  // ```abc ... ``` ブロックを探す
  const abcMatch = content.match(/```abc\n([\s\S]+?)```/);
  if (abcMatch) {
    return abcMatch[1].trim();
  }

  // 直接ABC記法が含まれているか確認（X:で始まる）
  if (content.includes('X:') && content.includes('K:')) {
    return content;
  }

  return null;
}
