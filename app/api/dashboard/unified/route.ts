import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as createClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { isToday, isFuture } from 'date-fns';

/**
 * 統合ダッシュボードAPI
 * 複数のAPIコールを1回のリクエストにまとめることで、
 * ネットワークラウンドトリップを削減し、パフォーマンスを向上
 */
export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const { data: { user }, error: authError } = await createClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 並列でデータを取得
    const [
      userDetails,
      subscriptionData,
      allReservations,
      roleInfo
    ] = await Promise.all([
      // ユーザー詳細
      prisma.users.findUnique({
        where: { id: user.id }
      }),
      
      // サブスクリプション情報（学生のみ）
      fetchSubscriptionData(user.id),
      
      // 予約情報
      prisma.reservations.findMany({
        where: {
          OR: [
            { student_id: user.id }
          ]
        },
        orderBy: { booked_start_time: 'asc' }
      }),
      
      // ロール情報
      prisma.roles.findMany({
        select: { id: true, name: true }
      })
    ]);

    if (!userDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = userDetails.role_id || 'student';
    const isStudent = userRole === 'student';
    const isMentor = userRole === 'mentor';

    // 今日の予定を抽出
    const todaySchedule = allReservations
      .filter(res => {
        const startTime = new Date(res.booked_start_time);
        return res.status === 'CONFIRMED' && (isToday(startTime) || isFuture(startTime));
      })
      .map(res => ({
        id: res.id,
        startTime: res.booked_start_time.toISOString(),
        endTime: res.booked_end_time.toISOString(),
        actorName: isMentor ? '生徒' : 'メンター',
        status: res.status
      }));

    // 予約統計
    const reservationStats = {
      pendingApproval: allReservations.filter(r => r.status === 'PENDING_APPROVAL').length,
      approved: allReservations.filter(r => r.status === 'APPROVED').length,
      confirmed: allReservations.filter(r => r.status === 'CONFIRMED').length
    };

    // レスポンスデータの構築
    const responseData = {
      user: {
        id: userDetails.id,
        email: userDetails.email || '',
        name: userDetails.name || '',
        role_id: userRole,
        roleName: roleInfo.find(r => r.id === userRole)?.name || userRole,
        image: userDetails.image || '',
        roleCache: roleInfo.map(r => r.name || '')
      },
      subscription: subscriptionData,
      dashboard: {
        todaySchedule,
        reservationStats,
        totalReservations: allReservations.length
      }
    };

    // キャッシュヘッダーを設定（30秒）
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    });

  } catch (error) {
    console.error('統合ダッシュボードAPIエラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// サブスクリプション情報の取得（メンター・管理者は除外）
async function fetchSubscriptionData(userId: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user || user.role_id === 'mentor' || user.role_id === 'admin') {
      return {
        priceId: null,
        status: 'role_exempt',
        currentPeriodEnd: null
      };
    }

    // 注: サブスクリプション情報は実際にはStripe APIから取得する必要がある
    // ここでは簡易的にFREEプランとして返す
    return {
      priceId: null,
      status: 'free',
      currentPeriodEnd: null
    };
  } catch (error) {
    console.error('サブスクリプション取得エラー:', error);
    return {
      priceId: null,
      status: 'free',
      currentPeriodEnd: null
    };
  }
}