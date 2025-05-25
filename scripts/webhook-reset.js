const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function resetWebhook() {
  console.log('🔄 Webhookエンドポイントの再設定を開始...\n');

  try {
    // 1. 既存のWebhookエンドポイントを確認
    console.log('📋 既存のWebhookエンドポイントを確認中...');
    const existingEndpoints = await stripe.webhookEndpoints.list();
    
    console.log(`\n既存のエンドポイント: ${existingEndpoints.data.length}件`);
    
    for (const endpoint of existingEndpoints.data) {
      console.log(`\n📍 エンドポイント: ${endpoint.url}`);
      console.log(`   ID: ${endpoint.id}`);
      console.log(`   ステータス: ${endpoint.status}`);
      console.log(`   作成日: ${new Date(endpoint.created * 1000).toLocaleString()}`);
      console.log(`   署名シークレット: ${endpoint.secret ? '設定済み' : '未設定'}`);
      
      // dev.mued.jpのエンドポイントを削除
      if (endpoint.url.includes('dev.mued.jp')) {
        console.log('\n🗑️  このエンドポイントを削除します...');
        
        // 削除前に確認
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        await new Promise((resolve) => {
          readline.question('本当に削除しますか？ (y/n): ', (answer) => {
            readline.close();
            if (answer.toLowerCase() === 'y') {
              stripe.webhookEndpoints.del(endpoint.id)
                .then(() => console.log('✅ 削除完了'))
                .catch(err => console.error('❌ 削除エラー:', err));
            }
            resolve();
          });
        });
      }
    }

    // 2. 新しいWebhookエンドポイントを作成
    console.log('\n🆕 新しいWebhookエンドポイントを作成しますか？');
    
    const readline2 = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      readline2.question('作成しますか？ (y/n): ', async (answer) => {
        readline2.close();
        if (answer.toLowerCase() === 'y') {
          console.log('\n📝 新しいエンドポイントを作成中...');
          
          const newEndpoint = await stripe.webhookEndpoints.create({
            url: 'https://dev.mued.jp/api/webhooks/stripe',
            enabled_events: [
              'checkout.session.completed',
              'customer.subscription.created',
              'customer.subscription.updated',
              'customer.subscription.deleted',
              'invoice.payment_succeeded',
              'invoice.payment_failed'
            ]
          });
          
          console.log('\n✅ 新しいWebhookエンドポイントが作成されました！');
          console.log(`\n🔑 重要: 以下の署名シークレットをVercelの環境変数に設定してください:`);
          console.log(`\n   STRIPE_WEBHOOK_SECRET=${newEndpoint.secret}`);
          console.log(`\n   エンドポイントID: ${newEndpoint.id}`);
          console.log(`   URL: ${newEndpoint.url}`);
          
          console.log('\n📌 次の手順:');
          console.log('1. Vercelダッシュボードで環境変数を更新');
          console.log('2. Vercelを再デプロイ');
          console.log('3. Stripeダッシュボードでテストイベントを送信');
        }
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

resetWebhook().catch(console.error); 