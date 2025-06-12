import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

/**
 * 従来のテーブル直接アクセスでアクティブなレッスンスロット取得API
 * フィーチャーフラグ: NEXT_PUBLIC_USE_DB_VIEWS=false
 */
export async function GET(request: Request) {
  try {
    // 認証チェック
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URLパラメータからteacherIdを取得
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    // 従来の方法：WHERE句でフィルタリング（複雑）
    const activeSlots = await prisma.lesson_slots.findMany({
      where: {
        end_time: { gt: new Date() },
        is_available: true,
        ...(teacherId && { teacher_id: teacherId }),
      },
      include: {
        users: {
          select: { id: true, name: true, image: true },
        },
        reservations: {
          where: {
            status: {
              notIn: ['CANCELED', 'REJECTED'],
            },
          },
          select: {
            id: true,
            status: true,
            student_id: true,
          },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    // データ整形
    const formattedSlots = activeSlots.map((slot) => ({
      ...slot,
      teacher: slot.users,
      reservation_count: slot.reservations.length,
    }));

    return NextResponse.json({
      slots: formattedSlots,
      count: formattedSlots.length,
      usingView: false, // デバッグ用フラグ
    });
  } catch (error) {
    console.error('Error fetching active slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}