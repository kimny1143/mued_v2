const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSubscriptionManually() {
  console.log('🔄 サブスクリプション情報を手動更新...\n');

  try {
    // 1. 現在のSupabaseデータを確認
    console.log('📋 現在のSupabaseデータ:');
    const { data: currentSubs } = await supabase
      .from('stripe_user_subscriptions')
      .select('*');
    
    if (currentSubs && currentSubs.length > 0) {
      currentSubs.forEach(sub => {
        console.log(`- ユーザー: ${sub.userId}`);
        console.log(`  サブスクリプション: ${sub.subscriptionId}`);
        console.log(`  プラン: ${sub.priceId}`);
        console.log(`  ステータス: ${sub.status}`);
      });
    }

    // 2. Stripeから最新情報を取得
    console.log('\n📊 Stripeから最新情報を取得中...');
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 10
    });

    console.log(`\nアクティブなサブスクリプション: ${subscriptions.data.length}件`);

    for (const subscription of subscriptions.data) {
      const customer = await stripe.customers.retrieve(subscription.customer);
      console.log(`\n処理中: ${subscription.id}`);
      console.log(`  顧客: ${customer.email}`);
      console.log(`  現在のプラン: ${subscription.items.data[0]?.price.id}`);
      console.log(`  ステータス: ${subscription.status}`);

      // ユーザーIDを探す
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', customer.email)
        .maybeSingle();

      if (!userData) {
        console.log('  ⚠️ ユーザーが見つかりません');
        continue;
      }

      // サブスクリプション情報を更新
      const { error } = await supabase
        .from('stripe_user_subscriptions')
        .upsert({
          userId: userData.id,
          customerId: customer.id,
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date().toISOString(),
        }, {
          onConflict: 'subscriptionId'
        });

      if (error) {
        console.error('  ❌ 更新エラー:', error);
      } else {
        console.log('  ✅ 更新完了!');
        
        // プラン名を表示
        const planMap = {
          'price_1RSY1mRYtspYtD2zKG7WnUsa': 'Starter (500円)',
          'price_1RSY2ORYtspYtD2zMsvNdlBQ': 'PRO (2,480円)',
          'price_1RSY5xRYtspYtD2zC3YM2Ny9': 'Premium (4,980円)'
        };
        console.log(`  プラン: ${planMap[subscription.items.data[0]?.price.id] || '不明'}`);
      }
    }

    console.log('\n✅ 手動更新完了！ダッシュボードをリロードして確認してください。');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

updateSubscriptionManually().catch(console.error); 