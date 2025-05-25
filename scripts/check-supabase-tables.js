const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSupabaseTables() {
  console.log('🔍 Supabaseテーブル確認開始...\n');

  try {
    // 1. stripe_customers テーブルの確認
    console.log('📋 stripe_customers テーブル:');
    const { data: customers, error: customersError } = await supabase
      .from('stripe_customers')
      .select('*')
      .limit(5);

    if (customersError) {
      console.error('❌ stripe_customers エラー:', customersError);
    } else {
      console.log(`✅ レコード数: ${customers.length}`);
      customers.forEach(customer => {
        console.log(`  - userId: ${customer.userId}, customerId: ${customer.customerId}`);
      });
    }

    // 2. stripe_user_subscriptions テーブルの確認
    console.log('\n📋 stripe_user_subscriptions テーブル:');
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(5);

    if (subscriptionsError) {
      console.error('❌ stripe_user_subscriptions エラー:', subscriptionsError);
    } else {
      console.log(`✅ レコード数: ${subscriptions.length}`);
      subscriptions.forEach(sub => {
        console.log(`  - userId: ${sub.userId}, subscriptionId: ${sub.subscriptionId}, status: ${sub.status}`);
      });
    }

    // 3. users テーブルの確認
    console.log('\n📋 users テーブル:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(5);

    if (usersError) {
      console.error('❌ users エラー:', usersError);
    } else {
      console.log(`✅ レコード数: ${users.length}`);
      users.forEach(user => {
        console.log(`  - id: ${user.id}, email: ${user.email}, name: ${user.name}`);
      });
    }

  } catch (error) {
    console.error('❌ 全体エラー:', error);
  }
}

checkSupabaseTables().catch(console.error); 