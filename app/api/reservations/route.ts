import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { createCheckoutSession, stripe } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils';
import Stripe from 'stripe';

// 予約ステータスの列挙型
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// 支払いステータスの列挙型
enum PaymentStatus {
  UNPAID = 'UNPAID',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

// 予約一覧を取得
export async function GET(request: NextRequest) {
  try {
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
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
    
    // データベースから予約を取得
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        slot: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        slot: {
          startTime: 'asc',
        },
      },
    });
    
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: '予約の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 新しい予約を作成
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
    
    // スロットが存在するか確認
    const slot = await prisma.lessonSlot.findUnique({
      where: { id: data.slotId },
      include: {
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            },
          },
        },
      },
    });
    
    console.log("スロット情報:", {
      found: !!slot,
      isAvailable: slot?.isAvailable,
      reservationsCount: slot?.reservations.length,
      startTime: slot?.startTime,
      teacherId: slot?.teacherId
    });
    
    if (!slot) {
      return NextResponse.json(
        { error: '指定されたレッスン枠が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // スロットが利用可能か確認
    if (!slot.isAvailable) {
      console.log("スロット利用不可: isAvailable=false");
      return NextResponse.json(
        { error: 'このレッスン枠は現在予約できません' },
        { status: 409 }
      );
    }
    
    // すでに予約が存在するか確認
    if (slot.reservations.length > 0) {
      console.log("既存予約あり:", slot.reservations);
      return NextResponse.json(
        { error: 'このレッスン枠は既に予約されています' },
        { status: 409 }
      );
    }
    
    // レッスン枠が過去のものでないことを確認
    if (new Date(slot.startTime) < new Date()) {
      return NextResponse.json(
        { error: '過去のレッスン枠は予約できません' },
        { status: 400 }
      );
    }
    
    // 自分自身のレッスン枠は予約できない（講師が自分のレッスンを予約するケース）
    if (sessionInfo.user.id === slot.teacherId) {
      return NextResponse.json(
        { error: '自分自身のレッスン枠は予約できません' },
        { status: 400 }
      );
    }
    
    // 予約を作成
    console.log("新規予約作成:", {
      slotId: data.slotId,
      studentId: sessionInfo.user.id,
      notes: data.notes
    });
    
    const newReservation = await prisma.reservation.create({
      data: {
        slotId: data.slotId,
        studentId: sessionInfo.user.id,
        status: ReservationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        notes: data.notes,
      },
      include: {
        slot: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    console.log("予約作成成功:", {
      id: newReservation.id,
      status: newReservation.status,
      paymentStatus: newReservation.paymentStatus
    });

    // Stripe決済処理を作成
    try {
      const baseUrl = getBaseUrl();
      // 単体レッスン用の正しい価格ID
      const LESSON_PRICE_ID = 'price_1ROXvxRYtspYtD2zVhMlsy6M';
      
      console.log("設定された単体レッスン価格ID:", LESSON_PRICE_ID);
      
      // 価格IDが実際に存在するか検証
      try {
        // 価格情報を取得して詳細をログ
        const price = await stripe.prices.retrieve(LESSON_PRICE_ID);
        console.log("単体レッスン価格情報:", {
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          product: typeof price.product === 'string' ? price.product : price.product?.id
        });
      } catch (priceError) {
        console.error("価格検証エラー:", priceError);
        // エラー時も処理を継続
      }
      
      // チェックアウトセッションを作成
      const session = await createCheckoutSession({
        priceId: LESSON_PRICE_ID, // 直接固定IDを使用
        successUrl: `${baseUrl}/dashboard/reservations/success?session_id=${newReservation.id}`,
        cancelUrl: `${baseUrl}/dashboard/reservations`,
        metadata: {
          reservationId: newReservation.id,
          slotId: data.slotId,
          studentId: sessionInfo.user.id,
          teacherId: newReservation.slot.teacherId,
        },
        mode: 'payment',
      });
      
      console.log("Stripeチェックアウトセッション作成成功:", {
        sessionId: session.id,
        url: session.url
      });
      
      // 予約を更新してStripeセッションIDを保存
      await prisma.reservation.update({
        where: { id: newReservation.id },
        data: {
          paymentId: session.id,
          paymentStatus: PaymentStatus.PROCESSING,
        }
      });
      
      // クライアントに返す情報
      return NextResponse.json({
        ...newReservation,
        checkoutUrl: session.url,
        sessionId: session.id
      }, { status: 201 });
      
    } catch (stripeError) {
      console.error('Stripe決済セッション作成エラー:', stripeError);
      
      // エラーが発生したが予約自体は作成済みなので、エラー情報を返す
      return NextResponse.json({
        ...newReservation,
        sessionId: newReservation.id, // フォールバックとして予約IDを返す
        error: 'お支払い処理の準備中にエラーが発生しました。管理者にお問い合わせください。'
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error('予約作成エラー:', error);
    return NextResponse.json(
      { error: '予約の作成中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 