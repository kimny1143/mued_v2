const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function debugWebhookError() {
  console.log('🔍 Webhook失敗の原因を調査中...\n');

  try {
    // 1. 環境変数を確認
    console.log('📋 環境変数の確認:');
    console.log(`STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? '設定済み' : '❌ 未設定'}`);
    console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '設定済み' : '❌ 未設定'}`);
    
    // 2. Webhookエンドポイントの詳細を確認
    console.log('\n🌐 Webhookエンドポイントの詳細:');
    const endpoints = await stripe.webhookEndpoints.list();
    
    if (endpoints.data.length > 0) {
      const endpoint = endpoints.data[0];
      console.log(`URL: ${endpoint.url}`);
      console.log(`ステータス: ${endpoint.status}`);
      console.log(`作成日: ${new Date(endpoint.created * 1000).toLocaleString()}`);
      console.log(`署名シークレット: ${endpoint.secret ? '設定済み' : '❌ 未設定'}`);
      
      // 有効なイベントタイプ
      console.log('\n📌 有効なイベントタイプ:');
      endpoint.enabled_events.forEach(event => {
        console.log(`  - ${event}`);
      });
    }

    // 3. 失敗の可能性がある原因
    console.log('\n❗ Webhook失敗の一般的な原因:');
    console.log('1. 署名検証の失敗 (STRIPE_WEBHOOK_SECRET が正しくない)');
    console.log('2. タイムアウト (処理に時間がかかりすぎ)');
    console.log('3. エラーレスポンス (500エラーなど)');
    console.log('4. 認証エラー (Supabaseへのアクセス権限)');
    
    console.log('\n💡 推奨される対処法:');
    console.log('1. Vercelの環境変数でSTRIPE_WEBHOOK_SECRETが正しく設定されているか確認');
    console.log('2. Vercelのログでapi/webhooks/stripeのエラーを確認');
    console.log('3. Stripeダッシュボードで失敗したイベントの詳細を確認');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

debugWebhookError().catch(console.error); 