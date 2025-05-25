const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function triggerStripeWebhook() {
  console.log('🚀 Stripe Webhookイベントをトリガー...\n');

  try {
    // 1. 現在のアクティブなサブスクリプションを取得
    console.log('📋 アクティブなサブスクリプションを確認中...');
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 5
    });

    if (subscriptions.data.length === 0) {
      console.log('❌ アクティブなサブスクリプションが見つかりません');
      return;
    }

    const subscription = subscriptions.data[0];
    console.log(`✅ サブスクリプション発見: ${subscription.id}`);
    console.log(`   顧客: ${subscription.customer}`);
    console.log(`   プラン: ${subscription.items.data[0]?.price.id}`);
    console.log(`   ステータス: ${subscription.status}`);

    // 2. サブスクリプションのメタデータを更新してWebhookをトリガー
    console.log('\n🔄 サブスクリプションを更新してWebhookをトリガー...');
    
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      metadata: {
        ...subscription.metadata,
        webhook_test: 'true',
        test_timestamp: new Date().toISOString(),
        test_trigger: 'manual_webhook_test'
      }
    });

    console.log('✅ サブスクリプション更新完了');
    console.log(`   更新されたメタデータ:`, updatedSubscription.metadata);

    // 3. Webhookエンドポイントの状態を確認
    console.log('\n📡 Webhookエンドポイントの状態確認...');
    const endpoints = await stripe.webhookEndpoints.list();
    const devEndpoint = endpoints.data.find(ep => ep.url.includes('dev.mued.jp'));

    if (devEndpoint) {
      console.log(`✅ エンドポイント確認: ${devEndpoint.url}`);
      console.log(`   ステータス: ${devEndpoint.status}`);
      console.log(`   有効なイベント: ${devEndpoint.enabled_events.join(', ')}`);
    } else {
      console.log('❌ dev.mued.jpのエンドポイントが見つかりません');
    }

    // 4. 最近のイベントを確認
    console.log('\n📊 最近のWebhookイベントを確認...');
    const events = await stripe.events.list({
      limit: 5,
      types: ['customer.subscription.updated']
    });

    console.log(`最新のsubscription.updatedイベント: ${events.data.length}件`);
    events.data.forEach((event, index) => {
      console.log(`${index + 1}. ${event.id} - ${new Date(event.created * 1000).toLocaleString()}`);
      if (event.data.object.id === subscription.id) {
        console.log(`   ✅ 今回更新したサブスクリプションのイベント`);
      }
    });

    console.log('\n💡 次の手順:');
    console.log('1. Vercelのファンクションログを確認');
    console.log('2. Stripeダッシュボードでイベント配信状況を確認');
    console.log('3. Supabaseでデータが更新されているか確認');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

triggerStripeWebhook().catch(console.error); 