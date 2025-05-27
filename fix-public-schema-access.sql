-- ===================================
-- public schemaに対するサービスロール権限の修正
-- ===================================

-- 1. public schemaに対する基本権限を付与
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 2. 将来作成されるオブジェクトに対する権限も設定
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- 3. 特定テーブルに対する明示的な権限付与
GRANT ALL PRIVILEGES ON public.users TO service_role;
GRANT ALL PRIVILEGES ON public.roles TO service_role;
GRANT ALL PRIVILEGES ON public.stripe_customers TO service_role;
GRANT ALL PRIVILEGES ON public.stripe_user_subscriptions TO service_role;
GRANT ALL PRIVILEGES ON public.lesson_slots TO service_role;
GRANT ALL PRIVILEGES ON public.reservations TO service_role;
GRANT ALL PRIVILEGES ON public.messages TO service_role;
GRANT ALL PRIVILEGES ON public.permissions TO service_role;

-- 4. RLSをバイパスする権限を付与
GRANT rls_exempt_role TO service_role;

-- 5. 権限確認クエリ
SELECT 
    schemaname, 
    tablename, 
    hasselect, 
    hasinsert, 
    hasupdate, 
    hasdelete 
FROM pg_tables t
LEFT JOIN (
    SELECT 
        schemaname,
        tablename,
        has_table_privilege('service_role', schemaname||'.'||tablename, 'SELECT') as hasselect,
        has_table_privilege('service_role', schemaname||'.'||tablename, 'INSERT') as hasinsert,
        has_table_privilege('service_role', schemaname||'.'||tablename, 'UPDATE') as hasupdate,
        has_table_privilege('service_role', schemaname||'.'||tablename, 'DELETE') as hasdelete
    FROM pg_tables 
    WHERE schemaname = 'public'
) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename; 