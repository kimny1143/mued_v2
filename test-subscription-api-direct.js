const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSubscriptionApiDirect() {
  console.log('🔍 サブスクリプションAPI直接テスト開始...\n');
  
  const userId = 'a2c17a51-5e70-40e6-b830-5d5d8d3a204b';
  
  try {
    // 1. テーブル存在チェック（APIで失敗している箇所）
    console.log('1️⃣ テーブル存在チェック...');
    const { error: tableCheckError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('count()', { count: 'exact', head: true });
    
    if (tableCheckError) {
      console.error('❌ テーブル存在チェックエラー:', tableCheckError);
      console.error('   - コード:', tableCheckError.code);
      console.error('   - メッセージ:', tableCheckError.message);
      console.error('   - 詳細:', tableCheckError.details);
      console.error('   - ヒント:', tableCheckError.hint);
    } else {
      console.log('✅ テーブル存在チェック成功');
    }
    
    // 2. 管理者権限でのデータ取得テスト
    console.log('\n2️⃣ 管理者権限でのデータ取得テスト...');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (adminError) {
      console.error('❌ 管理者権限エラー:', adminError);
      console.error('   - コード:', adminError.code);
      console.error('   - メッセージ:', adminError.message);
      console.error('   - 詳細:', adminError.details);
      console.error('   - ヒント:', adminError.hint);
    } else {
      console.log('✅ 管理者権限でのデータ取得成功');
      console.log('   - データ:', adminData ? '存在' : 'null');
      if (adminData) {
        console.log('   - サブスクリプション詳細:', {
          id: adminData.id,
          status: adminData.status,
          price_id: adminData.price_id,
          user_id: adminData.user_id
        });
      }
    }
    
    // 3. 全データ取得テスト
    console.log('\n3️⃣ 全データ取得テスト...');
    const { data: allData, error: allError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*');
    
    if (allError) {
      console.error('❌ 全データ取得エラー:', allError);
    } else {
      console.log(`✅ 全データ取得成功: ${allData.length}件`);
      allData.forEach((sub, index) => {
        console.log(`   ${index + 1}. User: ${sub.user_id}, Status: ${sub.status}, Price: ${sub.price_id}`);
      });
    }
    
    // 4. 単純なselect文テスト
    console.log('\n4️⃣ 単純なselect文テスト...');
    const { data: simpleData, error: simpleError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('id, user_id, status')
      .limit(5);
    
    if (simpleError) {
      console.error('❌ 単純なselect文エラー:', simpleError);
    } else {
      console.log('✅ 単純なselect文成功:', simpleData.length, '件');
    }
    
    // 5. RLSポリシー確認
    console.log('\n5️⃣ RLSポリシー状況確認...');
    
    // RLSが有効か確認
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'stripe_user_subscriptions' 
            AND schemaname = 'public'
        `
      });
    
    if (rlsError) {
      console.log('RLS状況確認失敗:', rlsError.message);
    } else {
      console.log('RLS状況:', rlsStatus);
    }
    
    // 6. 認証コンテキスト確認
    console.log('\n6️⃣ 認証コンテキスト確認...');
    const { data: authContext, error: authError } = await supabaseAdmin
      .rpc('sql', {
        query: 'SELECT auth.uid(), auth.role()'
      });
    
    if (authError) {
      console.log('認証コンテキスト確認失敗:', authError.message);
    } else {
      console.log('認証コンテキスト:', authContext);
    }
    
  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
}

testSubscriptionApiDirect(); 