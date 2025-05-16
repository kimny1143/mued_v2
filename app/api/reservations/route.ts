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
    
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
    console.log("認証状態:", sessionInfo ? "認証済み" : "未認証", 
                sessionInfo?.user?.email || "メール情報なし", 
                "ロール:", sessionInfo?.role || "ロールなし");
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    console.log("リクエストデータ:", data);
    
    // 入力検証
    if (!data.slotId) {
      return NextResponse.json(
        { error: 'レッスン枠IDは必須です' },
        { status: 400 }
      );
    }

    // トランザクション内で予約処理を実行
    const result = await prisma.$transaction(async (tx) => {
      // スロットを悲観ロックで取得
      // @ts-expect-error: Prismaの型定義の問題を一時的に回避（悲観ロックの型定義が正しく認識されない）
      const slot = await tx.lessonSlot.findFirst({
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
          },
          reservations: true
        },
        lock: 'pessimistic' // 悲観ロックを適用
      });
      
      console.log("スロット情報:", {
        found: !!slot,
        isAvailable: slot?.isAvailable,
        reservationsCount: slot?.reservations.length,
        startTime: slot?.startTime,
        teacherId: slot?.teacherId
      });
      
      if (!slot) {
        throw new Error('指定されたレッスン枠が見つからないか、既に予約されています');
      }
      
      // 既存の予約を確認
      if (slot.reservations.length > 0) {
        console.log("既存の予約あり:", slot.reservations);
        throw new Error('このレッスン枠は既に予約されています');
      }
      
      // 予約レコードを作成
      const pendingReservation = await tx.reservation.create({
        data: {
          slotId: slot.id,
          studentId: sessionInfo.user.id,
          status: ReservationStatus.CONFIRMED,
          notes: data.notes || '',
        },
      });

      // スロットを利用不可に更新
      await tx.lessonSlot.update({
        where: { id: slot.id },
        data: { isAvailable: false }
      });

      return { slot, pendingReservation };
    }, {
      maxWait: 5000, // トランザクションの最大待機時間（ミリ秒）
      timeout: 10000 // トランザクションのタイムアウト時間（ミリ秒）
    });

    const { slot, pendingReservation } = result;
    
    // ベースURL
    const baseUrl = getBaseUrl();
    
    // レッスン日時のフォーマット
    const lessonDate = new Date(slot.startTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // メタデータに reservationId を含める
    const metadata = {
      reservationId: pendingReservation.id,
      slotId: slot.id,
      studentId: sessionInfo.user.id,
      teacherId: slot.teacherId,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
    };
    
    // Stripe Checkout セッションを作成
    try {
      const priceId = process.env.NEXT_PUBLIC_LESSON_PRICE_ID ?? 'price_1RPE4rRYtspYtD2zW8Lni2Gf';
      const successPath = '/dashboard/reservations/success';
      
      const session = await createCheckoutSession({
        priceId,
        successUrl: `${baseUrl}${successPath}?reservation_id=${pendingReservation.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}${successPath}?reservation_id=${pendingReservation.id}&cancelled=true`,
        metadata,
        clientReferenceId: `${slot.id}:${sessionInfo.user.id}`,
      });
      
      console.log("Stripe セッション作成成功:", session.id);
      
      return NextResponse.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        reservationId: pendingReservation.id,
      });
    } catch (error) {
      console.error("Stripe セッション作成エラー:", error);
      
      // Stripeセッション作成に失敗した場合、予約とスロットをロールバック
      await prisma.$transaction([
        prisma.reservation.delete({
          where: { id: pendingReservation.id }
        }),
        prisma.lessonSlot.update({
          where: { id: slot.id },
          data: { isAvailable: true }
        })
      ]);
      
      return NextResponse.json(
        { error: '決済セッションの作成に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
    
    // エラーメッセージを適切に整形
    const errorMessage = error instanceof Error ? error.message : '予約処理中にエラーが発生しました';
    const statusCode = errorMessage.includes('見つかりませんでした') ? 404 : 
                      errorMessage.includes('予約できません') ? 409 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 