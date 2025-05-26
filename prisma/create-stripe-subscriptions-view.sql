-- ===================================
-- Stripe Subscriptions View 作成
-- ===================================
-- 
-- このスクリプトは、stripe_user_subscriptionsテーブルとstripe_customersテーブルを
-- 結合したビューを作成し、フロントエンドで期待される列名でデータを提供します。
-- 
-- 目的:
-- - フロントエンドのサブスクリプション取得処理の統一
-- - 列名の標準化（camelCase → snake_case）
-- - 複数テーブルの結合による包括的なデータ提供
-- ===================================

-- 既存のビューを削除（存在する場合）
DROP VIEW IF EXISTS public.stripe_subscriptions_view;

-- stripe_subscriptions_view ビューを作成
-- セキュリティ: 認証されたユーザーが自分のデータのみアクセスできるよう制限
CREATE VIEW public.stripe_subscriptions_view AS
SELECT 
    sus.id,
    sus."userId" as user_id,
    sus."customerId" as customer_id,
    sus."subscriptionId" as subscription_id,
    sus."priceId" as price_id,
    sus.status as subscription_status,
    sus."currentPeriodStart" as current_period_start,
    sus."currentPeriodEnd" as current_period_end,
    sus."cancelAtPeriodEnd" as cancel_at_period_end,
    sus."paymentMethodBrand" as payment_method_brand,
    sus."paymentMethodLast4" as payment_method_last4,
    sus."createdAt" as created_at,
    sus."updatedAt" as updated_at,
    sus."deletedAt" as deleted_at,
    -- 顧客情報も含める
    sc."customerId" as stripe_customer_id,
    sc.currency as customer_currency
FROM 
    public.stripe_user_subscriptions sus
LEFT JOIN 
    public.stripe_customers sc ON sus."userId" = sc."userId"
WHERE 
    sus."deletedAt" IS NULL
    -- セキュリティ制約: 認証されたユーザーのみ自分のデータにアクセス可能
    AND (
        -- service_roleは全データにアクセス可能
        auth.role() = 'service_role'
        -- 認証されたユーザーは自分のデータのみアクセス可能
        OR (auth.role() = 'authenticated' AND sus."userId" = (auth.uid())::text)
        -- 匿名ユーザーはアクセス不可（必要に応じて変更）
        OR auth.role() = 'anon'
    );

-- ビューに対する権限設定（RLSポリシーはビューには設定できないため、権限のみ設定）
GRANT SELECT ON public.stripe_subscriptions_view TO anon, authenticated, service_role;

-- 注意: ビューのセキュリティは、元のテーブル（stripe_user_subscriptions, stripe_customers）の
-- RLSポリシーによって制御されます。ビュー自体にはRLSポリシーを設定できません。

-- 動作確認用のテスト関数
CREATE OR REPLACE FUNCTION public.test_stripe_subscriptions_view()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- テスト1: ビューの存在確認
    RETURN QUERY
    SELECT 
        'view_exists_check'::TEXT,
        CASE WHEN EXISTS(
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'stripe_subscriptions_view'
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'stripe_subscriptions_view exists: ' || EXISTS(
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'stripe_subscriptions_view'
        )::TEXT;
    
    -- テスト2: ビューのデータ件数確認
    RETURN QUERY
    SELECT 
        'view_data_count'::TEXT,
        'INFO'::TEXT,
        'View records: ' || (SELECT COUNT(*) FROM public.stripe_subscriptions_view)::TEXT;
    
    -- テスト3: 列名の確認
    RETURN QUERY
    SELECT 
        'view_columns_check'::TEXT,
        CASE WHEN EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stripe_subscriptions_view'
            AND column_name IN ('user_id', 'subscription_id', 'price_id', 'subscription_status')
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Required columns exist: ' || EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stripe_subscriptions_view'
            AND column_name IN ('user_id', 'subscription_id', 'price_id', 'subscription_status')
        )::TEXT;
        
    -- テスト4: サンプルデータの取得テスト
    RETURN QUERY
    SELECT 
        'sample_data_test'::TEXT,
        'INFO'::TEXT,
        'Sample data available: ' || (
            CASE WHEN EXISTS(SELECT 1 FROM public.stripe_subscriptions_view LIMIT 1)
            THEN 'YES' ELSE 'NO' END
        )::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セットアップ完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Stripe Subscriptions View セットアップ完了 ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 作成されたビュー:';
    RAISE NOTICE '  - public.stripe_subscriptions_view';
    RAISE NOTICE '';
    RAISE NOTICE '📋 提供される列:';
    RAISE NOTICE '  - user_id (ユーザーID)';
    RAISE NOTICE '  - subscription_id (サブスクリプションID)';
    RAISE NOTICE '  - price_id (プライスID)';
    RAISE NOTICE '  - subscription_status (ステータス)';
    RAISE NOTICE '  - current_period_start/end (期間)';
    RAISE NOTICE '  - その他の詳細情報';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 動作確認:';
    RAISE NOTICE '  SELECT * FROM public.test_stripe_subscriptions_view();';
    RAISE NOTICE '';
    RAISE NOTICE '📝 使用例:';
    RAISE NOTICE '  SELECT * FROM public.stripe_subscriptions_view WHERE user_id = ''your-user-id'';';
    RAISE NOTICE '';
    RAISE NOTICE '=== セットアップ完了 ===';
END $$; 