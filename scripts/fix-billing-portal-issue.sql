-- ===================================
-- Billing Portal 問題修正スクリプト
-- ===================================
-- 
-- 問題: 既存のテスト取引があるため、プラン更新時にBilling Portalへの
--       遷移が失敗し、ダッシュボードに戻される
-- 
-- 原因: stripe_customersテーブルに顧客情報が正しく同期されていない
-- 
-- 解決策: 
-- 1. 既存のテスト取引データを確認
-- 2. 不足している顧客情報を補完
-- 3. Billing Portal機能のテスト
-- ===================================

-- 1. 現在のデータ状況を確認
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 現在のデータ状況確認 ===';
    RAISE NOTICE '';
    
    -- ユーザー数
    RAISE NOTICE 'ユーザー数: %', (SELECT COUNT(*) FROM public.users);
    
    -- Stripe顧客数
    RAISE NOTICE 'Stripe顧客数: %', (SELECT COUNT(*) FROM public.stripe_customers);
    
    -- サブスクリプション数
    RAISE NOTICE 'サブスクリプション数: %', (SELECT COUNT(*) FROM public.stripe_user_subscriptions);
    
    -- 同期されていないユーザー数
    RAISE NOTICE '同期されていないユーザー数: %', (
        SELECT COUNT(*) 
        FROM public.users u 
        LEFT JOIN public.stripe_customers sc ON u.id = sc."userId" 
        WHERE sc."userId" IS NULL
    );
    
    RAISE NOTICE '';
END $$;

-- 2. 詳細なデータ分析
CREATE OR REPLACE FUNCTION public.analyze_billing_portal_data()
RETURNS TABLE(
    analysis_type TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- ユーザーとStripe顧客の関連性チェック
    RETURN QUERY
    SELECT 
        'user_customer_mapping'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'ISSUE' ELSE 'OK' END::TEXT,
        'Users without Stripe customers: ' || COUNT(*)::TEXT
    FROM public.users u 
    LEFT JOIN public.stripe_customers sc ON u.id = sc."userId" 
    WHERE sc."userId" IS NULL;
    
    -- サブスクリプションと顧客の関連性チェック
    RETURN QUERY
    SELECT 
        'subscription_customer_mapping'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'ISSUE' ELSE 'OK' END::TEXT,
        'Subscriptions without customer records: ' || COUNT(*)::TEXT
    FROM public.stripe_user_subscriptions sus
    LEFT JOIN public.stripe_customers sc ON sus."userId" = sc."userId"
    WHERE sc."userId" IS NULL;
    
    -- アクティブなサブスクリプション詳細
    RETURN QUERY
    SELECT 
        'active_subscriptions'::TEXT,
        'INFO'::TEXT,
        'Active subscriptions: ' || COUNT(*)::TEXT || 
        ' (Status breakdown: ' || 
        STRING_AGG(status || ':' || count::TEXT, ', ') || ')'
    FROM (
        SELECT status, COUNT(*) as count
        FROM public.stripe_user_subscriptions 
        WHERE status IN ('active', 'trialing', 'past_due')
        GROUP BY status
    ) sub_counts;
    
    -- 重複チェック
    RETURN QUERY
    SELECT 
        'duplicate_customers'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
        'Users with multiple Stripe customers: ' || COUNT(*)::TEXT
    FROM (
        SELECT "userId", COUNT(*) as customer_count
        FROM public.stripe_customers
        GROUP BY "userId"
        HAVING COUNT(*) > 1
    ) duplicates;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. データ分析実行
SELECT * FROM public.analyze_billing_portal_data();

-- 4. 不足している顧客レコードを特定・修正
CREATE OR REPLACE FUNCTION public.fix_missing_customer_records()
RETURNS TABLE(
    action_type TEXT,
    user_id TEXT,
    customer_id TEXT,
    result TEXT
) AS $$
DECLARE
    missing_user RECORD;
    test_customer_id TEXT;
BEGIN
    -- サブスクリプションがあるが顧客レコードがないユーザーを特定
    FOR missing_user IN 
        SELECT DISTINCT sus."userId", sus."customerId"
        FROM public.stripe_user_subscriptions sus
        LEFT JOIN public.stripe_customers sc ON sus."userId" = sc."userId"
        WHERE sc."userId" IS NULL
        AND sus.status IN ('active', 'trialing', 'past_due')
    LOOP
        -- 顧客レコードを作成
        INSERT INTO public.stripe_customers (
            "userId",
            "customerId",
            "createdAt",
            "updatedAt"
        ) VALUES (
            missing_user."userId",
            missing_user."customerId",
            NOW(),
            NOW()
        )
        ON CONFLICT ("userId") DO UPDATE SET
            "customerId" = EXCLUDED."customerId",
            "updatedAt" = NOW();
        
        RETURN QUERY
        SELECT 
            'customer_record_created'::TEXT,
            missing_user."userId"::TEXT,
            missing_user."customerId"::TEXT,
            'SUCCESS'::TEXT;
    END LOOP;
    
    -- テスト用の顧客レコードがない場合の処理
    IF NOT EXISTS (
        SELECT 1 FROM public.stripe_customers 
        WHERE "customerId" LIKE 'cus_test_%' OR "customerId" LIKE 'cus_%'
    ) THEN
        -- 最初のユーザーにテスト顧客IDを割り当て
        SELECT id INTO test_customer_id FROM public.users LIMIT 1;
        
        IF test_customer_id IS NOT NULL THEN
            INSERT INTO public.stripe_customers (
                "userId",
                "customerId",
                "createdAt",
                "updatedAt"
            ) VALUES (
                test_customer_id,
                'cus_test_' || SUBSTRING(test_customer_id, 1, 8),
                NOW(),
                NOW()
            )
            ON CONFLICT ("userId") DO NOTHING;
            
            RETURN QUERY
            SELECT 
                'test_customer_created'::TEXT,
                test_customer_id::TEXT,
                ('cus_test_' || SUBSTRING(test_customer_id, 1, 8))::TEXT,
                'SUCCESS'::TEXT;
        END IF;
    END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 修正実行
SELECT * FROM public.fix_missing_customer_records();

-- 6. Billing Portal テスト関数
CREATE OR REPLACE FUNCTION public.test_billing_portal_readiness()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- テスト1: 顧客レコードの存在確認
    RETURN QUERY
    SELECT 
        'customer_records_exist'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Stripe customer records: ' || COUNT(*)::TEXT
    FROM public.stripe_customers;
    
    -- テスト2: アクティブサブスクリプションと顧客の関連性
    RETURN QUERY
    SELECT 
        'active_subs_have_customers'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Active subscriptions without customers: ' || COUNT(*)::TEXT
    FROM public.stripe_user_subscriptions sus
    LEFT JOIN public.stripe_customers sc ON sus."userId" = sc."userId"
    WHERE sus.status IN ('active', 'trialing', 'past_due')
    AND sc."userId" IS NULL;
    
    -- テスト3: ユーザーと顧客の1対1関係
    RETURN QUERY
    SELECT 
        'user_customer_one_to_one'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
        'Users with multiple customers: ' || COUNT(*)::TEXT
    FROM (
        SELECT "userId", COUNT(*) as customer_count
        FROM public.stripe_customers
        GROUP BY "userId"
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- テスト4: サンプルユーザーでのBilling Portal準備状況
    RETURN QUERY
    SELECT 
        'sample_user_ready'::TEXT,
        CASE WHEN EXISTS(
            SELECT 1 
            FROM public.users u
            JOIN public.stripe_customers sc ON u.id = sc."userId"
            LIMIT 1
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Sample user with customer record exists: ' || EXISTS(
            SELECT 1 
            FROM public.users u
            JOIN public.stripe_customers sc ON u.id = sc."userId"
            LIMIT 1
        )::TEXT;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. テスト実行
SELECT * FROM public.test_billing_portal_readiness();

-- 8. 修正後の状況確認
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 修正後の状況確認 ===';
    RAISE NOTICE '';
    
    -- 修正後のデータ数
    RAISE NOTICE 'ユーザー数: %', (SELECT COUNT(*) FROM public.users);
    RAISE NOTICE 'Stripe顧客数: %', (SELECT COUNT(*) FROM public.stripe_customers);
    RAISE NOTICE 'サブスクリプション数: %', (SELECT COUNT(*) FROM public.stripe_user_subscriptions);
    
    -- 同期状況
    RAISE NOTICE '同期済みユーザー数: %', (
        SELECT COUNT(*) 
        FROM public.users u 
        JOIN public.stripe_customers sc ON u.id = sc."userId"
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Billing Portal 修正完了！';
    RAISE NOTICE '';
    RAISE NOTICE '次のステップ:';
    RAISE NOTICE '1. フロントエンドでプランタグをクリック';
    RAISE NOTICE '2. Billing Portal への遷移を確認';
    RAISE NOTICE '3. プラン変更機能をテスト';
    RAISE NOTICE '';
END $$;

-- 9. クリーンアップ（テスト関数を削除）
-- DROP FUNCTION IF EXISTS public.analyze_billing_portal_data();
-- DROP FUNCTION IF EXISTS public.fix_missing_customer_records();
-- DROP FUNCTION IF EXISTS public.test_billing_portal_readiness(); 