const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Supabase認証テスト開始...\n');

// 環境変数の確認
console.log('環境変数確認:');
console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定');
console.log('- SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定');
console.log('- SERVICE_ROLE_KEY長さ:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 必要な環境変数が設定されていません');
  process.exit(1);
}

// Supabaseクライアント作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testSupabaseAuth() {
  try {
    console.log('\n🔍 基本的な接続テスト...');
    
    // 1. auth.usersテーブルへのアクセステスト
    console.log('\n1️⃣ auth.usersテーブルアクセステスト:');
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ auth.users取得エラー:', authError);
      } else {
        console.log(`✅ auth.users取得成功: ${authUsers.users?.length || 0}件`);
        authUsers.users?.slice(0, 3).forEach(user => {
          console.log(`  - ${user.email} (${user.id})`);
        });
      }
    } catch (authErr) {
      console.error('❌ auth.users例外:', authErr);
    }

    // 2. public.rolesテーブルへのアクセステスト（最もシンプルなテーブル）
    console.log('\n2️⃣ public.rolesテーブルアクセステスト:');
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .limit(5);
      
      if (rolesError) {
        console.error('❌ roles取得エラー:', rolesError);
      } else {
        console.log(`✅ roles取得成功: ${roles?.length || 0}件`);
        roles?.forEach(role => {
          console.log(`  - ${role.name} (${role.id})`);
        });
      }
    } catch (rolesErr) {
      console.error('❌ roles例外:', rolesErr);
    }

    // 3. テーブル一覧の取得
    console.log('\n3️⃣ テーブル一覧取得テスト:');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(10);
      
      if (tablesError) {
        console.error('❌ テーブル一覧取得エラー:', tablesError);
      } else {
        console.log(`✅ テーブル一覧取得成功: ${tables?.length || 0}件`);
        tables?.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      }
    } catch (tablesErr) {
      console.error('❌ テーブル一覧例外:', tablesErr);
    }

    // 4. 現在の認証状態の確認
    console.log('\n4️⃣ 認証状態確認:');
    try {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      
      if (sessionError) {
        console.log('ℹ️ セッションエラー（サービスロールでは正常）:', sessionError.message);
      } else {
        console.log('現在のユーザー:', user ? user.email : 'なし');
      }
    } catch (sessionErr) {
      console.log('ℹ️ セッション例外（サービスロールでは正常）:', sessionErr.message);
    }

    // 5. RLSステータスの確認
    console.log('\n5️⃣ RLSステータス確認:');
    try {
      const { data: rlsStatus, error: rlsError } = await supabase
        .rpc('pg_get_rls_enabled', { table_name: 'users' });
      
      if (rlsError) {
        console.error('❌ RLS確認エラー:', rlsError);
      } else {
        console.log('usersテーブルのRLS状態:', rlsStatus);
      }
    } catch (rlsErr) {
      console.log('ℹ️ RLS確認スキップ（関数が存在しない可能性）');
    }

  } catch (error) {
    console.error('❌ テスト全体エラー:', error);
  }
}

testSupabaseAuth(); 