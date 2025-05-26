-- ===================================
-- Stripe テーブル権限修正（緊急対応）
-- ===================================
-- 
-- 問題: permission denied for table stripe_user_subscriptions
-- 解決策: 認証済みユーザーとService Roleに適切な権限を付与
-- ===================================

-- 1. 認証済みユーザーに読み取り権限を付与
GRANT SELECT ON TABLE stripe_user_subscriptions TO authenticated;
GRANT SELECT ON TABLE stripe_customers TO authenticated;

-- 2. Service Roleに完全な権限を付与
GRANT ALL PRIVILEGES ON TABLE stripe_user_subscriptions TO service_role;
GRANT ALL PRIVILEGES ON TABLE stripe_customers TO service_role;

-- 3. 匿名ユーザーにも読み取り権限を付与（必要に応じて）
GRANT SELECT ON TABLE stripe_user_subscriptions TO anon;
GRANT SELECT ON TABLE stripe_customers TO anon;

-- 4. RLSポリシーを確認・設定
-- stripe_user_subscriptionsテーブルのRLS設定
ALTER TABLE stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own subscriptions" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON stripe_user_subscriptions;

-- ユーザーが自分のサブスクリプションのみ閲覧できるポリシー
CREATE POLICY "Users can view own subscriptions" 
ON stripe_user_subscriptions 
FOR SELECT 
TO authenticated 
USING ((auth.uid())::text = "userId");

-- Service Roleは全てのデータにアクセス可能
CREATE POLICY "Service role full access" 
ON stripe_user_subscriptions 
FOR ALL 
TO service_role 
USING (true);

-- 5. stripe_customersテーブルのRLS設定
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Service role full access customers" ON stripe_customers;

-- ユーザーが自分の顧客データのみ閲覧できるポリシー
CREATE POLICY "Users can view own customer data" 
ON stripe_customers 
FOR SELECT 
TO authenticated 
USING ((auth.uid())::text = "userId");

-- Service Roleは全てのデータにアクセス可能
CREATE POLICY "Service role full access customers" 
ON stripe_customers 
FOR ALL 
TO service_role 
USING (true);

-- 6. 権限確認
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 権限設定確認 ===';
    RAISE NOTICE '';
    
    -- テーブル権限の確認
    RAISE NOTICE 'stripe_user_subscriptions authenticated権限: %', (
        SELECT string_agg(privilege_type, ', ')
        FROM information_schema.table_privileges 
        WHERE table_name = 'stripe_user_subscriptions' 
        AND grantee = 'authenticated'
    );
    
    RAISE NOTICE 'stripe_user_subscriptions service_role権限: %', (
        SELECT string_agg(privilege_type, ', ')
        FROM information_schema.table_privileges 
        WHERE table_name = 'stripe_user_subscriptions' 
        AND grantee = 'service_role'
    );
    
    -- RLSポリシーの確認
    RAISE NOTICE 'stripe_user_subscriptions RLS有効: %', (
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'stripe_user_subscriptions'
    );
    
    RAISE NOTICE 'stripe_user_subscriptions ポリシー数: %', (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE tablename = 'stripe_user_subscriptions'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ 権限設定完了！';
    RAISE NOTICE '';
END $$; 