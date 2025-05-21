// 動的ルートフラグ
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma, ReservationStatus } from '@prisma/client';
import { createCheckoutSessionForReservation } from '@/lib/stripe';
import { getBaseUrl, calculateTotalReservedMinutes, calculateSlotTotalMinutes } from '@/lib/utils';
import Stripe from 'stripe';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// Stripe インスタンスの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

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
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // リクエストボディからデータを取得
    const data = await request.json();
    const { slotId, duration = 60, bookedStartTime, bookedEndTime, notes } = data;
    
    // 処理のログ出力
    console.log(`予約リクエスト: slotId=${slotId}, duration=${duration}分, 時間帯=${bookedStartTime ? `${new Date(bookedStartTime).toLocaleTimeString()}~${new Date(bookedEndTime).toLocaleTimeString()}` : '未指定'}`);
    
    // 必須項目の検証
    if (!slotId) {
      return NextResponse.json({ error: 'レッスン枠IDが必要です' }, { status: 400 });
    }
    
    // 予約時間の制約チェック（60〜90分）
    if (duration < 60 || duration > 90) {
      return NextResponse.json(
        { error: 'レッスン時間は60分〜90分の間で設定してください' },
        { status: 400 }
      );
    }
    
    // 予約時間の指定が不完全な場合はエラー
    if ((bookedStartTime && !bookedEndTime) || (!bookedStartTime && bookedEndTime)) {
      return NextResponse.json(
        { error: '予約開始時間と終了時間の両方を指定してください' },
        { status: 400 }
      );
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
          },
          reservations: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            },
            select: {
              id: true,
              bookedStartTime: true,
              bookedEndTime: true,
              status: true
            }
          }
        }
      });

      if (!slot) {
        throw new Error('指定されたレッスン枠が見つからないか、既に予約されています');
      }

      // 固定料金で計算（hourlyRateをそのまま使用）
      const fixedAmount = slot.hourlyRate || 5000;
      const currency = slot.currency || 'jpy';
      
      // 予約時間の計算（固定時間）
      let reservationStartTime: Date;
      let reservationEndTime: Date;
      
      if (bookedStartTime && bookedEndTime) {
        // ユーザーが選択した正確な時間帯を使用
        reservationStartTime = new Date(bookedStartTime);
        reservationEndTime = new Date(bookedEndTime);
        
        // 予約時間が指定された範囲内かチェック（60-90分）
        const durationInMinutes = Math.round((reservationEndTime.getTime() - reservationStartTime.getTime()) / (1000 * 60));
        if (durationInMinutes < 60 || durationInMinutes > 90) {
          throw new Error(`予約時間は60分〜90分の間で設定してください（現在: ${durationInMinutes}分）`);
        }
      } else {
        // 選択がない場合は、開始時間からduration分の枠を予約
        reservationStartTime = new Date(slot.startTime);
        reservationEndTime = new Date(reservationStartTime);
        reservationEndTime.setMinutes(reservationEndTime.getMinutes() + duration);
        
        // 予約終了時間がスロット終了時間を超えないようにする
        const slotEndTime = new Date(slot.endTime);
        if (reservationEndTime > slotEndTime) {
          reservationEndTime = slotEndTime;
        }
      }
      
      // 予約時間の整合性チェック
      const slotStartTime = new Date(slot.startTime);
      const slotEndTime = new Date(slot.endTime);
      
      if (reservationStartTime < slotStartTime || reservationEndTime > slotEndTime) {
        throw new Error('予約時間がレッスン枠の範囲外です');
      }
      
      // 予約時間の重複チェック
      const existingReservations = slot.reservations || [];
      const hasOverlap = existingReservations.some(reservation => {
        const existingStart = new Date(reservation.bookedStartTime);
        const existingEnd = new Date(reservation.bookedEndTime);
        
        // 時間帯の重複チェック
        return (
          (reservationStartTime < existingEnd && reservationEndTime > existingStart) ||
          (existingStart < reservationEndTime && existingEnd > reservationStartTime)
        );
      });
      
      if (hasOverlap) {
        throw new Error('選択した時間帯は既に予約されています。別の時間を選択してください。');
      }

      // 実際のduration（分）を計算
      const durationInMinutes = Math.round((reservationEndTime.getTime() - reservationStartTime.getTime()) / (1000 * 60));
      
      // 予約データの作成準備
      const reservationData = {
        slotId: slot.id,
        studentId: session.user.id,
        status: 'PENDING' as const,
        bookedStartTime: reservationStartTime,
        bookedEndTime: reservationEndTime,
        hoursBooked: Math.ceil(durationInMinutes / 60),
        totalAmount: fixedAmount,
        notes: typeof notes === 'string' ? notes : null
      };
      
      // 予約レコードを作成
      const reservation = await tx.reservation.create({
        data: reservationData
      });
      
      // 日付と時間をフォーマット
      const formattedDate = format(reservationStartTime, 'yyyy年MM月dd日', { locale: ja });
      const formattedTimeRange = `${format(reservationStartTime, 'HH:mm', { locale: ja })} - ${format(reservationEndTime, 'HH:mm', { locale: ja })}`;
      const formattedDuration = `${durationInMinutes}分`;
      
      // セッション情報・リクエスト情報をログ出力（デバッグ用）
      console.log('セッション情報:', {
        userId: session.user.id,
        userEmail: session.user.email,
        role: session.role
      });
      
      try {
        // 決済セッション作成
        const checkoutSession = await createCheckoutSessionForReservation(
          session.user.id,
          session.user.email,
          reservation.id,
          fixedAmount,
          currency,
          {
            teacher: slot.teacher.name || '名前未設定',
            date: formattedDate,
            time: formattedTimeRange,
            duration: formattedDuration
          }
        );
        
        // payment レコード作成（決済情報の保存）
        await tx.payment.create({
          data: {
            stripeSessionId: checkoutSession.id,
            amount: fixedAmount,
            currency: currency,
            status: 'PENDING',
            userId: session.user.id,
            reservation: {
              connect: { id: reservation.id }
            }
          }
        });
        
        // 決済セッションURLとともに結果を返す
        return {
          success: true,
          reservation,
          checkoutUrl: checkoutSession.url
        };
      } catch (error) {
        console.error('Stripe決済セッション作成エラー:', error);
        // エラーが発生した場合も、予約自体は作成されたものを返す
        return {
          success: true,
          reservation,
          checkoutUrl: null,
          error: 'Stripe決済セッションの作成に失敗しました。管理者にお問い合わせください。'
        };
      }
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('予約作成エラー:', error);
    return NextResponse.json(
      { error: '予約の作成中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 