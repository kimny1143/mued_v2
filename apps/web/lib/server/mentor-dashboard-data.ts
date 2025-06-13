import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { normalizeRoleName } from '@/lib/role-utils';

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
    upcomingLessons: number;
    thisMonthEarnings: number;
  };
  recentActivities: Array<{
    id: string;
    type: 'approval_pending' | 'confirmed' | 'canceled' | 'completed';
    message: string;
    timestamp: string;
    status?: string;
  }>;
}

export const getMentorDashboardData = cache(async (userId: string): Promise<MentorDashboardData | null> => {
  console.log('[メンターダッシュボード] データ取得開始:', { userId });
  
  try {
    // ユーザー情報を取得
    console.log('[メンターダッシュボード] ユーザー情報取得中...');
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          select: { name: true }
        }
      }
    });

    console.log('[メンターダッシュボード] ユーザー情報:', {
      found: !!user,
      email: user?.email,
      role_id: user?.role_id,
      role_name: user?.roles?.name
    });

    if (!user) {
      console.log('[メンターダッシュボード] ユーザーが見つかりません');
      return null;
    }

    // ロール名を正規化して判定
    const normalizedRole = normalizeRoleName(user.roles?.name);
    if (normalizedRole !== 'mentor') {
      console.log('[メンターダッシュボード] ロール不一致:', {
        originalRole: user.roles?.name,
        normalizedRole,
        userId: user.id
      });
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 本日の予約IDを取得
    const todayReservationIds = allReservations
      .filter(r => {
        const start = new Date(r.booked_start_time);
        return start >= today && start < tomorrow && (r.status === 'APPROVED' || r.status === 'CONFIRMED');
      })
      .map(r => r.id);
    
    // 本日のレッスンセッションを取得
    const todayLessonSessions = todayReservationIds.length > 0 ? 
      await prisma.lesson_sessions.findMany({
        where: {
          reservation_id: {
            in: todayReservationIds
          },
          status: 'SCHEDULED'
        }
      }) : [];
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 統計情報を計算
    const stats = {
      pendingApproval: allReservations.filter(r => r.status === 'PENDING_APPROVAL').length,
      todayLessons: todayLessonSessions.length,
      upcomingLessons: allReservations.filter(r => {
        const start = new Date(r.booked_start_time);
        return (r.status === 'APPROVED' || r.status === 'CONFIRMED') && start >= now;
      }).length,
      thisMonthEarnings: allReservations
        .filter(r => {
          const start = new Date(r.booked_start_time);
          return r.status === 'CONFIRMED' && start >= thisMonthStart;
        })
        .reduce((sum, r) => sum + r.total_amount, 0)
    };

    // 今後のレッスン（承認済み・確定済み）
    const upcomingLessons = allReservations
      .filter(r => {
        const start = new Date(r.booked_start_time);
        return (r.status === 'APPROVED' || r.status === 'CONFIRMED') && start > now;
      })
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        startTime: r.booked_start_time.toISOString(),
        endTime: r.booked_end_time.toISOString(),
        studentName: r.users?.name || r.users?.email || '生徒情報なし',
        status: r.status
      }));

    // 最近のアクティビティ（過去7日間の予約状況）
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentReservations = allReservations
      .filter(r => r.updated_at >= oneWeekAgo || r.created_at >= oneWeekAgo)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
      .slice(0, 10);
    
    const recentActivities: MentorDashboardData['recentActivities'] = recentReservations.map(reservation => {
      let type: 'approval_pending' | 'confirmed' | 'canceled' | 'completed';
      let message: string;
      
      switch (reservation.status) {
        case 'PENDING_APPROVAL':
          type = 'approval_pending';
          message = `${reservation.users?.name || '生徒'}さんからの予約承認待ち`;
          break;
        case 'CONFIRMED':
          type = 'confirmed';
          message = `${reservation.users?.name || '生徒'}さんのレッスンが確定しました`;
          break;
        case 'CANCELED':
          type = 'canceled';
          message = `${reservation.users?.name || '生徒'}さんのレッスンがキャンセルされました`;
          break;
        case 'COMPLETED':
          type = 'completed';
          message = `${reservation.users?.name || '生徒'}さんのレッスンが完了しました`;
          break;
        default:
          type = 'confirmed';
          message = `${reservation.users?.name || '生徒'}さんの予約 (${reservation.status})`;
      }
      
      return {
        id: reservation.id,
        type,
        message,
        timestamp: reservation.updated_at.toISOString(),
        status: reservation.status
      };
    });

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