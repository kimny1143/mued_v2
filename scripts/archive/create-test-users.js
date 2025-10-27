/**
 * Clerkのテストユーザー作成手順
 *
 * 重要: Clerk APIを使用してプログラム的にユーザーを作成するには
 * Backend APIキーが必要です。
 *
 * 手動での作成手順:
 * 1. https://dashboard.clerk.com にアクセス
 * 2. あなたのアプリケーション（popular-crayfish-98）を選択
 * 3. 左側メニューの「Users」をクリック
 * 4. 右上の「Create user」ボタンをクリック
 * 5. 以下のユーザーを作成:
 *
 * テストユーザー1:
 * - Username: test_student
 * - Email: test_student@example.com (optional)
 * - Password: TestPassword123!
 *
 * テストユーザー2:
 * - Username: test_mentor
 * - Email: test_mentor@example.com (optional)
 * - Password: TestPassword123!
 *
 * 注意事項:
 * - 「Sign-up with username」が有効になっていることを確認
 * - パスワード認証も有効にすることを推奨
 */

console.log(`
=================================================
Clerkテストユーザー作成ガイド
=================================================

1. Clerkダッシュボードにアクセス:
   https://dashboard.clerk.com

2. アプリケーション選択:
   popular-crayfish-98

3. ユーザー作成:
   Users → Create user

4. 必要なテストユーザー:

   ✅ test_student
      - Username: test_student
      - Password: TestPassword123!

   ✅ test_mentor
      - Username: test_mentor
      - Password: TestPassword123!

5. 設定確認:
   - Username認証が有効
   - Password認証が有効

=================================================
`);

// 将来的にClerk Backend APIを使用する場合のテンプレート
/*
const { Clerk } = require('@clerk/clerk-sdk-node');

async function createTestUsers() {
  const clerk = new Clerk({
    apiKey: process.env.CLERK_SECRET_KEY
  });

  try {
    // test_studentユーザーを作成
    const student = await clerk.users.createUser({
      username: 'test_student',
      password: 'TestPassword123!',
      emailAddress: ['test_student@example.com']
    });

    console.log('Created test_student:', student.id);

    // test_mentorユーザーを作成
    const mentor = await clerk.users.createUser({
      username: 'test_mentor',
      password: 'TestPassword123!',
      emailAddress: ['test_mentor@example.com']
    });

    console.log('Created test_mentor:', mentor.id);

  } catch (error) {
    console.error('Error creating users:', error);
  }
}

// createTestUsers();
*/