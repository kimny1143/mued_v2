const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkWebhookLogs() {
  console.log('📊 Webhook配信状況を確認...\n');

  try {
    // 1. Webhookエンドポイントを取得
    const endpoints = await stripe.webhookEndpoints.list();
    const devEndpoint = endpoints.data.find(ep => ep.url.includes('dev.mued.jp'));

    if (!devEndpoint) {
      console.log('❌ dev.mued.jpのエンドポイントが見つかりません');
      return;
    }

    console.log('📡 Webhookエンドポイント情報:');
    console.log(`   URL: ${devEndpoint.url}`);
    console.log(`   ステータス: ${devEndpoint.status}`);
    console.log(`   作成日: ${new Date(devEndpoint.created * 1000).toLocaleString()}`);
    console.log(`   有効なイベント: ${devEndpoint.enabled_events.length}件`);

    // 2. 最新のイベントを確認
    console.log('\n📋 最新のWebhookイベント (customer.subscription.updated):');
    const events = await stripe.events.list({
      limit: 10,
      types: ['customer.subscription.updated']
    });

    if (events.data.length === 0) {
      console.log('❌ customer.subscription.updatedイベントが見つかりません');
      return;
    }

    for (const event of events.data.slice(0, 5)) {
      console.log(`\n🔔 イベント: ${event.id}`);
      console.log(`   作成日時: ${new Date(event.created * 1000).toLocaleString()}`);
      console.log(`   サブスクリプション: ${event.data.object.id}`);
      console.log(`   プラン: ${event.data.object.items.data[0]?.price.id}`);
      
      // このイベントの配信試行を確認
      try {
        const eventDetails = await stripe.events.retrieve(event.id);
        console.log(`   配信試行: ${eventDetails.pending_webhooks}件`);
        
        if (eventDetails.pending_webhooks > 0) {
          console.log('   ⚠️  配信が保留中または失敗している可能性があります');
        } else {
          console.log('   ✅ 配信完了');
        }
      } catch (detailError) {
        console.log(`   ❌ 詳細取得エラー: ${detailError.message}`);
      }
    }

    // 3. 特定のサブスクリプションのイベントを確認
    console.log('\n🎯 特定サブスクリプション (sub_1RScLNRYtspYtD2zTK1IspKp) のイベント:');
    const subEvents = events.data.filter(event => 
      event.data.object.id === 'sub_1RScLNRYtspYtD2zTK1IspKp'
    );

    if (subEvents.length === 0) {
      console.log('❌ このサブスクリプションのイベントが見つかりません');
    } else {
      subEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.id} - ${new Date(event.created * 1000).toLocaleString()}`);
        console.log(`   プラン変更: ${event.data.object.items.data[0]?.price.id}`);
      });
    }

    // 4. Webhookエンドポイントの配信履歴を確認（可能であれば）
    console.log('\n💡 推奨アクション:');
    console.log('1. Stripeダッシュボード → Developers → Webhooks でエンドポイントの詳細を確認');
    console.log('2. 失敗したイベントがあれば「Resend」で再送信');
    console.log('3. Vercelのファンクションログで実際の受信状況を確認');

  } catch (error) {
    console.error('❌ 確認エラー:', error.message);
  }
}

checkWebhookLogs().catch(console.error); 