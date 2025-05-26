# 認証ユーザー自動同期システム セットアップガイド

## 概要

このドキュメントでは、Supabase `auth.users` テーブルと `public.users` テーブルの自動同期システムのセットアップ手順を説明します。

## 問題の背景

DBリセット後、Googleログインを行ったユーザーが `auth.users` テーブルには作成されるものの、`public.users` テーブルに自動同期されない問題が発生していました。これにより、アプリケーション内でユーザー情報やロール情報が正しく取得できない状況でした。

## 解決策

SQL関数とトリガーを使用して、以下の自動同期機能を実装しました：

1. **新規ユーザー作成時の自動同期**
2. **ユーザー情報更新時の自動同期**
3. **既存ユーザーの一括同期**
4. **デフォルトロール（student）の自動設定**

## セットアップ手順

### 1. マイグレーションファイルの実行

更新された完全マイグレーションファイルを実行します：

```bash
# Supabase SQL Editorで実行
# または psql コマンドで実行
psql -h [SUPABASE_HOST] -U postgres -d postgres -f prisma/complete_init_migration.sql
```

### 2. 動作確認

セットアップ完了後、以下のテスト関数で動作確認を行います：

```sql
-- Supabase SQL Editorで実行
SELECT * FROM public.test_user_sync();
```

期待される結果：
```
test_name              | result | details
-----------------------|--------|------------------------------------------
roles_table_check      | PASS   | Student role exists: true
trigger_function_check | PASS   | handle_new_user function exists: true
trigger_check          | PASS   | on_auth_user_created trigger exists: true
user_sync_status       | INFO   | Auth users: X, Public users: X
```

### 3. 既存ユーザーの確認

既存の認証ユーザーが正しく同期されているか確認：

```sql
-- 認証ユーザー数の確認
SELECT COUNT(*) as auth_users FROM auth.users;

-- 公開ユーザー数の確認
SELECT COUNT(*) as public_users FROM public.users;

-- 同期状況の詳細確認
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as auth_name,
    pu.name as public_name,
    pu."roleId"
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;
```

## 実装された機能

### 1. 新規ユーザー作成トリガー

**トリガー名**: `on_auth_user_created`
**実行タイミング**: `auth.users` テーブルに新しいレコードが挿入された後

**処理内容**:
- Googleメタデータから名前、メール、アバター画像を抽出
- デフォルトロール（student）を設定
- `public.users` テーブルに自動挿入

### 2. ユーザー情報更新トリガー

**トリガー名**: `on_auth_user_updated`
**実行タイミング**: `auth.users` テーブルのレコードが更新された後

**処理内容**:
- 更新されたメタデータを `public.users` テーブルに反映
- 既存の情報を保持しつつ、新しい情報で更新

### 3. メタデータ抽出ロジック

以下の優先順位でユーザー名を抽出：
1. `raw_user_meta_data->>'full_name'`
2. `raw_user_meta_data->>'name'`
3. `raw_user_meta_data->>'display_name'`
4. メールアドレスの@より前の部分

## トラブルシューティング

### 問題1: トリガーが動作しない

**確認方法**:
```sql
-- トリガーの存在確認
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE 'on_auth_user%';

-- 関数の存在確認
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

**解決方法**:
```sql
-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### 問題2: 権限エラー

**エラー例**: `permission denied for table users`

**解決方法**:
```sql
-- 権限を再設定
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.roles TO anon, authenticated;
```

### 問題3: 既存ユーザーが同期されない

**確認方法**:
```sql
-- 同期されていないユーザーを確認
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

**解決方法**:
```sql
-- 手動で既存ユーザーを同期
DO $$
DECLARE
    auth_user RECORD;
BEGIN
    FOR auth_user IN 
        SELECT id, email, raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        INSERT INTO public.users (
            id, email, name, "roleId"
        ) VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(
                auth_user.raw_user_meta_data->>'full_name',
                auth_user.raw_user_meta_data->>'name',
                split_part(auth_user.email, '@', 1)
            ),
            'student'
        );
    END LOOP;
END $$;
```

## テスト手順

### 1. 新規ユーザー登録テスト

1. アプリケーションでGoogleログインを実行
2. 以下のSQLで同期確認：

```sql
-- 最新のユーザーを確認
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    pu.name,
    pu."roleId",
    pu.email as public_email
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 1;
```

### 2. ユーザー情報更新テスト

1. Supabase Authダッシュボードでユーザーのメタデータを更新
2. 以下のSQLで同期確認：

```sql
-- 特定ユーザーの同期状況確認
SELECT 
    au.raw_user_meta_data,
    pu.name,
    pu.image
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.id = '[USER_ID]';
```

## 運用上の注意点

### 1. パフォーマンス

- トリガーは同期実行されるため、大量のユーザー登録時は注意が必要
- 必要に応じて非同期処理への変更を検討

### 2. データ整合性

- `public.users` テーブルの手動編集時は注意が必要
- ロール変更は `public.users` テーブルで行い、`auth.users` のメタデータは参考程度に

### 3. セキュリティ

- トリガー関数は `SECURITY DEFINER` で実行されるため、権限管理に注意
- 不要な権限は付与しない

## 関連ファイル

- `prisma/complete_init_migration.sql` - 完全マイグレーションファイル
- `prisma/auth_user_sync_trigger.sql` - 認証同期システム単体ファイル
- `app/api/user/route.ts` - ユーザー情報取得API（手動同期機能付き）

## 今後の改善案

1. **非同期処理**: 大量ユーザー登録時のパフォーマンス向上
2. **ログ機能**: 同期処理の詳細ログ記録
3. **エラーハンドリング**: より詳細なエラー処理と復旧機能
4. **監視機能**: 同期失敗の検知とアラート機能 