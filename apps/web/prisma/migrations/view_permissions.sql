-- Phase 1: ビューのアクセス権限設定

-- 1. ビューの所有者と権限を確認
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE viewname IN ('active_lesson_slots', 'active_reservations');

-- 2. 必要に応じて、anon（匿名）とauthenticated（認証済み）ロールに権限を付与
GRANT SELECT ON active_lesson_slots TO anon, authenticated;
GRANT SELECT ON active_reservations TO anon, authenticated;

-- 3. ビューの構造を確認（フロントエンドとの互換性チェック用）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'active_lesson_slots' 
ORDER BY ordinal_position;

-- 4. 実際のデータサンプルを確認（1件のみ）
SELECT * FROM active_lesson_slots LIMIT 1;