import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
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

    const { sessionId, reservationId } = await request.json();
    
    console.log('=== Setup完了処理開始 ===');
    console.log('セッションID:', sessionId);
    console.log('予約ID:', reservationId);

    // 予約の存在確認と権限チェック
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        payments: true,
        users: true,
        lesson_slots: {
          include: {
            users: true
          }
        }
      }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック（予約者本人のみ）
    if (reservation.studentId !== session.user.id) {
      return NextResponse.json(
        { error: 'この予約にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    // 既に決済情報が存在する場合はエラー
    if (reservation.payments) {
      return NextResponse.json(
        { error: '既に決済情報が設定されています' },
        { status: 400 }
      );
    }

    // Stripe Checkout Sessionを取得
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'setup_intent.payment_method']
    });

    if (!checkoutSession.setup_intent) {
      throw new Error('Setup Intentが見つかりません');
    }

    const setupIntent = checkoutSession.setup_intent as Stripe.SetupIntent;
    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

    // メタデータの検証
    if (checkoutSession.metadata?.reservationId !== reservationId) {
      return NextResponse.json(
        { error: 'セッションと予約IDが一致しません' },
        { status: 400 }
      );
    }

    console.log('=== Setup Intent情報確認 ===');
    console.log('Setup Intent ID:', setupIntent.id);
    console.log('Payment Method ID:', paymentMethod.id);
    console.log('Customer ID:', checkoutSession.customer);

    // トランザクションで決済情報を保存
    const result = await prisma.$transaction(async (tx) => {
      // 決済情報を作成
      const payment = await tx.payments.create({
        data: {
          id: randomUUID(),
          stripePaymentId: null, // Payment Intent作成時に更新
          stripeSessionId: sessionId,
          amount: reservation.totalAmount,
          currency: 'jpy',
          status: 'SETUP_COMPLETED' as PaymentStatus,
          userId: session.user.id,
          updatedAt: new Date()
        }
      });

      // Setup Intentと決済手段の情報をmetadataとして保存
      await tx.$executeRaw`
        UPDATE payments 
        SET metadata = ${JSON.stringify({
          setupIntentId: setupIntent.id,
          paymentMethodId: paymentMethod.id,
          customerId: checkoutSession.customer,
          paymentMethodType: paymentMethod.type,
          cardBrand: paymentMethod.card?.brand,
          cardLast4: paymentMethod.card?.last4,
          setupCompletedAt: new Date().toISOString()
        })}
        WHERE id = ${payment.id}
      `;

      // 予約にpaymentIdを関連付け
      const updatedReservation = await tx.reservations.update({
        where: { id: reservationId },
        data: { 
          paymentId: payment.id,
          updatedAt: new Date()
        }
      });

      return { payment, reservation: updatedReservation };
    });

    console.log('=== Setup完了処理成功 ===');
    console.log('決済ID:', result.payment.id);
    console.log('決済ステータス:', result.payment.status);

    return NextResponse.json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amount
      },
      reservation: {
        id: result.reservation.id,
        status: result.reservation.status
      },
      message: '決済情報が正常に保存されました。メンター承認後、レッスン開始2時間前に自動で決済が実行されます。'
    });

  } catch (error) {
    console.error('Setup完了処理エラー:', error);
    return NextResponse.json(
      { error: 'Setup完了処理に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
} 