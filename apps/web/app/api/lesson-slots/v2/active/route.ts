import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

/**
 * ビューを使用したアクティブなレッスンスロット取得API
 * フィーチャーフラグ: NEXT_PUBLIC_USE_DB_VIEWS=true
 */
export async function GET(request: Request) {
  try {
    // 認証チェック
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URLパラメータからteacherIdを取得
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    // ビューを使用してアクティブなスロットを取得（シンプル！）
    const activeSlots = await prisma.active_lesson_slots.findMany({
      where: teacherId ? { teacher_id: teacherId } : undefined,
      orderBy: { start_time: 'asc' },
    });

    // メンター情報を追加で取得
    const slotsWithTeachers = await Promise.all(
      activeSlots.map(async (slot) => {
        const teacher = await prisma.users.findUnique({
          where: { id: slot.teacher_id },
          select: { id: true, name: true, image: true },
        });
        return { ...slot, teacher };
      })
    );

    return NextResponse.json({
      slots: slotsWithTeachers,
      count: slotsWithTeachers.length,
      usingView: true, // デバッグ用フラグ
    });
  } catch (error) {
    console.error('Error fetching active slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}