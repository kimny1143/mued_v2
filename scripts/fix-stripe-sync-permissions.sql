-- ===================================
-- Stripe同期スクリプト権限修正
-- ===================================
-- 
-- 問題: permission denied for sequence stripe_customers_id_seq
-- 解決策: Service Roleに必要な権限を付与
-- ===================================

-- 1. Service Roleにシーケンス権限を付与
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON SEQUENCE stripe_customers_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE stripe_user_subscriptions_id_seq TO service_role;

-- 2. 将来作成されるシーケンスにも権限を付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- 3. テーブルへの完全なアクセス権限を確認・付与
GRANT ALL PRIVILEGES ON TABLE stripe_customers TO service_role;
GRANT ALL PRIVILEGES ON TABLE stripe_user_subscriptions TO service_role;
GRANT ALL PRIVILEGES ON TABLE users TO service_role;

-- 4. 権限確認
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 権限確認結果 ===';
    RAISE NOTICE '';
    
    -- シーケンス権限の確認
    RAISE NOTICE 'stripe_customers_id_seq権限: %', (
        SELECT string_agg(privilege_type, ', ')
        FROM information_schema.usage_privileges 
        WHERE object_name = 'stripe_customers_id_seq' 
        AND grantee = 'service_role'
    );
    
    RAISE NOTICE 'stripe_user_subscriptions_id_seq権限: %', (
        SELECT string_agg(privilege_type, ', ')
        FROM information_schema.usage_privileges 
        WHERE object_name = 'stripe_user_subscriptions_id_seq' 
        AND grantee = 'service_role'
    );
    
    -- テーブル権限の確認
    RAISE NOTICE 'stripe_customers テーブル権限: %', (
        SELECT string_agg(privilege_type, ', ')
        FROM information_schema.table_privileges 
        WHERE table_name = 'stripe_customers' 
        AND grantee = 'service_role'
    );
    
    RAISE NOTICE 'stripe_user_subscriptions テーブル権限: %', (
        SELECT string_agg(privilege_type, ', ')
        FROM information_schema.table_privileges 
        WHERE table_name = 'stripe_user_subscriptions' 
        AND grantee = 'service_role'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ 権限設定完了！';
    RAISE NOTICE '';
END $$; 