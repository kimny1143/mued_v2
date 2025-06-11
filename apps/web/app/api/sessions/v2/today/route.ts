import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

/**
 * ビューを使用した今日のレッスンセッション取得API
 * todays_lesson_sessionsビューを使用
 */
export async function GET() {
  try {
    // 認証チェック
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user?.role;
    const userId = session.user?.id;

    // ビューを使用（すでにJOIN済み、今日のデータのみ）
    const todaysSessions = await prisma.todays_lesson_sessions.findMany({
      where: userRole === 'MENTOR' 
        ? { teacher_id: userId }
        : userRole === 'STUDENT'
        ? { student_id: userId }
        : undefined, // ADMINは全て表示
      orderBy: { scheduled_start_time: 'asc' },
    });

    // セッション統計
    const stats = {
      total: todaysSessions.length,
      scheduled: todaysSessions.filter(s => s.status === 'SCHEDULED').length,
      inProgress: todaysSessions.filter(s => s.status === 'IN_PROGRESS').length,
      completed: todaysSessions.filter(s => s.status === 'COMPLETED').length,
      canceled: todaysSessions.filter(s => s.status === 'CANCELED').length,
    };

    return NextResponse.json({
      sessions: todaysSessions,
      stats,
      usingView: true,
    });
  } catch (error) {
    console.error('Error fetching todays sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}