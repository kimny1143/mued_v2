const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function updateWebhookURLForPreview() {
  console.log('🔄 Stripe Webhook URLをプレビュー環境用に更新...\n');
  
  // プレビュー環境のURL
  const PREVIEW_URL = 'https://mued-lms-lbrrutukq-glasswerks.vercel.app';
  const PROTECTION_BYPASS_SECRET = 'a6923b2e8badf9f16a2c029ba6422a61';
  
  const newWebhookURL = `${PREVIEW_URL}/api/webhooks/stripe?x-vercel-protection-bypass=${PROTECTION_BYPASS_SECRET}`;
  
  console.log('📝 プレビュー環境用Webhook URL:');
  console.log(`   ${newWebhookURL}\n`);
  
  try {
    // 既存のWebhookエンドポイントを確認
    const endpoints = await stripe.webhookEndpoints.list();
    const devEndpoint = endpoints.data.find(ep => ep.url.includes('dev.mued.jp') || ep.url.includes('vercel.app'));
    
    if (devEndpoint) {
      console.log('📋 現在のWebhookエンドポイント:');
      console.log(`   ID: ${devEndpoint.id}`);
      console.log(`   URL: ${devEndpoint.url}`);
      
      console.log('\n🔧 以下の手順でテスト:');
      console.log('1. Vercelダッシュボードでプレビューデプロイメントの Protection Bypass を設定');
      console.log('2. Stripeダッシュボードで上記URLに一時的に変更');
      console.log('3. テスト完了後、本番用URLに戻す');
      console.log('\n⚠️  注意: プレビュー環境でのテスト後は必ず本番URLに戻してください！');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

updateWebhookURLForPreview().catch(console.error); 