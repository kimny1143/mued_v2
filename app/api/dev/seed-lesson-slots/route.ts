// app/api/dev/seed-lesson-slots/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 本番環境では実行しない安全対策
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 });
  }

  try {
    // 既存のデータを削除
    await prisma.lessonSlot.deleteMany();
    
    // メンターロールを持つユーザーを取得
    const teacher = await prisma.user.findFirst({
      where: {
        roleId: "mentor" // ロールIDがmentorのユーザーを検索
      }
    });
    
    if (!teacher) {
      return NextResponse.json({ error: 'メンターユーザーが見つかりません' }, { status: 404 });
    }

    const teacherId = teacher.id;
    
    // 日付の作成
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // 日付のみをセット
    
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(0, 0, 0, 0); // 日付のみをセット
    
    // レッスン枠データを作成
    const slots = await prisma.lessonSlot.createMany({
      data: [
        {
          teacherId,
          startTime: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
          endTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
          isAvailable: true,
        },
        {
          teacherId,
          startTime: new Date(new Date(tomorrow).setHours(14, 0, 0, 0)),
          endTime: new Date(new Date(tomorrow).setHours(15, 0, 0, 0)),
          isAvailable: true,
        },
        {
          teacherId,
          startTime: new Date(new Date(dayAfterTomorrow).setHours(11, 0, 0, 0)),
          endTime: new Date(new Date(dayAfterTomorrow).setHours(12, 0, 0, 0)),
          isAvailable: true,
        }
      ],
    });
    
    return NextResponse.json({ success: true, count: slots.count, teacherId });
  } catch (error) {
    console.error('Error seeding lesson slots:', error);
    return NextResponse.json({ error: 'データ作成に失敗しました' }, { status: 500 });
  }
}