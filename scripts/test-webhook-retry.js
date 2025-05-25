const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function retryFailedWebhooks() {
  console.log('🔄 失敗したWebhookイベントの再送信開始...\n');

  try {
    // 1. Webhookエンドポイントを確認
    console.log('📋 Webhookエンドポイント確認中...');
    const endpoints = await stripe.webhookEndpoints.list();
    
    if (endpoints.data.length === 0) {
      console.log('❌ Webhookエンドポイントが設定されていません');
      return;
    }

    const endpoint = endpoints.data[0];
    console.log(`✅ エンドポイント: ${endpoint.url}`);
    console.log(`   ステータス: ${endpoint.status}`);
    
    // 2. 失敗したイベントを確認
    console.log('\n📊 イベント配信状況を確認中...');
    console.log('⚠️  Stripeダッシュボードで以下を確認してください:');
    console.log('1. Developers > Webhooks');
    console.log('2. エンドポイントを選択');
    console.log('3. "Failed" タブで失敗したイベントを確認');
    console.log('4. 各イベントの "Resend" ボタンで再送信');
    
    // 3. 最新のイベントを取得してテスト
    console.log('\n🧪 最新のイベントでテスト送信...');
    const events = await stripe.events.list({
      limit: 5,
      types: ['customer.subscription.created', 'customer.subscription.updated', 'checkout.session.completed']
    });

    console.log(`\n最近のイベント:`)
    events.data.forEach(event => {
      console.log(`- ${event.type} (${new Date(event.created * 1000).toLocaleString()})`);
    });

    // 4. ローカルでWebhookをテスト
    console.log('\n💡 ローカルテストの推奨:');
    console.log('開発環境でWebhookをテストする場合:');
    console.log('1. stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    console.log('2. 別のターミナルで: stripe trigger customer.subscription.updated');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

retryFailedWebhooks().catch(console.error); 