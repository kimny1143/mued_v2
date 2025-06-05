const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentUserCustomer() {
  console.log('🔍 現在のユーザーの顧客ID確認...\n');

  try {
    // 1. kimny1143@gmail.com のユーザーIDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'kimny1143@gmail.com')
      .single();

    if (!userData) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }

    console.log('👤 ユーザー情報:');
    console.log(`  ID: ${userData.id}`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Name: ${userData.name}`);

    // 2. 該当ユーザーの顧客レコードを確認
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('userId', userData.id);

    console.log('\n💳 顧客レコード:');
    customerData?.forEach(customer => {
      console.log(`  - 顧客ID: ${customer.customerId}`);
      console.log(`    作成日: ${customer.createdAt}`);
    });

    // 3. 各顧客IDのStripe情報を確認
    for (const customer of customerData || []) {
      console.log(`\n🔍 Stripe顧客 ${customer.customerId}:`);
      
      try {
        const stripeCustomer = await stripe.customers.retrieve(customer.customerId);
        console.log(`  メール: ${stripeCustomer.email}`);
        
        // サブスクリプション確認
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.customerId,
          status: 'active'
        });
        
        console.log(`  アクティブサブスクリプション: ${subscriptions.data.length}件`);
        subscriptions.data.forEach(sub => {
          console.log(`    - ${sub.id}: ${sub.items.data[0]?.price.id} (${sub.status})`);
        });
        
      } catch (stripeError) {
        console.log(`  ❌ Stripe顧客取得エラー: ${stripeError.message}`);
      }
    }

    // 4. サブスクリプションレコードを確認
    const { data: subscriptionData } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userData.id);

    console.log('\n📊 サブスクリプションレコード:');
    subscriptionData?.forEach(sub => {
      console.log(`  - ${sub.subscriptionId}: ${sub.priceId} (${sub.status})`);
    });

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  checkCurrentUserCustomer()
    .then(() => {
      console.log('\n✅ 確認完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 確認失敗:', error);
      process.exit(1);
    });
}

module.exports = { checkCurrentUserCustomer }; 