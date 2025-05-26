import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(request: NextRequest) {
  try {
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    
    console.log('=== Setup完了処理開始 ===');
    console.log('セッションID:', sessionId);

    // Stripe Checkout Sessionを取得
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'setup_intent.payment_method']
    });

    if (!checkoutSession.setup_intent) {
      throw new Error('Setup Intentが見つかりません');
    }

    const setupIntent = checkoutSession.setup_intent as Stripe.SetupIntent;
    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

    // メタデータから予約データを取得
    const reservationDataStr = checkoutSession.metadata?.reservationData;
    if (!reservationDataStr) {
      throw new Error('予約データが見つかりません');
    }

    const reservationData = JSON.parse(reservationDataStr);
    
    console.log('=== 予約データ復元 ===');
    console.log('予約データ:', reservationData);
    console.log('決済手段ID:', paymentMethod.id);

    // トランザクションで予約作成と決済情報保存
    const result = await prisma.$transaction(async (tx) => {
      // レッスンスロットを取得
      const slot = await tx.lesson_slots.findUnique({
        where: { 
          id: reservationData.slotId,
          isAvailable: true
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!slot) {
        throw new Error('指定されたレッスン枠が見つかりません');
      }

      // 予約を作成
      const reservation = await tx.reservations.create({
        data: {
          id: randomUUID(),
          slotId: reservationData.slotId,
          studentId: session.user.id,
          status: 'PENDING_APPROVAL', // メンター承認待ち
          bookedStartTime: new Date(reservationData.bookedStartTime),
          bookedEndTime: new Date(reservationData.bookedEndTime),
          hoursBooked: Math.ceil(reservationData.duration / 60),
          durationMinutes: reservationData.duration,
          totalAmount: reservationData.totalAmount,
          notes: reservationData.notes || null,
          updatedAt: new Date()
        }
      });

      // 決済情報を保存（Payment Intentは後で作成）
      const payment = await tx.payments.create({
        data: {
          id: randomUUID(),
          stripePaymentId: null, // Payment Intent作成時に更新（nullで初期化）
          stripeSessionId: sessionId,
          amount: reservationData.totalAmount,
          currency: 'jpy',
          status: 'SETUP_COMPLETED', // Setup完了状態
          userId: session.user.id,
          // Setup Intentと決済手段の情報を保存
          metadata: JSON.stringify({
            setupIntentId: setupIntent.id,
            paymentMethodId: paymentMethod.id,
            customerId: checkoutSession.customer
          }),
          updatedAt: new Date()
        }
      });

      // 予約にpaymentIdを関連付け
      await tx.reservations.update({
        where: { id: reservation.id },
        data: { paymentId: payment.id }
      });

      return { reservation, payment };
    });

    console.log('=== 予約・決済情報保存完了 ===');
    console.log('予約ID:', result.reservation.id);
    console.log('決済ID:', result.payment.id);

    return NextResponse.json({
      success: true,
      reservation: result.reservation,
      payment: result.payment,
      message: '予約が作成され、決済情報が保存されました。メンター承認後に自動で決済が実行されます。'
    });

  } catch (error) {
    console.error('Setup完了処理エラー:', error);
    return NextResponse.json(
      { error: 'Setup完了処理に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
} 