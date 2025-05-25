-- ============================================================
-- MUED LMS - RLSポリシー修正スクリプト
-- Supabase権限エラー (permission denied for schema public) の解決
-- ============================================================

-- 全テーブルのRLSを無効化して権限問題を解決（開発環境用）
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'users', 'roles', 'permissions', 'lesson_slots', 
        'reservations', 'payments', 'stripe_customers', 
        'stripe_user_subscriptions', 'messages'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- 既存のポリシーを削除
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.%I', tbl);
        
        -- 開発環境では一時的にRLSを無効化
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
        
        RAISE NOTICE 'RLS無効化完了: %', tbl;
    END LOOP;
END $$;

-- stripe_user_subscriptionsテーブルの権限を明示的に設定
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_user_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_user_subscriptions TO service_role;

-- usersテーブルの権限を明示的に設定
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- stripe_customersテーブルの権限を明示的に設定
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_customers TO service_role;

-- その他のテーブルの権限も設定
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO service_role;

-- 権限確認用のビューを作成
CREATE OR REPLACE VIEW public.permission_check AS
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_enabled,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 権限確認用の関数を作成
CREATE OR REPLACE FUNCTION public.check_table_permissions(table_name TEXT)
RETURNS TABLE(
    permission_type TEXT,
    role_name TEXT,
    granted BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        privilege_type::TEXT,
        grantee::TEXT,
        CASE WHEN privilege_type IS NOT NULL THEN TRUE ELSE FALSE END as granted
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' 
    AND table_name = check_table_permissions.table_name
    ORDER BY grantee, privilege_type;
END;
$$;

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE '=== RLSポリシー修正完了 ===';
    RAISE NOTICE '1. 全テーブルのRLSを無効化しました（開発環境用）';
    RAISE NOTICE '2. 明示的な権限を設定しました';
    RAISE NOTICE '3. 権限確認用の関数を作成しました';
    RAISE NOTICE '4. 使用方法: SELECT * FROM check_table_permissions(''stripe_user_subscriptions'');';
    RAISE NOTICE '5. 全体確認: SELECT * FROM permission_check;';
END $$; 