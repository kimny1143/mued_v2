-- ===================================
-- RLSポリシー修正SQL
-- ===================================
-- 
-- 問題: RLSポリシーでcamelCase（"userId"）を使用していたが、
-- 実際のテーブルはsnake_case（user_id）を使用している
-- 
-- 解決: 正しいカラム名でポリシーを再作成する
-- ===================================

BEGIN;

-- stripe_customers テーブルのポリシー修正
DROP POLICY IF EXISTS "Users can view own stripe customer" ON public.stripe_customers;
CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own stripe customer" ON public.stripe_customers;
CREATE POLICY "Users can insert own stripe customer" ON public.stripe_customers
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- stripe_user_subscriptions テーブルのポリシー修正
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.stripe_user_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.stripe_user_subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.stripe_user_subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- reservations テーブルのポリシー修正（存在する場合）
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" ON public.reservations
    FOR SELECT USING (
        auth.uid()::text = student_id OR 
        auth.uid()::text IN (
            SELECT teacher_id FROM public.lesson_slots WHERE id = slot_id
        )
    );

DROP POLICY IF EXISTS "Students can create reservations" ON public.reservations;
CREATE POLICY "Students can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid()::text = student_id);

DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
CREATE POLICY "Users can update own reservations" ON public.reservations
    FOR UPDATE USING (
        auth.uid()::text = student_id OR 
        auth.uid()::text IN (
            SELECT teacher_id FROM public.lesson_slots WHERE id = slot_id
        )
    );

-- lesson_slots テーブルのポリシー修正
DROP POLICY IF EXISTS "Teachers can manage own slots" ON public.lesson_slots;
CREATE POLICY "Teachers can manage own slots" ON public.lesson_slots
    FOR ALL USING (auth.uid()::text = teacher_id);

-- messages テーブルのポリシー修正
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms" ON public.messages
    FOR SELECT USING (
        auth.uid()::text = sender_id OR
        room_id IN (
            SELECT CONCAT('reservation_', id) FROM public.reservations 
            WHERE student_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

-- payments テーブルのポリシー修正
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid()::text = user_id);

-- サービスロール用の包括的ポリシー追加（念のため）
DROP POLICY IF EXISTS "Service role full access stripe_customers" ON public.stripe_customers;
CREATE POLICY "Service role full access stripe_customers" ON public.stripe_customers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access stripe_user_subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Service role full access stripe_user_subscriptions" ON public.stripe_user_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- 確認クエリ
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('stripe_customers', 'stripe_user_subscriptions')
ORDER BY tablename, policyname; 