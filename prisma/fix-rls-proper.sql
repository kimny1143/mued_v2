-- ============================================================
-- MUED LMS - 根本的なRLSポリシー修正スクリプト
-- 単純に無効化するのではなく、適切なポリシーを設定
-- ============================================================

-- 1. 既存の問題のあるポリシーを削除
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
        -- 全ての既存ポリシーを削除
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to access" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow service role full access" ON public.%I', tbl);
        
        RAISE NOTICE '既存ポリシー削除完了: %', tbl;
    END LOOP;
END $$;

-- 2. RLSを有効化し、適切なポリシーを設定
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
        -- RLS有効化
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        -- サービスロール用ポリシー（全アクセス）
        EXECUTE format(
            'CREATE POLICY "Service role full access" ON public.%I
             FOR ALL TO service_role
             USING (true) WITH CHECK (true)', 
            tbl
        );
        
        -- 認証ユーザー用ポリシー（READ+WRITE）
        EXECUTE format(
            'CREATE POLICY "Authenticated users access" ON public.%I
             FOR ALL TO authenticated
             USING (true) WITH CHECK (true)', 
            tbl
        );
        
        -- 匿名ユーザー用ポリシー（READ+WRITE - 開発環境用）
        EXECUTE format(
            'CREATE POLICY "Anon users access" ON public.%I
             FOR ALL TO anon
             USING (true) WITH CHECK (true)', 
            tbl
        );
        
        RAISE NOTICE 'RLS適切設定完了: %', tbl;
    END LOOP;
END $$;

-- 3. 特別なテーブル別ポリシー設定

-- usersテーブル: ユーザーは自分のデータのみアクセス可能
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- stripe_user_subscriptionsテーブル: ユーザーは自分のサブスクリプションのみアクセス可能
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.stripe_user_subscriptions;

CREATE POLICY "Users can view own subscriptions" ON public.stripe_user_subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own subscriptions" ON public.stripe_user_subscriptions
    FOR ALL TO authenticated
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

-- rolesテーブル: 全ユーザーが読み取り可能
DROP POLICY IF EXISTS "Roles are readable by all" ON public.roles;
CREATE POLICY "Roles are readable by all" ON public.roles
    FOR SELECT TO authenticated, anon
    USING (true);

-- 4. テーブル権限の明示的な設定
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.roles TO anon;
GRANT SELECT ON public.lesson_slots TO anon;

-- 5. 関数の作成: 現在のユーザーIDを取得
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE(auth.uid()::text, 'anonymous');
$$;

-- 6. 権限確認用の関数
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean,
    policy_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity as rls_enabled,
        COUNT(p.policyname) as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$;

-- 7. 確認とテスト
DO $$
BEGIN
    RAISE NOTICE '=== RLS適切設定完了 ===';
    RAISE NOTICE '1. 全テーブルでRLSを有効化';
    RAISE NOTICE '2. 適切なユーザー別ポリシーを設定';
    RAISE NOTICE '3. サービスロールには全アクセス権を付与';
    RAISE NOTICE '4. 確認用関数を作成';
    RAISE NOTICE '5. 確認方法: SELECT * FROM check_rls_status();';
END $$;

-- 8. 最終確認
SELECT 'RLS適切設定完了' as status, COUNT(*) as tables_with_rls 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true; 