const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testNewWebhook() {
  console.log('🧪 新しいWebhookエンドポイントのテスト...\n');

  try {
    // 1. エンドポイントの状態を確認
    console.log('📋 Webhookエンドポイントの確認...');
    const endpoints = await stripe.webhookEndpoints.list();
    
    const activeEndpoint = endpoints.data.find(ep => ep.url.includes('dev.mued.jp'));
    
    if (!activeEndpoint) {
      console.error('❌ dev.mued.jpのエンドポイントが見つかりません');
      return;
    }
    
    console.log('✅ エンドポイント確認完了:');
    console.log(`   URL: ${activeEndpoint.url}`);
    console.log(`   ステータス: ${activeEndpoint.status}`);
    console.log(`   ID: ${activeEndpoint.id}`);
    
    // 2. 最新のサブスクリプションイベントを確認
    console.log('\n📊 最新のサブスクリプションイベントを確認...');
    const events = await stripe.events.list({
      limit: 5,
      types: ['customer.subscription.updated', 'customer.subscription.created']
    });
    
    if (events.data.length === 0) {
      console.log('⚠️  最近のイベントがありません');
      return;
    }
    
    console.log(`\n最新のイベント: ${events.data.length}件`);
    events.data.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.type}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   作成: ${new Date(event.created * 1000).toLocaleString()}`);
    });
    
    // 3. 手動でWebhookをトリガーする方法を案内
    console.log('\n💡 Webhookの動作確認方法:');
    console.log('\n方法1: Stripeダッシュボードからテスト');
    console.log('1. https://dashboard.stripe.com/test/webhooks');
    console.log('2. 新しいエンドポイントを選択');
    console.log('3. "Send test webhook" ボタンをクリック');
    console.log('4. customer.subscription.updated を選択して送信');
    
    console.log('\n方法2: ローカルでのテスト（Stripe CLI）');
    console.log('1. stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    console.log('2. stripe trigger customer.subscription.updated');
    
    console.log('\n方法3: 実際にプランを変更');
    console.log('1. ダッシュボードでプラン変更');
    console.log('2. Vercelのログで確認');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

testNewWebhook().catch(console.error); 