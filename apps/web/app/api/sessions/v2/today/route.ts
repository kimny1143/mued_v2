import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

/**
 * ビューを使用した今日のレッスンセッション取得API
 * todays_lesson_sessionsビューを使用
 */
export async function GET(request: Request) {
  try {
    // 認証チェック
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.role;
    const userId = session.user.id;

    // ビューを使用（すでにJOIN済み、今日のデータのみ）
    const todaysSessions = await prisma.todays_lesson_sessions.findMany({
      where: userRole === 'mentor' 
        ? { teacher_id: userId }
        : userRole === 'student'
        ? { student_id: userId }
        : undefined, // adminは全て表示
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