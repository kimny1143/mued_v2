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