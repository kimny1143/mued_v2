import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { hasPermission } from '@/lib/role-utils';

// 動的ルートとして設定
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // 管理者権限チェック
    if (!hasPermission(session.role || '', 'admin')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }
    
    console.log('=== Cron決済デバッグ情報 ===');
    
    const now = new Date();
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // 1. 環境変数の確認
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL ? '設定あり' : '設定なし',
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || '未設定',
      CRON_SECRET: process.env.CRON_SECRET ? '設定あり' : '設定なし',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '設定あり' : '設定なし',
    };
    
    // 2. 承認済み予約の確認
    const approvedReservations = await prisma.reservations.findMany({
      where: {
        status: 'APPROVED',
        payment_id: { not: null }
      },
      include: {
        payments: true,
        lesson_slots: {
          select: {
            start_time: true,
            end_time: true,
            teacher_id: true
          }
        }
      },
      orderBy: { booked_start_time: 'asc' }
    });
    
    // 3. Setup完了済みの決済確認
    const setupCompletedPayments = await prisma.payments.findMany({
      where: {
        status: 'SETUP_COMPLETED'
      },
      include: {
        reservations: {
          include: {
            lesson_slots: true
          }
        }
      }
    });
    
    // 4. 時間範囲内の予約を分析
    const timeAnalysis = approvedReservations.map(reservation => {
      const hoursUntilStart = (reservation.booked_start_time.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isInRange = reservation.booked_start_time >= fiveMinutesAgo && 
                       reservation.booked_start_time <= twoHoursFromNow;
      
      return {
        id: reservation.id,
        bookedStartTime: reservation.booked_start_time.toISOString(),
        bookedStartTimeJST: reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        hoursUntilStart: Math.round(hoursUntilStart * 100) / 100,
        paymentStatus: reservation.payments?.status || 'なし',
        paymentId: reservation.payment_id,
        isInCronRange: isInRange,
        chargeExecutedAt: reservation.payments ? 
          await prisma.$queryRaw<Array<{charge_executed_at: Date | null}>>`
            SELECT charge_executed_at FROM payments WHERE id = ${reservation.payment_id}
          `.then(res => res[0]?.charge_executed_at) : null
      };
    });
    
    // 5. Cron実行対象の予約を特定
    const cronTargets = timeAnalysis.filter(r => 
      r.isInCronRange && 
      r.paymentStatus === 'SETUP_COMPLETED' && 
      !r.chargeExecutedAt
    );
    
    // 6. 直近のCron実行履歴（もしログテーブルがあれば）
    // const cronLogs = await prisma.cronLogs.findMany({ ... });
    
    return NextResponse.json({
      timestamp: now.toISOString(),
      timestampJST: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      environment: envInfo,
      searchRange: {
        from: fiveMinutesAgo.toISOString(),
        to: twoHoursFromNow.toISOString(),
        description: '5分前から2時間後まで'
      },
      statistics: {
        totalApprovedReservations: approvedReservations.length,
        totalSetupCompletedPayments: setupCompletedPayments.length,
        totalInTimeRange: timeAnalysis.filter(r => r.isInCronRange).length,
        totalCronTargets: cronTargets.length
      },
      cronTargets: cronTargets,
      allReservationsAnalysis: timeAnalysis,
      debug: {
        message: 'このエンドポイントは管理者のみアクセス可能です',
        executedBy: session.user.email
      }
    });
    
  } catch (error) {
    console.error('デバッグエラー:', error);
    return NextResponse.json(
      { 
        error: 'デバッグ情報の取得に失敗しました',
        details: String(error)
      },
      { status: 500 }
    );
  }
}