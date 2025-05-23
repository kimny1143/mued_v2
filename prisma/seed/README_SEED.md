# MUED LMS データベースリセット＆シード手順

## 手順概要

1. Supabaseでデータベースをリセット
2. `simple_seed.sql`を実行してRLSとロールを設定
3. `seed2.sql`を実行してauth.usersとpublic.usersの同期を設定
4. 任意の3つのGoogleアカウントに対して手動でロールを割り当て

## 詳細手順

### 1. データベースリセット

1. Supabaseダッシュボードにログイン
2. 「Database」タブを選択
3. 左メニューから「Database」→「Reset Database」を選択
4. 確認ダイアログに「reset」と入力して実行

### 2. 基本データシード（RLSとロール設定）

1. Supabaseダッシュボードの「SQL Editor」を開く
2. `simple_seed.sql`の内容をコピーしてエディタに貼り付け
3. 「Run」ボタンをクリックして実行
4. 結果を確認し、3つの基本ロール (Administrator, Mentor, Student) が作成されているか確認

### 3. ユーザー同期トリガー設定

1. 再度「SQL Editor」を開く（または同じエディタを使用）
2. `seed2.sql`の内容をコピーしてエディタに貼り付け
3. 「Run」ボタンをクリックして実行
4. これにより、既存のauth.usersが自動的にpublic.usersに同期され、今後認証されるユーザーも自動的に同期されるようになります
5. 実行結果に同期されたユーザー数が表示されることを確認

### 4. 手動でロール割り当て

特定のユーザーに管理者やメンターの権限を割り当てるには、以下のSQLを実行します：

```sql
-- 管理者権限を割り当て
UPDATE public.users
SET "roleId" = (SELECT id FROM public.roles WHERE name = 'Administrator')
WHERE email = '管理者メールアドレス@example.com';

-- メンター権限を割り当て
UPDATE public.users
SET "roleId" = (SELECT id FROM public.roles WHERE name = 'Mentor')
WHERE email = 'メンターメールアドレス@example.com';
```

## シードファイルの内容説明

### simple_seed.sql

- **目的**: RLS設定と基本ロールの作成
- **内容**:
  - すべてのテーブルにRLSを有効化（読み書き許可）
  - Administrator, Mentor, Student の3つのロールをUUID形式で作成
  - 各ロールの基本的な権限を設定

### seed2.sql

- **目的**: auth.usersとpublic.usersの自動同期
- **内容**:
  - 新規ユーザー作成時のトリガー関数
  - ユーザー情報更新時のトリガー関数
  - 既存のauth.usersデータをpublic.usersに同期（デフォルトで生徒ロール）

## 確認方法

1. `https://dev.mued.jp/dashboard` にアクセス
2. ログインしてダッシュボードが正常に表示されることを確認
3. ユーザーのロールが正しく適用されていることを確認（管理者、メンター、生徒）

## 注意事項

- データベースリセットするとすべてのデータが消去されますが、認証されたユーザーアカウント自体（auth.users）は残ります
- すべてのユーザーはデフォルトで生徒ロールとなります
- 管理者やメンターロールは手動で割り当てる必要があります 