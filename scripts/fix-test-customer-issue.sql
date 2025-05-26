-- ===================================
-- テスト顧客ID問題の緊急修正
-- ===================================
-- 
-- 問題: テスト顧客ID 'cus_test_a2c17a51' が実際のStripeに存在しない
-- 解決策: テストデータをクリーンアップし、実際の顧客作成フローに修正
-- ===================================

-- 1. 現在の問題状況を確認
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== テスト顧客ID問題の確認 ===';
    RAISE NOTICE '';
    
    -- テスト顧客IDの確認
    RAISE NOTICE 'テスト顧客レコード数: %', (
        SELECT COUNT(*) 
        FROM public.stripe_customers 
        WHERE "customerId" LIKE 'cus_test_%'
    );
    
    -- 実際のStripe顧客レコード数
    RAISE NOTICE '実際のStripe顧客レコード数: %', (
        SELECT COUNT(*) 
        FROM public.stripe_customers 
        WHERE "customerId" LIKE 'cus_%' AND "customerId" NOT LIKE 'cus_test_%'
    );
    
    RAISE NOTICE '';
END $$;

-- 2. テスト顧客レコードをクリーンアップ
DELETE FROM public.stripe_customers 
WHERE "customerId" LIKE 'cus_test_%';

-- 3. テストサブスクリプションレコードもクリーンアップ
DELETE FROM public.stripe_user_subscriptions 
WHERE "customerId" LIKE 'cus_test_%';

-- 4. 修正後の状況確認
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== クリーンアップ後の状況 ===';
    RAISE NOTICE '';
    
    RAISE NOTICE 'Stripe顧客レコード数: %', (SELECT COUNT(*) FROM public.stripe_customers);
    RAISE NOTICE 'サブスクリプションレコード数: %', (SELECT COUNT(*) FROM public.stripe_user_subscriptions);
    
    -- 顧客レコードがないユーザー数
    RAISE NOTICE '顧客レコードがないユーザー数: %', (
        SELECT COUNT(*) 
        FROM public.users u 
        LEFT JOIN public.stripe_customers sc ON u.id = sc."userId" 
        WHERE sc."userId" IS NULL
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ テストデータクリーンアップ完了！';
    RAISE NOTICE '';
    RAISE NOTICE '次の動作:';
    RAISE NOTICE '- FREEプランユーザーは /dashboard/plans にリダイレクト';
    RAISE NOTICE '- 新規サブスクリプション時に実際のStripe顧客が作成される';
    RAISE NOTICE '- 既存の実際の顧客は影響を受けない';
    RAISE NOTICE '';
END $$; 