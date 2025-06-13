#!/usr/bin/env node
/**
 * ユーザーのロールを修正するスクリプト
 * Google認証でログインしたユーザーのロールを正しく設定する
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

// メンターとして設定すべきユーザーのメールパターン
const mentorPatterns = [
  'mentor',
  'teacher',
  'instructor',
  'glasswerkskimny@gmail.com' // 明示的にメンター権限を持つユーザー
];

async function fixUserRoles() {
  console.log('🔧 ユーザーロールの修正開始...\n');

  try {
    // 1. ロールIDを取得
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('id, name');
    
    if (rolesError) {
      console.error('❌ ロール取得エラー:', rolesError);
      return;
    }

    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });
    
    console.log('✅ ロールID取得完了:', roleMap);

    // 2. 全ユーザーを取得
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role_id');
    
    if (usersError) {
      console.error('❌ ユーザー取得エラー:', usersError);
      return;
    }

    console.log(`\n📋 ${users.length}人のユーザーを確認中...\n`);

    // 3. 各ユーザーのロールを判定して更新
    for (const user of users) {
      const email = user.email?.toLowerCase() || '';
      let newRole = null;
      let reason = '';

      // メンター判定
      if (mentorPatterns.some(pattern => email.includes(pattern))) {
        newRole = roleMap.mentor;
        reason = 'メールアドレスパターンによる判定';
      }
      // 管理者判定
      else if (email.includes('admin') || email.includes('kimura')) {
        newRole = roleMap.admin;
        reason = '管理者メールパターンによる判定';
      }
      // それ以外は生徒
      else {
        newRole = roleMap.student;
        reason = 'デフォルト（生徒）';
      }

      // 現在のロールと異なる場合のみ更新
      if (user.role_id !== newRole) {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ role_id: newRole })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`❌ ${user.email} の更新エラー:`, updateError);
        } else {
          console.log(`✅ ${user.email}: ${user.role_id || 'null'} → ${newRole} (${reason})`);
        }
      } else {
        console.log(`⏭️  ${user.email}: 変更なし (${newRole})`);
      }
    }

    // 4. 特定のメールアドレスに対する手動設定
    const manualAssignments = [
      { email: 'glasswerkskimny@gmail.com', role: 'mentor' }
      // 必要に応じて他のユーザーを追加
    ];

    console.log('\n📌 手動ロール割り当て...');
    for (const assignment of manualAssignments) {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ role_id: roleMap[assignment.role] })
        .eq('email', assignment.email);
      
      if (error) {
        console.error(`❌ ${assignment.email} の手動割り当てエラー:`, error);
      } else {
        console.log(`✅ ${assignment.email} を ${assignment.role} に設定`);
      }
    }

    // 5. 結果サマリー
    console.log('\n📊 更新後のロール分布:');
    const { data: summary } = await supabaseAdmin
      .from('users')
      .select('role_id');
    
    const roleCounts = {};
    summary.forEach(u => {
      const roleId = u.role_id || 'null';
      roleCounts[roleId] = (roleCounts[roleId] || 0) + 1;
    });

    Object.entries(roleCounts).forEach(([roleId, count]) => {
      const roleName = Object.entries(roleMap).find(([name, id]) => id === roleId)?.[0] || roleId;
      console.log(`  ${roleName}: ${count}人`);
    });

  } catch (error) {
    console.error('❌ 処理中にエラー:', error);
  }
}

// 実行
fixUserRoles().catch(console.error);