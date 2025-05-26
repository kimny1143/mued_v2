const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function manualCompletePayment(reservationId) {
  console.log('🔧 手動決済完了処理');
  console.log('予約ID:', reservationId);
  
  try {
    // 予約と決済情報を取得
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        payments: true,
        lesson_slots: {
          include: {
            users: { select: { name: true } }
          }
        },
        users: { select: { name: true } }
      }
    });

    if (!reservation) {
      console.log('❌ 予約が見つかりません');
      return;
    }

    if (!reservation.payments) {
      console.log('❌ 決済情報が見つかりません');
      return;
    }

    if (reservation.payments.status !== 'SETUP_COMPLETED') {
      console.log('❌ 決済ステータスがSETUP_COMPLETEDではありません:', reservation.payments.status);
      return;
    }

    console.log('✅ 予約情報:', {
      student: reservation.users.name,
      mentor: reservation.lesson_slots.users.name,
      amount: reservation.payments.amount,
      status: reservation.status
    });

    if (!reservation.payments.metadata) {
      console.log('❌ 決済メタデータが見つかりません');
      return;
    }

    const metadata = JSON.parse(reservation.payments.metadata);
    console.log('📋 決済メタデータ:', {
      setupIntentId: metadata.setupIntentId,
      paymentMethodId: metadata.paymentMethodId,
      customerId: metadata.customerId
    });

    if (!metadata.paymentMethodId) {
      console.log('❌ paymentMethodIdが見つかりません');
      return;
    }

    console.log('🔄 Payment Intent作成中...');

    // Payment Intentを作成（修正版）
    const paymentIntent = await stripe.paymentIntents.create({
      amount: reservation.payments.amount,
      currency: 'jpy',
      customer: metadata.customerId,
      payment_method: metadata.paymentMethodId,
      confirm: true, // 即座に決済実行
      metadata: {
        reservationId: reservation.id,
        studentId: reservation.studentId,
        teacherId: reservation.lesson_slots.teacherId,
        slotId: reservation.slotId,
        manualCompletion: 'true'
      },
      description: `手動決済完了 - 予約ID: ${reservation.id}`,
    });

    console.log('✅ Payment Intent作成成功:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    });

    // データベースを更新
    console.log('📝 データベース更新中...');
    
    const updateResult = await prisma.$transaction(async (tx) => {
      // 決済情報を更新
      const updatedPayment = await tx.payments.update({
        where: { id: reservation.payments.id },
        data: {
          stripePaymentId: paymentIntent.id,
          status: 'SUCCEEDED',
          updatedAt: new Date()
        }
      });

      // 予約ステータスを確定済みに更新
      const updatedReservation = await tx.reservations.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED' }
      });

      return { updatedPayment, updatedReservation };
    });

    console.log('✅ データベース更新完了:', {
      paymentId: updateResult.updatedPayment.id,
      paymentStatus: updateResult.updatedPayment.status,
      stripePaymentId: updateResult.updatedPayment.stripePaymentId,
      reservationStatus: updateResult.updatedReservation.status
    });

    console.log('🎉 手動決済完了成功！');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.type) {
      console.error('エラータイプ:', error.type);
    }
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数から予約IDを取得
const reservationId = process.argv[2];

if (!reservationId) {
  console.log('使用方法: node scripts/manual-complete-payment.js <予約ID>');
  console.log('例: node scripts/manual-complete-payment.js dfea51d8-02a7-448e-adaa-252cb097592e');
  process.exit(1);
}

manualCompletePayment(reservationId); 