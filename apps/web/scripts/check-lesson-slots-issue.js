#!/usr/bin/env node
/**
 * レッスンスロットシステムの問題調査スクリプト
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('必要な環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkViewDefinition() {
  console.log('\n=== active_lesson_slotsビューの定義を確認 ===');
  
  try {
    // ビューの定義を取得
    const { data: viewDef, error } = await supabase
      .rpc('get_view_definition', { view_name: 'active_lesson_slots' });
    
    if (error) {
      console.error('ビュー定義取得エラー:', error);
      
      // 代替方法: information_schemaから直接取得
      const { data: viewInfo, error: infoError } = await supabase
        .from('information_schema.views')
        .select('*')
        .eq('table_name', 'active_lesson_slots')
        .single();
      
      if (infoError) {
        console.error('information_schema取得エラー:', infoError);
      } else {
        console.log('ビュー情報:', viewInfo);
      }
    } else {
      console.log('ビュー定義:', viewDef);
    }
  } catch (e) {
    console.error('ビュー定義確認エラー:', e);
  }
}

async function checkRLSPolicies() {
  console.log('\n=== lesson_slotsテーブルのRLSポリシーを確認 ===');
  
  try {
    // pg_policiesビューからRLSポリシーを取得
    const { data: policies, error } = await supabase
      .rpc('get_table_policies', { table_name: 'lesson_slots' });
    
    if (error) {
      console.error('RLSポリシー取得エラー:', error);
      
      // 代替SQLクエリ
      const query = `
        SELECT
          pol.polname as policy_name,
          pol.polcmd as command,
          pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
          pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression,
          rol.rolname as role_name
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
        LEFT JOIN pg_roles rol ON pol.polroles @> ARRAY[rol.oid]
        WHERE cls.relname = 'lesson_slots'
          AND nsp.nspname = 'public'
        ORDER BY pol.polname;
      `;
      
      const { data: rawPolicies, error: rawError } = await supabase.rpc('exec_sql', { sql: query });
      
      if (rawError) {
        console.error('SQL実行エラー:', rawError);
      } else {
        console.log('RLSポリシー:', JSON.stringify(rawPolicies, null, 2));
      }
    } else {
      console.log('RLSポリシー:', JSON.stringify(policies, null, 2));
    }
  } catch (e) {
    console.error('RLSポリシー確認エラー:', e);
  }
}

async function checkTableData() {
  console.log('\n=== テーブルとビューのデータ比較 ===');
  
  try {
    // lesson_slotsテーブルのデータ件数
    const { count: tableCount, error: tableError } = await supabase
      .from('lesson_slots')
      .select('*', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('lesson_slotsテーブルカウントエラー:', tableError);
    } else {
      console.log(`lesson_slotsテーブル: ${tableCount}件`);
    }
    
    // active_lesson_slotsビューのデータ件数
    const { count: viewCount, error: viewError } = await supabase
      .from('active_lesson_slots')
      .select('*', { count: 'exact', head: true });
    
    if (viewError) {
      console.error('active_lesson_slotsビューカウントエラー:', viewError);
    } else {
      console.log(`active_lesson_slotsビュー: ${viewCount}件`);
    }
    
    // 最新のデータサンプルを取得
    const { data: latestSlots, error: latestError } = await supabase
      .from('lesson_slots')
      .select('id, teacher_id, start_time, end_time, is_available, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (latestError) {
      console.error('最新スロット取得エラー:', latestError);
    } else {
      console.log('\n最新のlesson_slotsデータ:');
      latestSlots.forEach(slot => {
        console.log(`- ID: ${slot.id.substring(0, 8)}..., Teacher: ${slot.teacher_id.substring(0, 8)}..., Start: ${slot.start_time}, Available: ${slot.is_available}`);
      });
    }
    
    // 同じデータがビューにあるか確認
    if (latestSlots && latestSlots.length > 0) {
      const firstSlotId = latestSlots[0].id;
      const { data: viewSlot, error: viewSlotError } = await supabase
        .from('active_lesson_slots')
        .select('*')
        .eq('id', firstSlotId)
        .single();
      
      if (viewSlotError) {
        console.error(`\nビューで最新スロット(${firstSlotId})が見つかりません:`, viewSlotError);
      } else {
        console.log(`\n✓ 最新スロット(${firstSlotId})はビューに存在します`);
      }
    }
  } catch (e) {
    console.error('データ確認エラー:', e);
  }
}

async function checkFeatureFlags() {
  console.log('\n=== フィーチャーフラグの確認 ===');
  
  // 環境変数からフィーチャーフラグを確認
  const useDbViews = process.env.USE_DB_VIEWS || 'false';
  console.log(`USE_DB_VIEWS: ${useDbViews}`);
  
  // config/features.tsのデフォルト値も確認
  console.log('注: apps/web/lib/config/features.tsでのデフォルト値も確認してください');
}

async function testDirectQuery() {
  console.log('\n=== 直接SQLクエリテスト ===');
  
  try {
    // active_lesson_slotsビューの定義を推測（一般的なパターン）
    const viewQuery = `
      SELECT COUNT(*) as count FROM lesson_slots 
      WHERE end_time > NOW() 
      AND is_available = true;
    `;
    
    const { data: activeCount, error: activeError } = await supabase.rpc('exec_sql', { 
      sql: viewQuery 
    });
    
    if (activeError) {
      console.error('アクティブスロットカウントエラー:', activeError);
    } else {
      console.log('アクティブなスロット数（推定）:', activeCount);
    }
    
    // メンター別のスロット数を確認
    const mentorQuery = `
      SELECT 
        teacher_id,
        COUNT(*) as slot_count,
        MAX(created_at) as latest_created
      FROM lesson_slots
      GROUP BY teacher_id
      ORDER BY latest_created DESC
      LIMIT 5;
    `;
    
    const { data: mentorStats, error: mentorError } = await supabase.rpc('exec_sql', { 
      sql: mentorQuery 
    });
    
    if (mentorError) {
      console.error('メンター統計エラー:', mentorError);
    } else {
      console.log('\nメンター別スロット統計:');
      console.log(mentorStats);
    }
  } catch (e) {
    console.error('直接クエリエラー:', e);
  }
}

async function main() {
  console.log('レッスンスロットシステム問題調査開始...');
  
  await checkViewDefinition();
  await checkRLSPolicies();
  await checkTableData();
  await checkFeatureFlags();
  await testDirectQuery();
  
  console.log('\n調査完了');
}

main().catch(console.error);