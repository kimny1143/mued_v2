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

    // トランザクション内で予約処理を実行
    const result = await prisma.$transaction(async (tx) => {
      // 楽観的排他制御を使用してスロットを更新
      const updatedSlot = await tx.lessonSlot.update({
        where: { 
          id: data.slotId,
          isAvailable: true // 利用可能なスロットのみを対象
        },
        data: { 
          isAvailable: false // 予約不可に更新
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

      if (!updatedSlot) {
        throw new Error('指定されたレッスン枠が見つからないか、既に予約されています');
      }

      // 予約レコードを作成
      const pendingReservation = await tx.reservation.create({
        data: {
          slotId: data.slotId,
          studentId: sessionInfo.user.id,
          status: 'PENDING',
          notes: data.notes || null
        }
      });

      return {
        reservation: pendingReservation,
        slot: updatedSlot
      };
    });

    // Stripe 価格IDが環境変数に無い場合のフォールバック
    const lessonPriceId = process.env.NEXT_PUBLIC_LESSON_PRICE_ID ?? 'price_1RPE4rRYtspYtD2zW8Lni2Gf';

    // チェックアウトセッションを作成
    const checkoutSession = await createCheckoutSession({
      priceId: lessonPriceId,
      slotId: data.slotId,
      reservationId: result.reservation.id,
      successUrl: `${getBaseUrl()}/dashboard/reservations/success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${result.reservation.id}`,
      cancelUrl: `${getBaseUrl()}/dashboard/reservations?canceled=true`,
      metadata: {
        teacherId: result.slot.teacher.id,
        studentId: sessionInfo.user.id,
        startTime: result.slot.startTime.toISOString(),
        endTime: result.slot.endTime.toISOString(),
        reservationId: result.reservation.id
      }
    });

    // フロントエンド側（dashboard / reservation 両ページ）でのプロパティ名の差異に対応
    // - 旧実装: checkoutUrl を期待
    // - 新実装: url を期待
    // どちらでも利用出来るよう両方を返す
    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      url: checkoutSession.url,
      reservationId: result.reservation.id
    });

  } catch (error) {
    console.error('予約作成エラー:', error);
    
    // 競合エラーの場合
    if (error instanceof Prisma.PrismaClientKnownRequestError && 
        error.code === 'P2025') {
      return NextResponse.json(
        { error: 'このレッスン枠は既に予約されています' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: '予約の作成中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 