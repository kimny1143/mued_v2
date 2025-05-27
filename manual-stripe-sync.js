const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// 環境変数の確認
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY が設定されていません');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualStripeSync() {
  console.log('🔄 手動Stripe同期開始...\n');

  try {
    // 1. まずusersテーブルの確認
    console.log('👥 usersテーブルの確認...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(10);

    if (usersError) {
      console.error('❌ usersテーブルアクセスエラー:', usersError);
      return;
    }

    console.log(`✅ usersテーブル: ${users?.length || 0}件のユーザー`);
    users?.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    if (!users || users.length === 0) {
      console.log('⚠️ usersテーブルが空です。Google認証でログインしてください。');
      return;
    }

    // 2. Stripeから顧客データを取得
    console.log('\n💳 Stripeから顧客データを取得...');
    const customers = await stripe.customers.list({ limit: 10 });
    
    console.log(`✅ Stripe顧客: ${customers.data.length}件`);
    
    for (const customer of customers.data) {
      console.log(`\n👤 顧客処理: ${customer.id} (${customer.email})`);
      
      // メールアドレスでユーザーを検索
      const matchingUser = users.find(user => user.email === customer.email);
      
      if (!matchingUser) {
        console.log(`  ⚠️ 対応するユーザーが見つかりません: ${customer.email}`);
        continue;
      }

      console.log(`  ✅ ユーザーマッチ: ${matchingUser.id}`);

      // 3. stripe_customersテーブルに挿入/更新
      const { error: customerError } = await supabase
        .from('stripe_customers')
        .upsert({
          user_id: matchingUser.id,
          customer_id: customer.id,
          created_at: new Date(customer.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (customerError) {
        console.error(`  ❌ 顧客データ挿入エラー:`, customerError);
        continue;
      }

      console.log(`  ✅ 顧客データ同期完了`);

      // 4. サブスクリプションデータを取得・同期
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });

      console.log(`  📋 サブスクリプション: ${subscriptions.data.length}件`);

      for (const subscription of subscriptions.data) {
        console.log(`    💳 ${subscription.id} (${subscription.status})`);

        const subscriptionData = {
          user_id: matchingUser.id,
          customer_id: customer.id,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0]?.price.id || null,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          created_at: new Date(subscription.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: subError } = await supabase
          .from('stripe_user_subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'subscription_id'
          });

        if (subError) {
          console.error(`    ❌ サブスクリプション同期エラー:`, subError);
        } else {
          console.log(`    ✅ サブスクリプション同期完了`);
        }
      }
    }

    // 5. 同期結果の確認
    console.log('\n📊 同期結果確認...');
    
    const { data: customerCount } = await supabase
      .from('stripe_customers')
      .select('id', { count: 'exact' });
    
    const { data: subscriptionCount } = await supabase
      .from('stripe_user_subscriptions')
      .select('id', { count: 'exact' });

    console.log(`✅ 同期完了!`);
    console.log(`  - 顧客レコード: ${customerCount?.length || 0}件`);
    console.log(`  - サブスクリプションレコード: ${subscriptionCount?.length || 0}件`);

    // 6. アクティブなサブスクリプションの表示
    const { data: activeSubscriptions } = await supabase
      .from('stripe_user_subscriptions')
      .select(`
        *,
        users!inner(email, name)
      `)
      .eq('status', 'active');

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      console.log('\n🔥 アクティブなサブスクリプション:');
      activeSubscriptions.forEach(sub => {
        console.log(`  - ${sub.users.email}: ${sub.price_id} (${sub.status})`);
      });
    } else {
      console.log('\n⚠️ アクティブなサブスクリプションが見つかりません');
    }

  } catch (error) {
    console.error('❌ 同期エラー:', error);
  }
}

manualStripeSync(); 