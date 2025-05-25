const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookEndpoint() {
  console.log('🧪 Webhookエンドポイントテスト開始...\n');

  try {
    // 1. 現在のWebhookエンドポイントを確認
    console.log('📋 現在のWebhookエンドポイント一覧:');
    const endpoints = await stripe.webhookEndpoints.list();
    
    if (endpoints.data.length === 0) {
      console.log('❌ Webhookエンドポイントが設定されていません');
      console.log('\n🔧 Stripeダッシュボードで以下の設定を行ってください:');
      console.log('1. Developers > Webhooks > Add endpoint');
      console.log('2. Endpoint URL: https://your-domain.vercel.app/api/webhooks/stripe');
      console.log('3. Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, checkout.session.completed');
      return;
    }

    let hasEnabledEndpoint = false;
    endpoints.data.forEach((endpoint, index) => {
      console.log(`${index + 1}. URL: ${endpoint.url}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Events: ${endpoint.enabled_events.join(', ')}`);
      
      if (endpoint.status === 'enabled') {
        hasEnabledEndpoint = true;
      } else {
        console.log('   ⚠️  このエンドポイントは無効化されています！');
      }
      console.log('');
    });

    if (!hasEnabledEndpoint) {
      console.log('🚨 重要: すべてのWebhookエンドポイントが無効化されています！');
      console.log('🔧 Stripeダッシュボードでエンドポイントを有効化してください:');
      console.log('   1. Developers > Webhooks');
      console.log('   2. エンドポイントを選択');
      console.log('   3. "Enable" ボタンをクリック');
      console.log('');
    }

    // 2. テスト用のCheckout Sessionを作成（支払い方法を含む）
    console.log('🔔 テスト用Checkout Session作成中...');
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID || 'price_1RSY1mRYtspYtD2zKG7WnUsa',
        quantity: 1,
      }],
      success_url: 'https://dev.mued.jp/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://dev.mued.jp/dashboard/plans?canceled=true',
      metadata: {
        userId: 'test-user-webhook',
        test: 'true'
      }
    });

    console.log('✅ テストCheckout Session作成:', session.id);
    console.log('🔗 テスト用URL:', session.url);
    console.log('\n📝 テスト手順:');
    console.log('1. 上記URLにアクセス');
    console.log('2. テストカード番号: 4242 4242 4242 4242');
    console.log('3. 有効期限: 12/34, CVC: 123');
    console.log('4. 決済完了後、Webhookイベントが送信されます');
    console.log('\n📊 Stripeダッシュボード > Developers > Webhooks でイベント配信状況を確認してください');

  } catch (error) {
    console.error('❌ Webhookテストエラー:', error.message);
  }
}

testWebhookEndpoint().catch(console.error); 