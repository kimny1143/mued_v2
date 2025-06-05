const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentDbState() {
  console.log('🔍 現在のDB状態確認開始...\n');
  
  try {
    // 1. usersテーブルの構造確認
    console.log('1️⃣ usersテーブルの実際のデータ確認...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(3);
    
    if (usersError) {
      console.error('usersテーブルエラー:', usersError);
    } else {
      console.log('usersテーブルのデータ例:');
      usersData.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Role関連:`);
        console.log(`       - role_id: ${user.role_id || 'なし'}`);
        console.log(`       - roleId: ${user.roleId || 'なし'}`);
        console.log(`     全フィールド:`, Object.keys(user));
        console.log('     ---');
      });
    }
    
    // 2. rolesテーブル確認
    console.log('\n2️⃣ rolesテーブル確認...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*');
    
    if (rolesError) {
      console.error('rolesテーブルエラー:', rolesError);
    } else {
      console.log('rolesテーブル:');
      rolesData.forEach(role => {
        console.log(`  - ${role.id}: ${role.name} (${role.description})`);
      });
    }
    
    // 3. users-roles JOIN試行（現在のエラーの原因確認）
    console.log('\n3️⃣ users-roles JOIN試行...');
    
    // 方法1: role_idでJOIN（スネークケース）
    console.log('方法1: role_idでJOIN...');
    const { data: joinData1, error: joinError1 } = await supabase
      .from('users')
      .select('id, email, role_id, roles!users_role_id_fkey(name)')
      .limit(2);
    
    if (joinError1) {
      console.log('JOINエラー1:', joinError1.message);
    } else {
      console.log('JOIN成功1:', joinData1);
    }
    
    // 方法2: roleIdでJOIN（キャメルケース）
    console.log('方法2: roleIdでJOIN...');
    const { data: joinData2, error: joinError2 } = await supabase
      .from('users')
      .select('id, email, roleId, roles!users_roleId_fkey(name)')
      .limit(2);
    
    if (joinError2) {
      console.log('JOINエラー2:', joinError2.message);
    } else {
      console.log('JOIN成功2:', joinData2);
    }
    
    // 4. stripe_user_subscriptionsテーブル確認
    console.log('\n4️⃣ stripe_user_subscriptionsテーブル確認...');
    const { data: subsData, error: subsError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(2);
    
    if (subsError) {
      console.error('サブスクリプションテーブルエラー:', subsError);
    } else {
      console.log('サブスクリプションデータ例:');
      subsData.forEach((sub, index) => {
        console.log(`  ${index + 1}. ID: ${sub.id}`);
        console.log(`     User関連:`);
        console.log(`       - user_id: ${sub.user_id || 'なし'}`);
        console.log(`       - userId: ${sub.userId || 'なし'}`);
        console.log(`     Status: ${sub.status}`);
        console.log(`     Price ID: ${sub.price_id || sub.priceId || 'なし'}`);
        console.log(`     全フィールド:`, Object.keys(sub));
        console.log('     ---');
      });
    }
    
    // 5. PostgreSQLの実際のカラム名確認（情報スキーマから）
    console.log('\n5️⃣ PostgreSQL情報スキーマから実際のカラム名確認...');
    
    // SQLを直接実行
    const { data: columnsData, error: columnsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name IN ('users', 'stripe_user_subscriptions')
          ORDER BY table_name, ordinal_position
        `
      });
    
    if (columnsError) {
      console.log('情報スキーマ確認エラー:', columnsError.message);
      
      // 代替方法: describe文の実行
      console.log('代替確認: usersテーブルのカラム詳細...');
      const { data: describeData, error: describeError } = await supabase
        .from('users')
        .select('*')
        .limit(0); // データは取得せずスキーマのみ
      
      console.log('describe結果:', describeError || 'エラーなし');
    } else {
      console.log('実際のテーブル構造:');
      let currentTable = '';
      columnsData.forEach(col => {
        if (col.table_name !== currentTable) {
          currentTable = col.table_name;
          console.log(`\n📋 ${col.table_name}テーブル:`);
        }
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('チェックエラー:', error);
  }
}

checkCurrentDbState(); 