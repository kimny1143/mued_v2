const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createFreePlan() {
  console.log('🆓 FREEプランをStripeに作成中...\n');

  try {
    // 1. 製品を作成
    const product = await stripe.products.create({
      name: 'MUED LMS - FREE',
      description: '基本機能を無料で体験できるプラン',
      metadata: {
        plan_type: 'free',
        features: JSON.stringify([
          '基本的な学習コンテンツ',
          'コミュニティアクセス',
          '月1回のグループレッスン',
          '基本的なプログレス追跡'
        ])
      }
    });

    console.log('✅ 製品作成完了:', {
      productId: product.id,
      name: product.name
    });

    // 2. 0円の価格を作成
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 0, // 0円
      currency: 'jpy',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_name: 'FREE',
        plan_type: 'free'
      }
    });

    console.log('✅ 価格作成完了:', {
      priceId: price.id,
      amount: price.unit_amount,
      currency: price.currency
    });

    console.log('\n🎉 FREEプラン作成完了！');
    console.log('📋 環境変数に追加してください:');
    console.log(`NEXT_PUBLIC_SUBSCRIPTION_FREE_ID=${price.id}`);

    return { product, price };

  } catch (error) {
    console.error('❌ FREEプラン作成エラー:', error);
    throw error;
  }
}

createFreePlan().catch(console.error); 