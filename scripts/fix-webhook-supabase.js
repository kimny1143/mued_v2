const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSupabaseIssues() {
  console.log('🔧 Supabase権限とテーブル構造の修正...\n');

  try {
    // 1. stripe_customersテーブルを確認
    console.log('📋 stripe_customersテーブルを確認...');
    const { data: customers, error: customersError } = await supabase
      .from('stripe_customers')
      .select('*')
      .limit(5);
    
    if (customersError) {
      console.error('❌ stripe_customersエラー:', customersError);
    } else {
      console.log(`✅ stripe_customers: ${customers.length}件のレコード`);
    }

    // 2. stripe_user_subscriptionsテーブルを確認
    console.log('\n📋 stripe_user_subscriptionsテーブルを確認...');
    const { data: subscriptions, error: subsError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(5);
    
    if (subsError) {
      console.error('❌ stripe_user_subscriptionsエラー:', subsError);
    } else {
      console.log(`✅ stripe_user_subscriptions: ${subscriptions.length}件のレコード`);
    }

    // 3. Webhook処理で必要なデータの確認
    console.log('\n🔍 Webhook処理に必要なデータ構造を確認...');
    
    // ユーザーとカスタマーの関連を確認
    const { data: userCustomerLinks, error: linkError } = await supabase
      .from('stripe_customers')
      .select('userId, customerId')
      .not('userId', 'is', null);
    
    if (linkError) {
      console.error('❌ ユーザー・カスタマー関連エラー:', linkError);
    } else {
      console.log(`✅ ユーザー・カスタマー関連: ${userCustomerLinks.length}件`);
      userCustomerLinks.forEach(link => {
        console.log(`  - ユーザー: ${link.userId} → カスタマー: ${link.customerId}`);
      });
    }

    // 4. 推奨される対処法
    console.log('\n💡 推奨される対処法:');
    console.log('1. Supabaseダッシュボードで以下を確認:');
    console.log('   - stripe_customersテーブルのRLS設定');
    console.log('   - stripe_user_subscriptionsテーブルのRLS設定');
    console.log('   - サービスロールキーが正しく設定されているか');
    console.log('\n2. 必要に応じて以下のSQLを実行:');
    console.log('   -- RLSを一時的に無効化（開発環境のみ）');
    console.log('   ALTER TABLE stripe_customers DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE stripe_user_subscriptions DISABLE ROW LEVEL SECURITY;');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

fixSupabaseIssues().catch(console.error); 