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
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

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
  const session = await getSessionFromRequest(request);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    // リクエストボディからデータを取得
    const data = await request.json();
    const { slotId, hoursBooked = 1, bookedStartTime, bookedEndTime } = data;
    
    // 処理のログ出力
    console.log(`予約リクエスト: slotId=${slotId}, hoursBooked=${hoursBooked}, 時間帯=${bookedStartTime ? `${new Date(bookedStartTime).toLocaleTimeString()}~${new Date(bookedEndTime).toLocaleTimeString()}` : '未指定'}`);
    
    if (!slotId) {
      return NextResponse.json({ error: 'レッスン枠IDが必要です' }, { status: 400 });
    }
    
    // ユーザーのロールを取得
    const role = session.role || 'student'; // デフォルトはstudent
    
    // studentロールのみ予約可能
    if (role !== 'student') {
      return NextResponse.json(
        { error: '生徒アカウントのみがレッスンを予約できます' },
        { status: 403 }
      );
    }
    
    // トランザクション開始 - 予約作成から決済まで一貫して処理
    const result = await prisma.$transaction(async (tx) => {
      // レッスンスロットを取得（新しく追加したフィールドも含める）
      const slot = await tx.lessonSlot.findUnique({
        where: { 
          id: slotId,
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

      // 正しい料金計算のために時間単価を取得（hourlyRateがなければ5000円をデフォルトとする）
      const hourlyRate = slot.hourlyRate || 5000;
      const currency = slot.currency || 'jpy';
      
      // 予約時間の計算
      let reservationStartTime: Date;
      let reservationEndTime: Date;
      
      if (bookedStartTime && bookedEndTime) {
        // ユーザーが選択した正確な時間帯を使用
        reservationStartTime = new Date(bookedStartTime);
        reservationEndTime = new Date(bookedEndTime);
      } else {
        // 選択がない場合は、開始時間から指定された時間数分の枠を予約
        reservationStartTime = new Date(slot.startTime);
        reservationEndTime = new Date(reservationStartTime);
        reservationEndTime.setHours(reservationEndTime.getHours() + hoursBooked);
        
        // 予約終了時間がスロット終了時間を超えないようにする
        const slotEndTime = new Date(slot.endTime);
        if (reservationEndTime > slotEndTime) {
          reservationEndTime = slotEndTime;
        }
      }
      
      // フォーマット済みの時間文字列を作成（エラー表示用）
      const startTimeFormatted = format(reservationStartTime, 'M月d日(EEE) HH:mm', { locale: ja });
      const endTimeFormatted = format(reservationEndTime, 'HH:mm', { locale: ja });
      
      // 予約を作成
      const reservation = await tx.reservation.create({
        data: {
          studentId: session.user.id,
          slotId: slot.id,
          status: 'PENDING', // 支払い前はPENDING
          bookedStartTime: reservationStartTime,
          bookedEndTime: reservationEndTime,
          hoursBooked: hoursBooked,
          totalAmount: hourlyRate * hoursBooked, // 合計金額を計算して保存
          notes: `${format(reservationStartTime, 'M月d日(EEE)', { locale: ja })}のレッスン`
        },
      });
      
      // 合計金額計算（時間単価 × 予約時間）
      const baseAmount = hourlyRate * hoursBooked;
      
      // 消費税を追加（10%）
      const taxAmount = Math.floor(baseAmount * 0.1);
      
      // 最終合計金額
      const totalAmount = baseAmount + taxAmount;

      // ベースURLの取得
      const baseUrl = getBaseUrl();
      console.log(`使用するベースURL: ${baseUrl}`);

      // リダイレクトURLを構築
      const successUrl = `${baseUrl}/dashboard/reservations?success=true`;
      const cancelUrl = `${baseUrl}/dashboard/reservations?canceled=true`;

      // Stripe チェックアウトセッションを作成
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `${slot.teacher.name}先生のレッスン予約`,
                description: `${startTimeFormatted}～${endTimeFormatted}（${hoursBooked}時間）`,
              },
              unit_amount: totalAmount,
            },
            quantity: 1, // 常に1を指定（Stripeの要件）
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: reservation.id, // 予約IDを参照として渡す
        metadata: {
          reservationId: reservation.id,
          studentId: session.user.id,
          slotId: slot.id,
          teacherId: slot.teacherId,
          hourlyRate: String(hourlyRate),    // 時間単価
          hoursBooked: String(hoursBooked),  // 予約時間数
          baseAmount: String(baseAmount),    // 基本料金（時間単価×時間）
          taxAmount: String(taxAmount),      // 消費税額
          totalAmount: String(totalAmount),  // 消費税込み合計金額
          startTime: reservationStartTime.toISOString(),
          endTime: reservationEndTime.toISOString(),
          reservationNote: `${slot.teacher.name}先生とのレッスン（${startTimeFormatted}〜${endTimeFormatted}）`,
        },
      });

      // 予約にStripeのセッションIDを関連付ける
      // Payment レコードを作成して予約と関連付ける
      const payment = await tx.payment.create({
        data: {
          stripeSessionId: checkoutSession.id,
          amount: totalAmount,
          currency: currency,
          status: 'PENDING',
          userId: session.user.id,
        }
      });
      
      // 作成したPaymentを予約に関連付ける
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentId: payment.id,
        }
      });

      return {
        reservationId: reservation.id,
        checkoutUrl: checkoutSession.url,
      };
    });

    // 成功レスポンス
    console.log(`レッスン予約成功: reservationId=${result.reservationId}, チェックアウトURL=${result.checkoutUrl}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('予約作成エラー:', error);
    
    // エラーの種類に応じたメッセージを生成
    let errorMessage = '予約の作成に失敗しました';
    let statusCode = 500;
    
    // Stripeエラーの場合
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeCardError':
          errorMessage = `決済カードエラー: ${error.message}`;
          statusCode = 400;
          break;
        case 'StripeRateLimitError':
          errorMessage = 'APIリクエスト制限に達しました。しばらく待ってから再試行してください';
          statusCode = 429;
          break;
        case 'StripeInvalidRequestError':
          errorMessage = `無効なリクエスト: ${error.message}`;
          statusCode = 400;
          break;
        case 'StripeAPIError':
          errorMessage = 'Stripe APIエラー。しばらく待ってから再試行してください';
          statusCode = 503;
          break;
        case 'StripeConnectionError':
          errorMessage = 'Stripe接続エラー。インターネット接続を確認してください';
          statusCode = 503;
          break;
        case 'StripeAuthenticationError':
          errorMessage = '認証エラー。システム管理者に連絡してください';
          statusCode = 401;
          break;
        default:
          errorMessage = `決済処理エラー: ${error.message}`;
          statusCode = 500;
      }
    } else {
      // その他のエラー
      errorMessage = `予約処理エラー: ${(error as Error).message}`;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
} 