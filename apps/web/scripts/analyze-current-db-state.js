const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 現在のSupabaseデータベース状態を分析
 * リセット後に必要なSQL操作を特定するため
 */
async function analyzeCurrentDbState() {
  console.log('🔍 現在のデータベース状態分析開始...\n');

  try {
    // 1. テーブル一覧の取得
    console.log('📋 テーブル一覧:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list');

    if (tablesError) {
      // 代替方法でテーブル一覧を取得
      const { data: altTables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');
      
      if (altTables) {
        altTables.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      }
    } else {
      tables?.forEach(table => {
        console.log(`  - ${table}`);
      });
    }

    // 2. RLSポリシーの確認
    console.log('\n🔒 RLSポリシー:');
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check')
      .eq('schemaname', 'public');

    if (policies && policies.length > 0) {
      policies.forEach(policy => {
        console.log(`  - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('  ポリシーが見つかりません');
    }

    // 3. トリガーの確認
    console.log('\n⚡ トリガー:');
    const { data: triggers } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_timing, event_manipulation')
      .eq('trigger_schema', 'public');

    if (triggers && triggers.length > 0) {
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    } else {
      console.log('  トリガーが見つかりません');
    }

    // 4. 関数の確認
    console.log('\n🔧 カスタム関数:');
    const { data: functions } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .neq('routine_name', 'like', 'pg_%');

    if (functions && functions.length > 0) {
      functions.forEach(func => {
        console.log(`  - ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('  カスタム関数が見つかりません');
    }

    // 5. インデックスの確認
    console.log('\n📊 インデックス:');
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename, indexdef')
      .eq('schemaname', 'public')
      .not('indexname', 'like', '%_pkey');

    if (indexes && indexes.length > 0) {
      indexes.forEach(index => {
        console.log(`  - ${index.indexname} on ${index.tablename}`);
      });
    } else {
      console.log('  カスタムインデックスが見つかりません');
    }

    // 6. 外部キー制約の確認
    console.log('\n🔗 外部キー制約:');
    const { data: foreignKeys } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name, constraint_type')
      .eq('constraint_schema', 'public')
      .eq('constraint_type', 'FOREIGN KEY');

    if (foreignKeys && foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`  - ${fk.constraint_name} on ${fk.table_name}`);
      });
    } else {
      console.log('  外部キー制約が見つかりません');
    }

    // 7. Stripe関連テーブルの詳細確認
    console.log('\n💳 Stripe関連テーブル詳細:');
    const stripeTableNames = ['stripe_customers', 'stripe_user_subscriptions'];
    
    for (const tableName of stripeTableNames) {
      console.log(`\n  📋 ${tableName}:`);
      
      // カラム情報
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (columns && columns.length > 0) {
        columns.forEach(col => {
          console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
      }

      // RLSポリシー
      const tablePolicies = policies?.filter(p => p.tablename === tableName) || [];
      if (tablePolicies.length > 0) {
        console.log(`    RLSポリシー:`);
        tablePolicies.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ 分析エラー:', error);
  }
}

// 実行
if (require.main === module) {
  analyzeCurrentDbState()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 分析失敗:', error);
      process.exit(1);
    });
}

module.exports = { analyzeCurrentDbState }; 