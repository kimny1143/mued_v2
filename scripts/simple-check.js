const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simpleCheck() {
  try {
    const payment = await prisma.payments.findFirst({
      where: { status: 'SETUP_COMPLETED' },
      include: { reservations: true }
    });
    
    if (!payment) {
      console.log('❌ SETUP_COMPLETED決済なし');
      return;
    }
    
    console.log('✅ 決済情報:', {
      id: payment.id,
      amount: payment.amount,
      stripePaymentId: payment.stripePaymentId,
      hasMetadata: !!payment.metadata
    });
    
    if (payment.metadata) {
      const meta = JSON.parse(payment.metadata);
      console.log('📋 メタデータ:', {
        setupIntentId: meta.setupIntentId,
        paymentMethodId: meta.paymentMethodId,
        customerId: meta.customerId
      });
    }
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleCheck(); 