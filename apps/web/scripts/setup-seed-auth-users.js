#!/usr/bin/env node
/**
 * Supabase Authにシードデータ用のユーザーを作成するスクリプト
 * 開発・テスト環境でシードデータのユーザーでログインできるようにする
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

// テスト用ユーザーの定義
const testUsers = [
  {
    email: 'admin@test.com',
    password: 'test1234',
    user_metadata: {
      name: '管理者テスト',
      role: 'admin'
    }
  },
  {
    email: 'mentor1@test.com',
    password: 'test1234',
    user_metadata: {
      name: 'メンター1',
      role: 'mentor'
    }
  },
  {
    email: 'mentor2@test.com',
    password: 'test1234',
    user_metadata: {
      name: 'メンター2',
      role: 'mentor'
    }
  },
  {
    email: 'student1@test.com',
    password: 'test1234',
    user_metadata: {
      name: '生徒1',
      role: 'student'
    }
  },
  {
    email: 'student2@test.com',
    password: 'test1234',
    user_metadata: {
      name: '生徒2',
      role: 'student'
    }
  }
];

async function setupAuthUsers() {
  console.log('🔐 Supabase Auth ユーザーのセットアップ開始...\n');

  for (const userData of testUsers) {
    try {
      // まず既存のユーザーを確認
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === userData.email);

      if (existingUser) {
        console.log(`✓ ${userData.email} は既に存在します (ID: ${existingUser.id})`);
        
        // パスワードを更新
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password: userData.password,
            email_confirm: true
          }
        );
        
        if (updateError) {
          console.error(`  ❌ パスワード更新エラー:`, updateError);
        } else {
          console.log(`  ✓ パスワードを更新しました`);
        }
      } else {
        // 新規ユーザー作成
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: userData.user_metadata
        });

        if (createError) {
          console.error(`❌ ${userData.email} の作成エラー:`, createError);
        } else {
          console.log(`✅ ${userData.email} を作成しました (ID: ${newUser.user.id})`);
        }
      }
    } catch (error) {
      console.error(`❌ ${userData.email} の処理中にエラー:`, error);
    }
  }

  console.log('\n✅ セットアップ完了！');
  console.log('\n📝 テスト用ログイン情報:');
  console.log('----------------------------------------');
  testUsers.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Role: ${user.user_metadata.role}`);
    console.log('----------------------------------------');
  });
  
  console.log('\n⚠️  注意: これらのユーザーでログインするには、');
  console.log('開発環境でログインページの「メールアドレスでログイン（開発用）」を使用してください。');
  console.log('本番環境ではこのオプションは表示されません。');
}

// 実行
setupAuthUsers().catch(console.error);