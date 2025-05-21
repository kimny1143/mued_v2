// 動的ルートフラグ
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { createCheckoutSession } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils';
import Stripe from 'stripe';

// Stripe インスタンスの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {

  apiVersion: '2025-03-31.basil',
});

// 予約ステータスの列挙型
enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

// Prismaクエリ実行のラッパー関数（エラーハンドリング強化）
async function executePrismaQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.error('Prismaクエリエラー:', error);
    
    // PostgreSQL接続エラーの場合、一度明示的に接続を再確立
    if (error instanceof Prisma.PrismaClientInitializationError || 
        error instanceof Prisma.PrismaClientKnownRequestError) {
      console.log('Prisma接続リセット試行...');
      
      // エラー後の再試行（最大3回）
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // 少し待機してから再試行
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          return await queryFn();
        } catch (retryError) {
          console.error(`再試行 ${attempt + 1}/3 失敗:`, retryError);
          if (attempt === 2) throw retryError; // 最後の試行でもエラーなら投げる
        }
      }
    }
    
    throw error;
  }
}

// 予約一覧を取得
export async function GET(request: NextRequest) {
  try {
    console.log('予約一覧API呼び出し - リクエストヘッダー:', 
      Object.fromEntries(request.headers.entries()));
    
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
    console.log('セッション取得結果:', 
      sessionInfo ? `認証済み: ${sessionInfo.user.email} (${sessionInfo.role})` : '認証なし');
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const slotId = searchParams.get('slotId');
    
    // クエリ条件を構築
    const where: Prisma.ReservationWhereInput = {};
    
    // 教師（メンター）は自分の全予約を、生徒は自分の予約のみを見られる
    if (sessionInfo.role === 'mentor') {
      where.slot = {
        teacherId: sessionInfo.user.id,
      };
    } else if (sessionInfo.role === 'admin') {
      // 管理者は全ての予約を閲覧可能
    } else {
      // 生徒は自分の予約のみ閲覧可能
      where.studentId = sessionInfo.user.id;
    }
    
    if (status && Object.values(ReservationStatus).includes(status as ReservationStatus)) {
      where.status = status as ReservationStatus;
    }
    
    if (slotId) {
      where.slotId = slotId;
    }
    
    // データベースから予約を取得（エラーハンドリング強化）
    const reservations = await executePrismaQuery(() => prisma.reservation.findMany({
      where,
      include: {
        slot: {
          select: {
            startTime: true,
            endTime: true,
            teacher: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
      orderBy: { slot: { startTime: 'asc' } },
    }));
    
    return NextResponse.json(reservations, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: '予約の取得中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
}

// 新しい予約のための決済セッションを作成
export async function POST(request: NextRequest) {
  try {
    console.log("予約作成リクエスト受信");
    
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    console.log("リクエストデータ:", data);
    
    if (!data.slotId) {
      return NextResponse.json(
        { error: 'レッスン枠IDは必須です' },
        { status: 400 }
      );
    }

    // 予約時間のバリデーション
    const hoursBooked = data.hoursBooked ? parseInt(data.hoursBooked, 10) : 1;
    
    if (isNaN(hoursBooked) || hoursBooked < 1) {
      return NextResponse.json(
        { error: '予約時間は1時間以上で指定してください' },
        { status: 400 }
      );
    }

    // トランザクション内で予約処理を実行
    const result = await prisma.$transaction(async (tx) => {
      // レッスンスロットを取得（新しく追加したフィールドも含める）
      const slot = await tx.lessonSlot.findUnique({
        where: { 
          id: data.slotId,
          isAvailable: true // 利用可能なスロットのみを対象
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!slot) {
        throw new Error('指定されたレッスン枠が見つからないか、既に予約されています');
      }

      // 新しいフィールドを型アサーションで取得
      const slotData = slot as unknown as {
        id: string;
        teacherId: string;
        teacher: { id: string; name: string | null; email: string | null };
        startTime: Date;
        endTime: Date;
        hourlyRate: number;
        currency: string;
        minHours: number;
        maxHours: number | null;
        isAvailable: boolean;
      };

      // デフォルト値を使用（スキーマに合わせて）
      const minHours = slotData.minHours || 1;
      const maxHours = slotData.maxHours || null;
      const hourlyRate = slotData.hourlyRate || 5000;
      const currency = slotData.currency || 'JPY';

      // 指定された時間数が最大時間を超えていないか確認
      if (maxHours !== null && hoursBooked > maxHours) {
        throw new Error(`このレッスン枠の最大予約時間は${maxHours}時間です`);
      }

      // 指定された時間数が最小時間未満でないか確認
      if (hoursBooked < minHours) {
        throw new Error(`このレッスン枠の最小予約時間は${minHours}時間です`);
      }

      // 予約開始時間と終了時間の計算
      const bookedStartTime = new Date(slotData.startTime);
      const bookedEndTime = new Date(bookedStartTime);
      bookedEndTime.setHours(bookedStartTime.getHours() + hoursBooked);

      // 予約終了時間がスロットの終了時間を超えていないか確認
      if (bookedEndTime > slotData.endTime) {
        throw new Error('予約時間がレッスンスロットの範囲を超えています');
      }

      // 合計金額の計算
      const totalAmount = hourlyRate * hoursBooked;

      // スロットを部分的に予約済みにする（完全には予約不可にしない）
      // この時点では予約確定前なので、isAvailableはtrueのまま
      
      // 予約レコードを作成
      const pendingReservation = await tx.reservation.create({
        data: {
          slotId: data.slotId,
          studentId: sessionInfo.user.id,
          status: 'PENDING',
          bookedStartTime,
          bookedEndTime,
          hoursBooked,
          totalAmount,
          notes: data.notes || null
        }
      });

      return {
        reservation: pendingReservation,
        slot: slotData,
        hourlyRate,
        currency
      };
    });

    // 決済処理の準備
    const { reservation, slot, hourlyRate, currency } = result;

    // 開始・終了時間のフォーマット
    const startTimeFormatted = new Date(reservation.bookedStartTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const endTimeFormatted = new Date(reservation.bookedEndTime).toLocaleString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Stripe チェックアウトセッションを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${reservation.hoursBooked}時間のレッスン予約`,
              description: `${slot.teacher.name}先生とのレッスン（${startTimeFormatted}〜${endTimeFormatted}）`,
            },
            // 日本円の場合は分割しない（そのままの金額を使用）
            unit_amount: currency.toLowerCase() === 'jpy' ? hourlyRate : hourlyRate * 100,
          },
          quantity: reservation.hoursBooked,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations?canceled=true`,
      metadata: {
        reservationId: reservation.id,
        studentId: sessionInfo.user.id,
        teacherId: slot.teacher.id,
        lessonSlotId: reservation.slotId,
        bookedStartTime: reservation.bookedStartTime.toISOString(),
        bookedEndTime: reservation.bookedEndTime.toISOString(),
        hoursBooked: String(reservation.hoursBooked),
        hourlyRate: String(hourlyRate),
      },
    });

    // Paymentレコードを作成
    await prisma.payment.create({
      data: {
        reservation: { connect: { id: reservation.id } },
        stripeSessionId: checkoutSession.id,
        amount: reservation.totalAmount,
        currency: currency,
        status: 'PENDING',
        userId: sessionInfo.user.id,
      },
    });

    // フロントエンド側（dashboard / reservation 両ページ）でのプロパティ名の差異に対応
    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      url: checkoutSession.url,
      reservationId: reservation.id
    });

  } catch (error) {
    console.error('予約作成エラー:', error);
    
    // エラー処理
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '予約作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 