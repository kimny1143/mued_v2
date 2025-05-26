const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Supabaseクライアントを初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncStripeToSupabase() {
  console.log('🔄 Stripe → Supabase データ同期開始...\n');

  try {
    // 1. Stripeから全ての顧客を取得
    console.log('📋 Stripeから顧客データを取得中...');
    const customers = await stripe.customers.list({
      limit: 100,
      expand: ['data.subscriptions']
    });

    console.log(`✅ ${customers.data.length}件の顧客データを取得\n`);

    // 2. 各顧客とサブスクリプションを処理
    for (const customer of customers.data) {
      console.log(`👤 顧客処理中: ${customer.id} (${customer.email})`);

      // ユーザーIDをメールアドレスから検索
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', customer.email)
        .maybeSingle();

      if (userError) {
        console.error(`  ❌ ユーザー検索エラー: ${userError.message}`);
        continue;
      }

      if (!userData) {
        console.log(`  ⚠️ ユーザーが見つかりません: ${customer.email}`);
        continue;
      }

      const userId = userData.id;
      console.log(`  ✅ ユーザーID: ${userId}`);

      // 3. 顧客情報をSupabaseに同期
      const { error: customerError } = await supabase
        .from('stripe_customers')
        .upsert({
          userId: userId,
          customerId: customer.id,
          createdAt: new Date(customer.created * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        }, {
          onConflict: 'userId'
        });

      if (customerError) {
        console.error(`  ❌ 顧客データ同期エラー: ${customerError.message}`);
        continue;
      }

      console.log(`  ✅ 顧客データ同期完了`);

      // 4. サブスクリプション情報を同期
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10
      });

      for (const subscription of subscriptions.data) {
        console.log(`    💳 サブスクリプション: ${subscription.id} (${subscription.status})`);

        const subscriptionData = {
          userId: userId,
          customerId: customer.id,
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id || null,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          createdAt: new Date(subscription.created * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { error: subError } = await supabase
          .from('stripe_user_subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'subscriptionId'
          });

        if (subError) {
          console.error(`    ❌ サブスクリプション同期エラー: ${subError.message}`);
        } else {
          console.log(`    ✅ サブスクリプション同期完了`);
        }
      }

      console.log(''); // 空行
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

    // 6. アクティブなサブスクリプションの詳細表示
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
        console.log(`  - ${sub.users.email}: ${sub.priceId} (${sub.status})`);
      });
    }

  } catch (error) {
    console.error('❌ 同期処理エラー:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  syncStripeToSupabase()
    .then(() => {
      console.log('\n🎉 同期処理が正常に完了しました!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 同期処理が失敗しました:', error);
      process.exit(1);
    });
}

module.exports = { syncStripeToSupabase }; 