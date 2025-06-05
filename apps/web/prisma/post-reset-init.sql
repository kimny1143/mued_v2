-- ===================================
-- MUED LMS データベース統合初期化SQL
-- ===================================
-- 
-- このファイルは、Prismaマイグレーション後に実行する
-- 全ての追加設定を一元化したものです。
-- 
-- 実行タイミング: 
-- 1. npx prisma migrate reset --force
-- 2. このファイルをSupabase SQL Editorで実行
-- 3. npm run seed
--
-- 含まれる機能:
-- 1. 基本ロール作成
-- 2. 認証ユーザー同期システム
-- 3. RLSポリシー設定
-- 4. Stripe関連設定
-- 5. 権限設定
-- 6. 動作確認関数
-- ===================================

-- トランザクション開始
BEGIN;

-- ===================================
-- 1. 基本ロール作成
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 1. 基本ロール作成 ===';
    
    -- Student ロール
    INSERT INTO public.roles (id, name, description) 
    VALUES ('student', 'Student', '生徒ロール - レッスン予約と受講が可能')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;
    
    -- Mentor ロール  
    INSERT INTO public.roles (id, name, description)
    VALUES ('mentor', 'Mentor', 'メンターロール - レッスン提供と管理が可能')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;
    
    -- Admin ロール
    INSERT INTO public.roles (id, name, description)
    VALUES ('admin', 'Admin', '管理者ロール - システム全体の管理が可能')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;
    
    RAISE NOTICE '基本ロール作成完了';
END $$;

-- ===================================
-- 2. 認証ユーザー同期システム
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 2. 認証ユーザー同期システム ===';
END $$;

-- 2.1 新規ユーザー作成時の同期関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
    default_role_id TEXT := 'student';
BEGIN
    -- メタデータから情報を抽出
    user_email := NEW.email;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
    );
    user_image := NEW.raw_user_meta_data->>'avatar_url';
    
    -- public.usersテーブルに挿入
    INSERT INTO public.users (
        id, email, name, image, "roleId", "emailVerified"
    ) VALUES (
        NEW.id::text,
        user_email,
        user_name,
        user_image,
        default_role_id,
        COALESCE(NEW.email_confirmed_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        image = COALESCE(EXCLUDED.image, users.image),
        "emailVerified" = COALESCE(EXCLUDED."emailVerified", users."emailVerified");
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 ユーザー更新時の同期関数
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
BEGIN
    user_email := NEW.email;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
    );
    user_image := NEW.raw_user_meta_data->>'avatar_url';
    
    UPDATE public.users SET
        email = user_email,
        name = COALESCE(user_name, name),
        image = COALESCE(user_image, image),
        "emailVerified" = CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL 
            THEN NEW.email_confirmed_at
            ELSE "emailVerified"
        END
    WHERE id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 トリガー作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- ===================================
-- 3. RLSポリシー設定
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 3. RLSポリシー設定 ===';
END $$;

-- 3.1 RLS有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3.2 users テーブルのポリシー
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id);

-- 3.3 stripe_customers テーブルのポリシー
DROP POLICY IF EXISTS "Users can view own stripe customer" ON public.stripe_customers;
CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
    FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own stripe customer" ON public.stripe_customers;
CREATE POLICY "Users can insert own stripe customer" ON public.stripe_customers
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- 3.4 stripe_user_subscriptions テーブルのポリシー
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.stripe_user_subscriptions
    FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.stripe_user_subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.stripe_user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.stripe_user_subscriptions
    FOR UPDATE USING (auth.uid()::text = "userId");

-- 3.5 reservations テーブルのポリシー
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" ON public.reservations
    FOR SELECT USING (
        auth.uid()::text = "studentId" OR 
        auth.uid()::text IN (
            SELECT "teacherId" FROM public.lesson_slots WHERE id = "slotId"
        )
    );

DROP POLICY IF EXISTS "Students can create reservations" ON public.reservations;
CREATE POLICY "Students can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid()::text = "studentId");

DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
CREATE POLICY "Users can update own reservations" ON public.reservations
    FOR UPDATE USING (
        auth.uid()::text = "studentId" OR 
        auth.uid()::text IN (
            SELECT "teacherId" FROM public.lesson_slots WHERE id = "slotId"
        )
    );

-- 3.6 lesson_slots テーブルのポリシー
DROP POLICY IF EXISTS "Anyone can view available slots" ON public.lesson_slots;
CREATE POLICY "Anyone can view available slots" ON public.lesson_slots
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can manage own slots" ON public.lesson_slots;
CREATE POLICY "Teachers can manage own slots" ON public.lesson_slots
    FOR ALL USING (auth.uid()::text = "teacherId");

-- 3.7 messages テーブルのポリシー
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms" ON public.messages
    FOR SELECT USING (
        auth.uid()::text = "senderId" OR
        "room_id" IN (
            SELECT CONCAT('reservation_', id) FROM public.reservations 
            WHERE "studentId" = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid()::text = "senderId");

-- 3.8 payments テーブルのポリシー
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid()::text = "userId");

-- ===================================
-- 4. Stripe関連設定
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 4. Stripe関連設定 ===';
END $$;

-- 4.1 インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON public.stripe_customers("userId");
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_id ON public.stripe_user_subscriptions("userId");
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON public.stripe_user_subscriptions("customerId");
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON public.stripe_user_subscriptions("status");

-- 4.2 Stripe関連のシーケンス権限設定
GRANT USAGE, SELECT ON SEQUENCE public.stripe_customers_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.stripe_user_subscriptions_id_seq TO authenticated, service_role;

-- ===================================
-- 5. 権限設定
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 5. 権限設定 ===';
END $$;

-- 5.1 基本権限
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 5.2 認証ユーザー権限
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stripe_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stripe_user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reservations TO authenticated;
GRANT SELECT ON public.lesson_slots TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.roles TO authenticated;

-- 5.3 匿名ユーザー権限（最小限）
GRANT SELECT ON public.lesson_slots TO anon;
GRANT SELECT ON public.roles TO anon;

-- ===================================
-- 6. 動作確認関数
-- ===================================
CREATE OR REPLACE FUNCTION public.test_post_reset_init()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- テスト1: ロール確認
    RETURN QUERY
    SELECT 
        'roles_check'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.roles) >= 3 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Roles count: ' || (SELECT COUNT(*) FROM public.roles)::TEXT;
    
    -- テスト2: トリガー確認
    RETURN QUERY
    SELECT 
        'triggers_check'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Auth sync triggers exist: ' || EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')::TEXT;
    
    -- テスト3: RLS確認
    RETURN QUERY
    SELECT 
        'rls_check'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') > 0 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'RLS policies count: ' || (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')::TEXT;
    
    -- テスト4: インデックス確認
    RETURN QUERY
    SELECT 
        'indexes_check'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stripe_customers_user_id') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Stripe indexes exist: ' || EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stripe_customers_user_id')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 7. 既存認証ユーザーの同期
-- ===================================
DO $$
DECLARE
    auth_user RECORD;
    sync_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== 7. 既存認証ユーザーの同期 ===';
    
    -- 既存の認証ユーザーを同期
    FOR auth_user IN 
        SELECT id, email, raw_user_meta_data, email_confirmed_at, created_at
        FROM auth.users
    LOOP
        INSERT INTO public.users (
            id, email, name, image, "roleId", "emailVerified"
        ) VALUES (
            auth_user.id::text,
            auth_user.email,
            COALESCE(
                auth_user.raw_user_meta_data->>'full_name',
                auth_user.raw_user_meta_data->>'name',
                split_part(auth_user.email, '@', 1)
            ),
            auth_user.raw_user_meta_data->>'avatar_url',
            'student',
            COALESCE(auth_user.email_confirmed_at, auth_user.created_at)
        )
        ON CONFLICT (id) DO NOTHING;
        
        sync_count := sync_count + 1;
    END LOOP;
    
    RAISE NOTICE '既存認証ユーザー同期完了: % 件処理', sync_count;
END $$;

-- トランザクション終了
COMMIT;

-- ===================================
-- 完了メッセージ
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MUED LMS データベース初期化完了 ===';
    RAISE NOTICE '設定内容:';
    RAISE NOTICE '  ✅ 基本ロール作成 (Student, Mentor, Admin)';
    RAISE NOTICE '  ✅ 認証ユーザー同期システム';
    RAISE NOTICE '  ✅ RLSポリシー設定';
    RAISE NOTICE '  ✅ Stripe関連設定';
    RAISE NOTICE '  ✅ 権限設定';
    RAISE NOTICE '  ✅ 動作確認関数';
    RAISE NOTICE '';
    RAISE NOTICE '次のステップ:';
    RAISE NOTICE '  1. npm run seed (初期データ投入)';
    RAISE NOTICE '  2. SELECT * FROM public.test_post_reset_init(); (動作確認)';
    RAISE NOTICE '  3. npm run check:user (ユーザー確認)';
    RAISE NOTICE '';
    RAISE NOTICE '=== 初期化完了 ===';
END $$; 