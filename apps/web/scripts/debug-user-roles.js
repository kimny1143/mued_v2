#!/usr/bin/env node
/**
 * ユーザーとロールの関係をデバッグするスクリプト
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function debugUserRoles() {
  console.log('🔍 ユーザーとロールのデバッグ開始...\n');

  try {
    // 1. ロールテーブルの内容を確認
    console.log('1️⃣ roles テーブルの内容:');
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('*');
    
    if (rolesError) {
      console.error('❌ rolesテーブルのエラー:', rolesError);
    } else {
      console.table(roles);
    }

    // 2. ユーザーとロールの関係を確認
    console.log('\n2️⃣ users テーブルの内容（ロール付き）:');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        role_id,
        roles (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (usersError) {
      console.error('❌ usersテーブルのエラー:', usersError);
    } else {
      console.log('最新10件のユーザー:');
      users.forEach(user => {
        console.log(`
Email: ${user.email}
Name: ${user.name || '(未設定)'}
Role ID: ${user.role_id || '(未設定)'}
Role Name: ${user.roles?.name || '(ロールなし)'}
---`);
      });
    }

    // 3. 特定のメンターユーザーを確認
    console.log('\n3️⃣ メンターロールのユーザー:');
    const { data: mentorRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'mentor')
      .single();
    
    if (mentorRole) {
      const { data: mentors, error: mentorsError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role_id')
        .eq('role_id', mentorRole.id);
      
      if (mentorsError) {
        console.error('❌ メンター検索エラー:', mentorsError);
      } else {
        console.log(`メンターユーザー数: ${mentors.length}`);
        mentors.forEach(mentor => {
          console.log(`- ${mentor.email} (${mentor.name || '名前なし'})`);
        });
      }
    }

    // 4. role_idがNULLのユーザーを確認
    console.log('\n4️⃣ role_idが未設定のユーザー:');
    const { data: noRoleUsers, error: noRoleError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .is('role_id', null)
      .limit(5);
    
    if (noRoleError) {
      console.error('❌ role_id NULL検索エラー:', noRoleError);
    } else {
      console.log(`role_idがNULLのユーザー数: ${noRoleUsers?.length || 0}`);
      noRoleUsers?.forEach(user => {
        console.log(`- ${user.email}`);
      });
    }

    // 5. 現在ログイン中のユーザーを確認（emailで特定）
    const currentUserEmail = process.argv[2];
    if (currentUserEmail) {
      console.log(`\n5️⃣ 特定ユーザーの詳細確認: ${currentUserEmail}`);
      const { data: currentUser, error: currentUserError } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          roles (*)
        `)
        .eq('email', currentUserEmail)
        .single();
      
      if (currentUserError) {
        console.error('❌ ユーザー検索エラー:', currentUserError);
      } else {
        console.log('ユーザー詳細:');
        console.log(JSON.stringify(currentUser, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ デバッグ中にエラー:', error);
  }
}

// 使用方法を表示
if (process.argv.length > 2 && process.argv[2] === '--help') {
  console.log(`
使用方法:
  node scripts/debug-user-roles.js                     # 全体的な確認
  node scripts/debug-user-roles.js user@example.com    # 特定ユーザーの詳細確認
`);
  process.exit(0);
}

// 実行
debugUserRoles().catch(console.error);