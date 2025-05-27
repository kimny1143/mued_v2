const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDatabaseSchema() {
  console.log('🔍 データベーススキーマとRLS調査開始...\n');
  
  try {
    // 1. stripe_user_subscriptionsテーブルの構造確認
    console.log('1️⃣ stripe_user_subscriptionsテーブル構造確認...');
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name_param: 'stripe_user_subscriptions' })
      .single();
    
    if (schemaError) {
      console.warn('テーブル構造確認エラー:', schemaError.message);
      
      // 代替方法: 実際のクエリを試してエラーメッセージから構造を推測
      console.log('代替方法: 実際のクエリでカラム確認...');
      
      const { data: testData, error: testError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.error('クエリエラー:', testError);
      } else {
        console.log('テーブルアクセス成功。データ例:', testData);
      }
    }
    
    // 2. RLSポリシー確認
    console.log('\n2️⃣ RLSポリシー確認...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, cmd, qual, with_check')
      .eq('schemaname', 'public')
      .eq('tablename', 'stripe_user_subscriptions');
    
    if (policyError) {
      console.error('ポリシー確認エラー:', policyError);
    } else {
      console.log('stripe_user_subscriptionsのRLSポリシー:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
        console.log(`    条件: ${policy.qual || '全て'}`);
        console.log(`    チェック: ${policy.with_check || 'なし'}`);
      });
    }
    
    // 3. 実際のカラム名確認（情報スキーマから）
    console.log('\n3️⃣ カラム名確認...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'stripe_user_subscriptions')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('カラム確認エラー:', columnsError);
    } else {
      console.log('stripe_user_subscriptionsのカラム:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // 4. ユーザーIDカラムの特定
    console.log('\n4️⃣ ユーザーIDカラムでのテストクエリ...');
    
    // user_idでテスト
    const { data: userIdTest, error: userIdError } = await supabase
      .from('stripe_user_subscriptions')
      .select('user_id')
      .limit(1);
    
    console.log('user_idカラムテスト:', userIdError ? `エラー: ${userIdError.message}` : '成功');
    
    // userIdでテスト
    const { data: userIdCamelTest, error: userIdCamelError } = await supabase
      .from('stripe_user_subscriptions')
      .select('userId')
      .limit(1);
    
    console.log('userIdカラムテスト:', userIdCamelError ? `エラー: ${userIdCamelError.message}` : '成功');
    
    // 5. RLSポリシーの問題確認
    console.log('\n5️⃣ RLS問題確認（特定ユーザーIDでテスト）...');
    
    const testUserId = 'a2c17a51-5e70-40e6-b830-5d5d8d3a204b';
    
    // 管理者権限でのクエリ
    const { data: adminData, error: adminError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('user_id', testUserId);
    
    console.log('管理者権限 (user_id):', adminError ? `エラー: ${adminError.message}` : `成功: ${adminData.length}件`);
    
    // 6. 全てのサブスクリプション確認
    console.log('\n6️⃣ 全サブスクリプション確認...');
    const { data: allSubs, error: allSubsError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*');
    
    if (allSubsError) {
      console.error('全サブスクリプション取得エラー:', allSubsError);
    } else {
      console.log(`全サブスクリプション: ${allSubs.length}件`);
      allSubs.forEach((sub, index) => {
        console.log(`  ${index + 1}. User: ${sub.user_id || sub.userId || 'N/A'}, Status: ${sub.status}, Price: ${sub.price_id || sub.priceId || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('デバッグエラー:', error);
  }
}

debugDatabaseSchema(); 