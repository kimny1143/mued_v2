-- ===================================
-- サービスロールアクセス権限の修正
-- ===================================

-- 1. usersテーブルのサービスロールアクセス許可
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
CREATE POLICY "Service role full access to users" ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. stripe_customersテーブルのサービスロールアクセス許可
DROP POLICY IF EXISTS "Service role full access to stripe_customers" ON public.stripe_customers;
CREATE POLICY "Service role full access to stripe_customers" ON public.stripe_customers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. stripe_user_subscriptionsテーブルのサービスロールアクセス許可
DROP POLICY IF EXISTS "Service role full access to stripe_user_subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Service role full access to stripe_user_subscriptions" ON public.stripe_user_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. その他の重要テーブルのサービスロールアクセス許可
DROP POLICY IF EXISTS "Service role full access to lesson_slots" ON public.lesson_slots;
CREATE POLICY "Service role full access to lesson_slots" ON public.lesson_slots
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to reservations" ON public.reservations;
CREATE POLICY "Service role full access to reservations" ON public.reservations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to messages" ON public.messages;
CREATE POLICY "Service role full access to messages" ON public.messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. 権限の確認
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND policyname LIKE '%service_role%'
ORDER BY tablename, policyname; 