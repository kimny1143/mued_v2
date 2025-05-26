const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testManualPayment() {
  console.log('🧪 手動決済処理テスト');
  
  try {
    // SETUP_COMPLETED状態の決済を取得
    const payment = await prisma.payments.findFirst({
      where: {
        status: 'SETUP_COMPLETED',
        stripePaymentId: null
      },
      include: {
        reservations: true
      }
    });

    if (!payment) {
      console.log('❌ SETUP_COMPLETED状態の決済が見つかりません');
      return;
    }

    console.log('✅ テスト対象の決済:', {
      paymentId: payment.id,
      reservationId: payment.reservations?.id,
      amount: payment.amount,
      status: payment.status
    });

    if (!payment.metadata) {
      console.log('❌ metadataが存在しません');
      return;
    }

    const metadata = JSON.parse(payment.metadata);
    console.log('📋 メタデータ:', metadata);

    if (!metadata.paymentMethodId) {
      console.log('❌ paymentMethodIdが見つかりません');
      return;
    }

    console.log('🔄 Payment Intent作成テスト...');

    // Payment Intentを作成（テストモード）
    const paymentIntent = await stripe.paymentIntents.create({
      amount: payment.amount,
      currency: 'jpy',
      customer: metadata.customerId,
      payment_method: metadata.paymentMethodId,
      confirmation_method: 'manual',
      confirm: true, // 即座に決済実行
      metadata: {
        reservationId: payment.reservations?.id || '',
        testMode: 'true'
      },
      description: `テスト決済 - 予約ID: ${payment.reservations?.id}`,
    });

    console.log('✅ Payment Intent作成成功:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    });

    // 本番では以下のようにデータベースを更新
    console.log('📝 本番では以下のように更新されます:');
    console.log(`  stripePaymentId: ${paymentIntent.id}`);
    console.log(`  status: SUCCEEDED`);
    
    console.log('🎉 手動決済テスト完了！');

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
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

testManualPayment(); 