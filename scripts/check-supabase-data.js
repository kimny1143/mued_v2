const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSupabaseData() {
  console.log('🔍 Supabaseデータ確認...\n');

  try {
    // 1. stripe_user_subscriptionsテーブルを確認
    console.log('📋 stripe_user_subscriptionsテーブル:');
    const { data: subscriptions, error: subError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (subError) {
      console.error('❌ サブスクリプション取得エラー:', subError);
    } else {
      console.log(`✅ ${subscriptions.length}件のサブスクリプション`);
      subscriptions.forEach((sub, index) => {
        console.log(`${index + 1}. サブスクリプション: ${sub.subscriptionId}`);
        console.log(`   ユーザー: ${sub.userId}`);
        console.log(`   プラン: ${sub.priceId}`);
        console.log(`   ステータス: ${sub.status}`);
        console.log(`   更新日時: ${sub.updatedAt}`);
        console.log('');
      });
    }

    // 2. stripe_customersテーブルを確認
    console.log('📋 stripe_customersテーブル:');
    const { data: customers, error: custError } = await supabase
      .from('stripe_customers')
      .select('*');

    if (custError) {
      console.error('❌ 顧客取得エラー:', custError);
    } else {
      console.log(`✅ ${customers.length}件の顧客`);
      customers.forEach((cust, index) => {
        console.log(`${index + 1}. 顧客: ${cust.customerId}`);
        console.log(`   ユーザー: ${cust.userId}`);
        console.log('');
      });
    }

    // 3. stripe_subscriptions_viewを確認
    console.log('📋 stripe_subscriptions_view:');
    const { data: viewData, error: viewError } = await supabase
      .from('stripe_subscriptions_view')
      .select('*')
      .order('updated_at', { ascending: false });

    if (viewError) {
      console.error('❌ ビュー取得エラー:', viewError);
    } else {
      console.log(`✅ ${viewData.length}件のビューデータ`);
      viewData.forEach((view, index) => {
        console.log(`${index + 1}. サブスクリプション: ${view.subscription_id}`);
        console.log(`   ユーザー: ${view.user_id}`);
        console.log(`   プラン: ${view.price_id}`);
        console.log(`   ステータス: ${view.subscription_status}`);
        console.log(`   更新日時: ${view.updated_at}`);
        console.log('');
      });
    }

    // 4. 最新の更新時刻を確認
    if (subscriptions && subscriptions.length > 0) {
      const latestUpdate = subscriptions[0].updatedAt;
      const updateTime = new Date(latestUpdate);
      const now = new Date();
      const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));
      
      console.log(`⏰ 最新更新: ${updateTime.toLocaleString()} (${diffMinutes}分前)`);
      
      if (diffMinutes < 5) {
        console.log('✅ 最近更新されています - Webhookが動作している可能性があります');
      } else {
        console.log('⚠️  更新が古い - Webhookが動作していない可能性があります');
      }
    }

  } catch (error) {
    console.error('❌ 確認エラー:', error.message);
  }
}

checkSupabaseData().catch(console.error); 