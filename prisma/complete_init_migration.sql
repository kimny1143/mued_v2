-- ===================================
-- MUED LMS 完全初期マイグレーション
-- 承認フロー対応版
-- ===================================

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "lesson_slots" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "hourlyRate" INTEGER NOT NULL DEFAULT 6000,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "minHours" INTEGER NOT NULL DEFAULT 1,
    "maxHours" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minDuration" INTEGER DEFAULT 60,
    "maxDuration" INTEGER DEFAULT 90,

    CONSTRAINT "lesson_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "senderId" TEXT NOT NULL,
    "sender_type" TEXT,
    "room_id" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_urls" TEXT[],

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "paymentId" TEXT,
    "bookedStartTime" TIMESTAMP(3) NOT NULL,
    "bookedEndTime" TIMESTAMP(3) NOT NULL,
    "hoursBooked" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER DEFAULT 60,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_customers" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "currency" VARCHAR(3) DEFAULT 'jpy',

    CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_user_subscriptions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "priceId" TEXT,
    "status" TEXT,
    "currentPeriodStart" BIGINT,
    "currentPeriodEnd" BIGINT,
    "cancelAtPeriodEnd" BOOLEAN,
    "paymentMethodBrand" TEXT,
    "paymentMethodLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stripe_user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "roleId" TEXT NOT NULL DEFAULT 'student',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "lesson_slots_startTime_endTime_idx" ON "lesson_slots"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "lesson_slots_startTime_isAvailable_idx" ON "lesson_slots"("startTime", "isAvailable");

-- CreateIndex
CREATE INDEX "lesson_slots_teacherId_idx" ON "lesson_slots"("teacherId");

-- CreateIndex
CREATE INDEX "messages_room_id_idx" ON "messages"("room_id");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSessionId_key" ON "payments"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "payments"("stripePaymentId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_roleId_idx" ON "permissions"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_paymentId_key" ON "reservations"("paymentId");

-- CreateIndex
CREATE INDEX "reservations_slotId_idx" ON "reservations"("slotId");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_studentId_idx" ON "reservations"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_unique" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_userId_key" ON "stripe_customers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_customerId_key" ON "stripe_customers"("customerId");

-- CreateIndex
CREATE INDEX "idx_stripe_customers_currency" ON "stripe_customers"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_user_subscriptions_subscriptionId_key" ON "stripe_user_subscriptions"("subscriptionId");

-- CreateIndex
CREATE INDEX "stripe_user_subscriptions_userId_idx" ON "stripe_user_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_slots" ADD CONSTRAINT "lesson_slots_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "lesson_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_user_subscriptions" ADD CONSTRAINT "stripe_user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================================
-- RLS (Row Level Security) 設定
-- ===================================

-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Anon users access" ON "users" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "users" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "users" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can view own data" ON "users" FOR SELECT TO authenticated USING ((auth.uid())::text = id);
CREATE POLICY "Users can update own data" ON "users" FOR UPDATE TO authenticated USING ((auth.uid())::text = id) WITH CHECK ((auth.uid())::text = id);

-- Lesson slots table policies
CREATE POLICY "Anon users access" ON "lesson_slots" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "lesson_slots" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "lesson_slots" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reservations table policies
CREATE POLICY "Anon users access" ON "reservations" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "reservations" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "reservations" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payments table policies
CREATE POLICY "Anon users access" ON "payments" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "payments" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "payments" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Messages table policies
CREATE POLICY "Anon users access" ON "messages" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "messages" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "messages" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Roles table policies
CREATE POLICY "Anon users access" ON "roles" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "roles" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "roles" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Roles are readable by all" ON "roles" FOR SELECT TO anon, authenticated USING (true);

-- Permissions table policies
CREATE POLICY "Anon users access" ON "permissions" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "permissions" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "permissions" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Stripe subscriptions policies
CREATE POLICY "Anon users access" ON "stripe_customers" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "stripe_customers" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "stripe_customers" FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon users access" ON "stripe_user_subscriptions" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users access" ON "stripe_user_subscriptions" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "stripe_user_subscriptions" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can view own subscriptions" ON "stripe_user_subscriptions" FOR SELECT TO authenticated USING ((auth.uid())::text = "userId");
CREATE POLICY "Users can manage own subscriptions" ON "stripe_user_subscriptions" FOR ALL TO authenticated USING ((auth.uid())::text = "userId") WITH CHECK ((auth.uid())::text = "userId");

-- ===================================
-- カスタム関数とトリガー
-- ===================================

-- Function to set default student role
CREATE OR REPLACE FUNCTION set_default_student_role()
RETURNS TRIGGER AS $$
BEGIN
    -- roleIdが設定されていない場合のみ、Studentロールを設定
    IF NEW."roleId" IS NULL THEN
        NEW."roleId" := (SELECT id FROM public.roles WHERE name = 'Student');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set student role for new users
CREATE TRIGGER set_default_role
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_default_student_role();

-- ===================================
-- 初期データ挿入
-- ===================================

-- Insert default roles
INSERT INTO "roles" ("id", "name", "description") VALUES
    ('student', 'Student', '生徒ユーザー'),
    ('mentor', 'Mentor', 'メンター（講師）ユーザー'),
    ('admin', 'Admin', '管理者ユーザー')
ON CONFLICT ("id") DO NOTHING;

-- Insert basic permissions
INSERT INTO "permissions" ("id", "name", "roleId") VALUES
    ('perm_student_book', 'レッスン予約', 'student'),
    ('perm_student_view_own', '自分の予約閲覧', 'student'),
    ('perm_mentor_create_slots', 'スロット作成', 'mentor'),
    ('perm_mentor_approve', '予約承認', 'mentor'),
    ('perm_mentor_view_reservations', '予約管理', 'mentor'),
    ('perm_admin_all', '全権限', 'admin')
ON CONFLICT ("id") DO NOTHING;

-- ===================================
-- 認証ユーザー自動同期システム
-- ===================================

-- 1. 認証ユーザー同期関数の作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
    default_role_id TEXT;
BEGIN
    -- デフォルトロールIDを取得（student）
    SELECT id INTO default_role_id 
    FROM public.roles 
    WHERE name = 'Student' 
    LIMIT 1;
    
    -- デフォルトロールが見つからない場合は'student'を使用
    IF default_role_id IS NULL THEN
        default_role_id := 'student';
    END IF;
    
    -- メタデータから情報を抽出
    user_email := NEW.email;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
    );
    user_image := NEW.raw_user_meta_data->>'avatar_url';
    
    -- public.usersテーブルに挿入または更新
    INSERT INTO public.users (
        id,
        email,
        name,
        image,
        "roleId"
    ) VALUES (
        NEW.id::text,
        user_email,
        user_name,
        user_image,
        default_role_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        image = COALESCE(EXCLUDED.image, users.image)
    WHERE 
        users.email != EXCLUDED.email OR
        users.name IS DISTINCT FROM EXCLUDED.name OR
        users.image IS DISTINCT FROM EXCLUDED.image;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 認証ユーザー更新同期関数の作成
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
BEGIN
    -- メタデータから情報を抽出
    user_email := NEW.email;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        OLD.raw_user_meta_data->>'full_name',
        OLD.raw_user_meta_data->>'name',
        OLD.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
    );
    user_image := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        OLD.raw_user_meta_data->>'avatar_url'
    );
    
    -- public.usersテーブルを更新（既存レコードのみ）
    UPDATE public.users SET
        email = user_email,
        name = COALESCE(user_name, name),
        image = COALESCE(user_image, image)
    WHERE id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガーの作成
-- 新規ユーザー作成時のトリガー
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ユーザー情報更新時のトリガー
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- 4. 既存の認証ユーザーを同期（初回実行時のみ）
DO $$
DECLARE
    auth_user RECORD;
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
    default_role_id TEXT;
    sync_count INTEGER := 0;
BEGIN
    -- デフォルトロールIDを取得
    SELECT id INTO default_role_id 
    FROM public.roles 
    WHERE name = 'Student' 
    LIMIT 1;
    
    IF default_role_id IS NULL THEN
        default_role_id := 'student';
    END IF;
    
    -- 既存の認証ユーザーをループ処理
    FOR auth_user IN 
        SELECT id, email, raw_user_meta_data, email_confirmed_at, created_at
        FROM auth.users
    LOOP
        -- メタデータから情報を抽出
        user_email := auth_user.email;
        user_name := COALESCE(
            auth_user.raw_user_meta_data->>'full_name',
            auth_user.raw_user_meta_data->>'name',
            auth_user.raw_user_meta_data->>'display_name',
            split_part(auth_user.email, '@', 1)
        );
        user_image := auth_user.raw_user_meta_data->>'avatar_url';
        
        -- public.usersテーブルに挿入（重複は無視）
        INSERT INTO public.users (
            id,
            email,
            name,
            image,
            "roleId"
        ) VALUES (
            auth_user.id::text,
            user_email,
            user_name,
            user_image,
            default_role_id
        )
        ON CONFLICT (id) DO NOTHING;
        
        sync_count := sync_count + 1;
    END LOOP;
    
    RAISE NOTICE '既存認証ユーザー同期完了: % 件処理', sync_count;
END $$;

-- 5. 権限設定
-- トリガー関数に必要な権限を付与
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.roles TO anon, authenticated;

-- 6. 動作確認用のテスト関数（開発環境用）
CREATE OR REPLACE FUNCTION public.test_user_sync()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- テスト1: rolesテーブルの確認
    RETURN QUERY
    SELECT 
        'roles_table_check'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM public.roles WHERE name = 'Student') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Student role exists: ' || EXISTS(SELECT 1 FROM public.roles WHERE name = 'Student')::TEXT;
    
    -- テスト2: トリガー関数の存在確認
    RETURN QUERY
    SELECT 
        'trigger_function_check'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'handle_new_user function exists: ' || EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')::TEXT;
    
    -- テスト3: トリガーの存在確認
    RETURN QUERY
    SELECT 
        'trigger_check'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'on_auth_user_created trigger exists: ' || EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')::TEXT;
    
    -- テスト4: 既存ユーザー同期状況
    RETURN QUERY
    SELECT 
        'user_sync_status'::TEXT,
        'INFO'::TEXT,
        'Auth users: ' || (SELECT COUNT(*) FROM auth.users)::TEXT || 
        ', Public users: ' || (SELECT COUNT(*) FROM public.users)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 実行完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '=== 認証ユーザー自動同期システム セットアップ完了 ===';
    RAISE NOTICE '機能:';
    RAISE NOTICE '  - Googleログイン時の自動ユーザー作成';
    RAISE NOTICE '  - 認証情報更新時の同期';
    RAISE NOTICE '  - デフォルトロール（student）の自動設定';
    RAISE NOTICE '  - メタデータからの情報抽出';
    RAISE NOTICE '';
    RAISE NOTICE 'テスト実行: SELECT * FROM public.test_user_sync();';
    RAISE NOTICE '=== セットアップ完了 ===';
END $$; 