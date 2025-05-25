const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkStripePrices() {
  console.log('🔍 Stripe価格ID確認開始...\n');
  
  const priceIds = [
    'price_1RSY1mRYtspYtD2zKG7WnUsa', // STARTER
    'price_1RSY2ORYtspYtD2zMsvNdlBQ', // PRO
    'price_1RSY5xRYtspYtD2zC3YM2Ny9'  // PREMIUM
  ];

  const planNames = ['Starter', 'PRO', 'Premium'];

  for (let i = 0; i < priceIds.length; i++) {
    const priceId = priceIds[i];
    const planName = planNames[i];

    try {
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product']
      });

      console.log(`📋 ${planName}プラン`);
      console.log(`🆔 価格ID: ${priceId}`);
      console.log(`💰 金額: ${price.unit_amount} ${price.currency.toUpperCase()}`);
      console.log(`📦 商品名: ${price.product.name}`);
      console.log(`🔄 間隔: ${price.recurring?.interval || 'N/A'}`);
      console.log(`✅ アクティブ: ${price.active}`);
      console.log('---');
      
    } catch (error) {
      console.error(`❌ 価格ID ${priceId} の取得エラー:`, error.message);
      console.log('---');
    }
  }
}

checkStripePrices().catch(console.error); 