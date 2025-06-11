#!/usr/bin/env node
/**
 * lesson_slotsテーブルのRLSポリシーを確認するスクリプト
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLSPolicies() {
  console.log('🔍 lesson_slotsテーブルのRLSポリシーを確認\n');
  
  try {
    // RLSポリシーを確認
    const { data: policies, error } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'lesson_slots');
    
    if (error) {
      console.error('❌ ポリシー取得エラー:', error);
      return;
    }
    
    if (!policies || policies.length === 0) {
      console.log('⚠️  lesson_slotsテーブルにRLSポリシーが設定されていません');
      return;
    }
    
    console.log(`✅ ${policies.length}個のポリシーが見つかりました:\n`);
    
    policies.forEach((policy, index) => {
      console.log(`${index + 1}. ポリシー名: ${policy.policyname}`);
      console.log(`   コマンド: ${policy.cmd}`);
      console.log(`   ロール: ${policy.roles}`);
      console.log(`   定義: ${policy.qual || 'なし'}`);
      console.log(`   WITH CHECK: ${policy.with_check || 'なし'}`);
      console.log('---');
    });
    
    // RLSが有効かどうか確認
    const { data: tables, error: tableError } = await supabaseAdmin
      .from('pg_tables')
      .select('*')
      .eq('tablename', 'lesson_slots')
      .single();
    
    if (tables) {
      console.log('\n📊 テーブル情報:');
      console.log(`   スキーマ: ${tables.schemaname}`);
      console.log(`   オーナー: ${tables.tableowner}`);
    }
    
    // テスト: メンターロールでINSERTできるか確認
    console.log('\n🧪 テスト: メンターユーザーでのINSERT権限を確認...');
    
    const testEmail = 'glasswerkskimny@gmail.com';
    const { data: testUser } = await supabaseAdmin
      .from('users')
      .select('id, email, role_id, roles(name)')
      .eq('email', testEmail)
      .single();
    
    if (testUser) {
      console.log(`\n👤 テストユーザー情報:`);
      console.log(`   ID: ${testUser.id}`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Role: ${testUser.roles?.name}`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkRLSPolicies();