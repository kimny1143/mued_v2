-- MUED LMS ユーザーロール設定確認クエリ
-- 対象ユーザー: glasswerkskimny@gmail.com
-- 実行日: 2025/06/11

-- 1. usersテーブルのrole_idカラムの値を確認
SELECT 
    id,
    email,
    role_id,
    created_at,
    updated_at
FROM users
WHERE email = 'glasswerkskimny@gmail.com';

-- 2. rolesテーブルとのJOIN結果を確認
SELECT 
    u.id AS user_id,
    u.email,
    u.role_id AS user_role_id,
    r.id AS role_id,
    r.name AS role_name,
    r.description AS role_description,
    u.created_at AS user_created_at,
    u.updated_at AS user_updated_at,
    r.created_at AS role_created_at,
    r.updated_at AS role_updated_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'glasswerkskimny@gmail.com';

-- 3. role_idとroles.idの型の一致確認
-- データ型情報を確認
SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable
FROM information_schema.columns c
WHERE 
    (c.table_name = 'users' AND c.column_name = 'role_id')
    OR (c.table_name = 'roles' AND c.column_name = 'id')
ORDER BY c.table_name, c.column_name;

-- 4. 全ロールの一覧を確認（参考用）
SELECT 
    id,
    name,
    description,
    created_at,
    updated_at
FROM roles
ORDER BY id;

-- 5. ユーザーのロール履歴を確認（audit_logsテーブルがある場合）
-- Note: audit_logsテーブルが存在しない場合はコメントアウト
/*
SELECT 
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at,
    created_by
FROM audit_logs
WHERE 
    table_name = 'users' 
    AND record_id = (SELECT id FROM users WHERE email = 'glasswerkskimny@gmail.com')
    AND (old_values::text LIKE '%role_id%' OR new_values::text LIKE '%role_id%')
ORDER BY created_at DESC;
*/

-- 6. キャッシュの可能性を考慮した追加確認
-- 最新のデータを確実に取得するため、トランザクション分離レベルを設定
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 再度ユーザー情報を確認
SELECT 
    u.id,
    u.email,
    u.role_id,
    r.name AS role_name,
    u.updated_at,
    NOW() AS query_timestamp
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'glasswerkskimny@gmail.com';

COMMIT;

-- 7. 統計情報（デバッグ用）
SELECT 
    r.name AS role_name,
    COUNT(u.id) AS user_count
FROM roles r
LEFT JOIN users u ON u.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.id;

-- 8. 環境変数の影響確認（アプリケーション側の設定）
-- NEXT_PUBLIC_USE_OPTIMIZED_SESSION=true の場合の注意事項：
-- - セッション情報がキャッシュされている可能性があります
-- - ブラウザのローカルストレージやセッションストレージを確認してください
-- - アプリケーション側でセッションをクリアする必要があるかもしれません

-- 実行時の注意事項：
-- 1. このクエリをSupabase SQL Editorまたはpsqlで実行してください
-- 2. 結果を記録し、期待値と比較してください
-- 3. role_idがNULLまたは期待値と異なる場合は、UPDATE文で修正が必要かもしれません