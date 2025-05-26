const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCustomerSubscription() {
  console.log('🔍 顧客サブスクリプション状況デバッグ開始...\n');

  try {
    // 1. Supabaseから顧客情報を取得
    const { data: customers } = await supabase
      .from('stripe_customers')
      .select('*');

    console.log('📋 Supabase顧客データ:');
    customers?.forEach(customer => {
      console.log(`  - ユーザーID: ${customer.userId}`);
      console.log(`  - 顧客ID: ${customer.customerId}`);
    });

    // 2. 各顧客のStripe情報を確認
    for (const customer of customers || []) {
      console.log(`\n🔍 顧客 ${customer.customerId} の詳細:`);
      
      // Stripeから顧客情報を取得
      const stripeCustomer = await stripe.customers.retrieve(customer.customerId);
      console.log(`  メール: ${stripeCustomer.email}`);
      
      // サブスクリプション情報を取得
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.customerId,
        status: 'all',
        limit: 10
      });
      
      console.log(`  サブスクリプション数: ${subscriptions.data.length}`);
      
      subscriptions.data.forEach((sub, index) => {
        console.log(`  サブスクリプション ${index + 1}:`);
        console.log(`    ID: ${sub.id}`);
        console.log(`    ステータス: ${sub.status}`);
        console.log(`    プラン: ${sub.items.data[0]?.price.id}`);
        console.log(`    作成日: ${new Date(sub.created * 1000).toISOString()}`);
        console.log(`    現在期間: ${new Date(sub.current_period_start * 1000).toISOString()} - ${new Date(sub.current_period_end * 1000).toISOString()}`);
      });

      // 3. Customer Portal設定を確認
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customer.customerId,
          return_url: 'https://example.com',
        });
        console.log(`  Portal Session作成: ✅ 成功`);
        console.log(`  Portal URL: ${portalSession.url}`);
      } catch (portalError) {
        console.log(`  Portal Session作成: ❌ 失敗`);
        console.log(`  エラー: ${portalError.message}`);
      }
    }

    // 4. Supabaseサブスクリプションデータとの比較
    console.log('\n📊 Supabaseサブスクリプションデータ:');
    const { data: supabaseSubs } = await supabase
      .from('stripe_user_subscriptions')
      .select('*');

    supabaseSubs?.forEach(sub => {
      console.log(`  - ユーザー: ${sub.userId}`);
      console.log(`    サブスクリプション: ${sub.subscriptionId}`);
      console.log(`    プラン: ${sub.priceId}`);
      console.log(`    ステータス: ${sub.status}`);
    });

  } catch (error) {
    console.error('❌ デバッグエラー:', error);
  }
}

// 実行
if (require.main === module) {
  debugCustomerSubscription()
    .then(() => {
      console.log('\n✅ デバッグ完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 デバッグ失敗:', error);
      process.exit(1);
    });
}

module.exports = { debugCustomerSubscription }; 