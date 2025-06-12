import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import { normalizeRoleName } from '@/lib/role-utils';

export interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role_id: string;
    role_name?: string;
    image: string | null;
  };
  subscription: {
    priceId: string | null;
    status: string;
    currentPeriodEnd: number | null;
  };
  todaySchedule: Array<{
    id: string;
    startTime: string;
    endTime: string;
    actorName: string;
    status: string;
  }>;
  reservationStats: {
    pendingApproval: number;
    approved: number;
    confirmed: number;
  };
}

// React cacheを使用してリクエスト内でのキャッシュ
export const getDashboardData = cache(async (userId: string): Promise<DashboardData | null> => {
  try {
    // まずユーザー情報を取得してロールを確認
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          select: { name: true }
        }
      }
    });

    if (!user) {
      return null;
    }

    const userRoleName = normalizeRoleName(user.roles?.name);
    const isMentor = userRoleName === 'mentor';

    // ロールに応じて適切な予約を取得
    let allReservations: any[] = [];
    
    if (isMentor) {
      // メンターの場合は自分が担当する予約を取得
      allReservations = await prisma.reservations.findMany({
        where: {
          lesson_slots: {
            teacher_id: userId
          }
        },
        include: {
          users: true,
          lesson_slots: {
            include: {
              users: true
            }
          }
        },
        orderBy: { booked_start_time: 'asc' }
      });
    } else {
      // 生徒の場合は自分の予約を取得
      allReservations = await prisma.reservations.findMany({
        where: {
          student_id: userId
        },
        include: {
          lesson_slots: {
            include: {
              users: true
            }
          },
          users: true
        },
        orderBy: { booked_start_time: 'asc' }
      });
    }

    // 今後の予定を抽出（今日以降の確定済み予約）
    const todaySchedule = allReservations
      .filter(res => {
        const startTime = new Date(res.booked_start_time);
        const now = new Date();
        // 終了していない予約のみ表示（現在時刻より後の予約）
        return res.status === 'CONFIRMED' && startTime > now;
      })
      .map(res => ({
        id: res.id,
        startTime: res.booked_start_time.toISOString(),
        endTime: res.booked_end_time.toISOString(),
        actorName: isMentor 
          ? res.users?.name || '生徒情報なし'
          : res.lesson_slots?.users?.name || 'メンター情報なし',
        status: res.status
      }))
      .slice(0, 5); // 最初の5件のみ

    // 予約統計
    const reservationStats = {
      pendingApproval: allReservations.filter(r => r.status === 'PENDING_APPROVAL').length,
      approved: allReservations.filter(r => r.status === 'APPROVED').length,
      confirmed: allReservations.filter(r => r.status === 'CONFIRMED').length
    };


    // サブスクリプション情報（簡易版）
    const subscription = {
      priceId: null,
      status: userRoleName === 'mentor' || userRoleName === 'admin' ? 'role_exempt' : 'free',
      currentPeriodEnd: null
    };

    return {
      user: {
        id: user.id,
        email: user.email || '',
        name: user.name,
        role_id: user.role_id,
        role_name: userRoleName,
        image: user.image
      },
      subscription,
      todaySchedule,
      reservationStats
    };
  } catch (error) {
    console.error('ダッシュボードデータ取得エラー:', error);
    return null;
  }
});