import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// このルートは動的である必要があります
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Cronジョブからのリクエストかを確認（本番環境では認証を追加）
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    console.log(`[CRON] レッスンステータス更新開始: ${now.toISOString()}`);

    // 1. 開始時刻を過ぎたレッスンを取得してIN_PROGRESSに更新
    const scheduledSessions = await prisma.lesson_sessions.findMany({
      where: {
        status: 'SCHEDULED'
      },
    });

    let startedCount = 0;
    for (const session of scheduledSessions) {
      const reservation = await prisma.reservations.findUnique({
        where: { id: session.reservation_id }
      });
      
      if (reservation && reservation.booked_start_time <= now && reservation.booked_end_time > now) {
        await prisma.lesson_sessions.update({
          where: { id: session.id },
          data: {
            status: 'IN_PROGRESS',
            actual_start_time: now,
            updated_at: now
          }
        });
        startedCount++;
      }
    }

    // 2. 終了時刻を過ぎたレッスンを取得してCOMPLETEDに更新
    const inProgressSessions = await prisma.lesson_sessions.findMany({
      where: {
        status: 'IN_PROGRESS'
      }
    });

    let completedCount = 0;
    for (const session of inProgressSessions) {
      const reservation = await prisma.reservations.findUnique({
        where: { id: session.reservation_id }
      });
      
      if (reservation && reservation.booked_end_time <= now) {
        await prisma.lesson_sessions.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            actual_end_time: now,
            updated_at: now
          }
        });
        completedCount++;
      }
    }

    // 3. 予約ステータスも同期（レッスンが完了したら予約もCOMPLETEDに）
    const completedSessions = await prisma.lesson_sessions.findMany({
      where: {
        status: 'COMPLETED'
      },
      select: { reservation_id: true }
    });
    
    // 完了していない予約のみ更新
    const reservationIdsToComplete = [];
    for (const session of completedSessions) {
      const reservation = await prisma.reservations.findUnique({
        where: { id: session.reservation_id }
      });
      if (reservation && reservation.status !== 'COMPLETED') {
        reservationIdsToComplete.push(reservation.id);
      }
    }

    if (reservationIdsToComplete.length > 0) {
      await prisma.reservations.updateMany({
        where: {
          id: { in: reservationIdsToComplete }
        },
        data: {
          status: 'COMPLETED',
          updated_at: now
        }
      });
    }

    console.log(`[CRON] レッスンステータス更新完了:`, {
      started: startedCount,
      completed: completedCount,
      reservationsCompleted: reservationIdsToComplete.length
    });

    return NextResponse.json({
      success: true,
      updated: {
        started: startedCount,
        completed: completedCount,
        reservationsCompleted: reservationIdsToComplete.length
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('[CRON] レッスンステータス更新エラー:', error);
    return NextResponse.json(
      { error: 'ステータス更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}