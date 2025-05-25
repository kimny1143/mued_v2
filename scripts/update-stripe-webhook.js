const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function updateWebhookURL() {
  console.log('🔄 StripeのWebhook URLを更新...\n');
  
  // 生成したシークレット（32文字、特殊文字なし）
  const PROTECTION_BYPASS_SECRET = 'a6923b2e8badf9f16a2c029ba6422a61';
  
  console.log('⚠️  重要: 以下の手順を実行してください：\n');
  
  console.log('1. 上記のPROTECTION_BYPASS_SECRETを実際に生成したシークレットに置き換える');
  console.log('2. VercelダッシュボードでProtection Bypass for Automationに同じシークレットを追加');
  console.log('3. Stripeダッシュボードで以下のURLに更新：\n');
  
  const newWebhookURL = `https://dev.mued.jp/api/webhooks/stripe?x-vercel-protection-bypass=${PROTECTION_BYPASS_SECRET}`;
  
  console.log(`   ${newWebhookURL}\n`);
  
  try {
    // 既存のWebhookエンドポイントを確認
    const endpoints = await stripe.webhookEndpoints.list();
    const devEndpoint = endpoints.data.find(ep => ep.url.includes('dev.mued.jp'));
    
    if (devEndpoint) {
      console.log('📋 現在のWebhookエンドポイント:');
      console.log(`   ID: ${devEndpoint.id}`);
      console.log(`   URL: ${devEndpoint.url}`);
      console.log('\n🔧 Stripeダッシュボードで手動更新するか、以下のコマンドを実行:');
      console.log(`\n   stripe webhook_endpoints update ${devEndpoint.id} --url="${newWebhookURL}"\n`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

updateWebhookURL().catch(console.error); 