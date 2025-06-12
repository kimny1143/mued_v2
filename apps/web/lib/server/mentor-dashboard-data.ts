import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export interface MentorDashboardData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role_id: string;
    role_name: string;
    image: string | null;
  };
  upcomingLessons: Array<{
    id: string;
    startTime: string;
    endTime: string;
    studentName: string;
    status: string;
  }>;
  stats: {
    pendingApproval: number;
    todayLessons: number;
    thisWeekLessons: number;
    thisMonthEarnings: number;
  };
  recentActivities: Array<{
    id: string;
    type: 'approval_pending' | 'lesson_completed' | 'new_student';
    message: string;
    timestamp: string;
  }>;
}

export const getMentorDashboardData = cache(async (userId: string): Promise<MentorDashboardData | null> => {
  try {
    // ユーザー情報を取得
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          select: { name: true }
        }
      }
    });

    if (!user || user.roles?.name !== 'mentor') {
      return null;
    }

    // メンターが担当する全予約を取得
    const allReservations = await prisma.reservations.findMany({
      where: {
        lesson_slots: {
          teacher_id: userId
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lesson_slots: {
          select: {
            hourly_rate: true
          }
        }
      },
      orderBy: { booked_start_time: 'asc' }
    });

    // 現在時刻
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 統計情報を計算
    const stats = {
      pendingApproval: allReservations.filter(r => r.status === 'PENDING_APPROVAL').length,
      todayLessons: allReservations.filter(r => {
        const start = new Date(r.booked_start_time);
        return r.status === 'CONFIRMED' && 
               start >= today && 
               start < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length,
      thisWeekLessons: allReservations.filter(r => {
        const start = new Date(r.booked_start_time);
        return r.status === 'CONFIRMED' && start >= thisWeekStart;
      }).length,
      thisMonthEarnings: allReservations
        .filter(r => {
          const start = new Date(r.booked_start_time);
          return r.status === 'CONFIRMED' && start >= thisMonthStart;
        })
        .reduce((sum, r) => sum + r.total_amount, 0)
    };

    // 今後のレッスン（確定済みのみ）
    const upcomingLessons = allReservations
      .filter(r => {
        const start = new Date(r.booked_start_time);
        return r.status === 'CONFIRMED' && start > now;
      })
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        startTime: r.booked_start_time.toISOString(),
        endTime: r.booked_end_time.toISOString(),
        studentName: r.users?.name || r.users?.email || '生徒情報なし',
        status: r.status
      }));

    // 最近のアクティビティ
    const recentActivities: MentorDashboardData['recentActivities'] = [];
    
    // 承認待ち予約
    const pendingReservations = allReservations
      .filter(r => r.status === 'PENDING_APPROVAL')
      .slice(0, 3);
    
    for (const reservation of pendingReservations) {
      recentActivities.push({
        id: reservation.id,
        type: 'approval_pending',
        message: `${reservation.users?.name || '生徒'}さんからの予約承認待ち`,
        timestamp: reservation.created_at.toISOString()
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        name: user.name,
        role_id: user.role_id,
        role_name: 'mentor',
        image: user.image
      },
      upcomingLessons,
      stats,
      recentActivities: recentActivities.slice(0, 5)
    };
  } catch (error) {
    console.error('メンターダッシュボードデータ取得エラー:', error);
    return null;
  }
});