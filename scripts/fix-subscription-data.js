const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSubscriptionData() {
  console.log('🔧 サブスクリプションデータ修正開始...\n');

  try {
    // 1. Stripeから全サブスクリプションを取得
    console.log('📋 Stripeサブスクリプション取得中...');
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100
    });

    console.log(`アクティブなサブスクリプション: ${subscriptions.data.length}件\n`);

    for (const subscription of subscriptions.data) {
      console.log(`処理中: ${subscription.id}`);
      
      // 顧客情報を取得
      const customer = await stripe.customers.retrieve(subscription.customer);
      console.log(`  顧客: ${customer.email} (${customer.id})`);

      // ユーザーIDを探す（メールアドレスから）
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', customer.email)
        .maybeSingle();

      if (userError || !userData) {
        console.log(`  ⚠️ ユーザーが見つかりません: ${customer.email}`);
        continue;
      }

      const userId = userData.id;
      console.log(`  ユーザーID: ${userId}`);

      // 1. stripe_customersテーブルに保存
      const { error: customerError } = await supabase
        .from('stripe_customers')
        .upsert({
          userId: userId,
          customerId: customer.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, {
          onConflict: 'userId'
        });

      if (customerError) {
        console.error(`  ❌ 顧客情報保存エラー:`, customerError);
        continue;
      }

      console.log(`  ✅ 顧客情報保存完了`);

      // 2. stripe_user_subscriptionsテーブルに保存
      const { error: subError } = await supabase
        .from('stripe_user_subscriptions')
        .insert({
          userId: userId,
          customerId: customer.id,
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (subError) {
        console.error(`  ❌ サブスクリプション保存エラー:`, subError);
        continue;
      }

      console.log(`  ✅ サブスクリプション保存完了`);
      console.log(`  プラン: ${subscription.items.data[0]?.price.id}`);
      console.log('');
    }

    console.log('✅ 修正完了！');
    
    // 結果を確認
    console.log('\n📊 現在の状況:');
    const { data: customers } = await supabase
      .from('stripe_customers')
      .select('*');
    console.log(`stripe_customers: ${customers?.length || 0}件`);

    const { data: subs } = await supabase
      .from('stripe_user_subscriptions')
      .select('*');
    console.log(`stripe_user_subscriptions: ${subs?.length || 0}件`);

  } catch (error) {
    console.error('❌ 修正エラー:', error.message);
  }
}

fixSubscriptionData().catch(console.error); 