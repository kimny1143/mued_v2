const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncUsingAuthUsers() {
  console.log('🔄 Auth.usersを使用したStripe同期開始...\n');

  try {
    // 1. auth.usersからユーザー一覧を取得
    console.log('👥 auth.usersからユーザー取得...');
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ auth.users取得エラー:', authError);
      return;
    }

    const authUsers = authUsersData.users || [];
    console.log(`✅ auth.users: ${authUsers.length}件のユーザー`);
    
    authUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    // 2. Stripeから顧客データを取得
    console.log('\n💳 Stripeから顧客データを取得...');
    const customers = await stripe.customers.list({ limit: 10 });
    
    console.log(`✅ Stripe顧客: ${customers.data.length}件`);

    // 3. Stripe WebhookからSupabaseに手動で挿入
    console.log('\n🔧 StripeデータをWebhook処理形式で同期...');

    for (const customer of customers.data) {
      console.log(`\n👤 顧客処理: ${customer.id} (${customer.email})`);
      
      // メールアドレスでauth.usersからマッチするユーザーを検索
      const matchingUser = authUsers.find(user => user.email === customer.email);
      
      if (!matchingUser) {
        console.log(`  ⚠️ 対応するユーザーが見つかりません: ${customer.email}`);
        continue;
      }

      console.log(`  ✅ ユーザーマッチ: ${matchingUser.id}`);

      // Supabase Admin APIを使用して直接SQLを実行
      console.log('  🔧 SQLを直接実行してstripe_customersに挿入...');
      
      const customerInsertSQL = `
        INSERT INTO public.stripe_customers (user_id, customer_id, created_at, updated_at)
        VALUES ('${matchingUser.id}', '${customer.id}', '${new Date(customer.created * 1000).toISOString()}', '${new Date().toISOString()}')
        ON CONFLICT (user_id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          updated_at = EXCLUDED.updated_at;
      `;

      try {
        const { data: customerResult, error: customerSqlError } = await supabase.rpc('execute_sql', { sql: customerInsertSQL });
        
        if (customerSqlError) {
          console.log('  ℹ️ rpc関数が利用できません。Webhook経由での同期が必要です。');
          console.log('  📋 手動実行用SQL:');
          console.log(`  ${customerInsertSQL}`);
        } else {
          console.log('  ✅ 顧客データ挿入完了');
        }
      } catch (sqlErr) {
        console.log('  ℹ️ SQL実行関数が利用できません。');
        console.log('  📋 手動実行用SQL:');
        console.log(`  ${customerInsertSQL}`);
      }

      // 4. サブスクリプションデータを取得
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });

      console.log(`  📋 サブスクリプション: ${subscriptions.data.length}件`);

      for (const subscription of subscriptions.data) {
        console.log(`    💳 ${subscription.id} (${subscription.status})`);

        const subscriptionInsertSQL = `
          INSERT INTO public.stripe_user_subscriptions (
            user_id, 
            customer_id, 
            subscription_id, 
            price_id, 
            status, 
            current_period_start, 
            current_period_end, 
            cancel_at_period_end,
            created_at, 
            updated_at
          ) VALUES (
            '${matchingUser.id}',
            '${customer.id}',
            '${subscription.id}',
            '${subscription.items.data[0]?.price.id || ''}',
            '${subscription.status}',
            ${subscription.current_period_start},
            ${subscription.current_period_end},
            ${subscription.cancel_at_period_end},
            '${new Date(subscription.created * 1000).toISOString()}',
            '${new Date().toISOString()}'
          ) ON CONFLICT (subscription_id) DO UPDATE SET
            status = EXCLUDED.status,
            price_id = EXCLUDED.price_id,
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            cancel_at_period_end = EXCLUDED.cancel_at_period_end,
            updated_at = EXCLUDED.updated_at;
        `;

        console.log('    📋 サブスクリプション手動実行用SQL:');
        console.log(`    ${subscriptionInsertSQL}`);
      }
    }

    console.log('\n🎯 同期完了！');
    console.log('📝 上記のSQLをSupabaseのSQL Editorで実行してください。');

  } catch (error) {
    console.error('❌ 同期エラー:', error);
  }
}

syncUsingAuthUsers(); 