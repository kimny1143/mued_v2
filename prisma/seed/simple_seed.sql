-- ============================================================
-- MUED LMS - シンプル版シード（RLSポリシー設定と基本ロール作成）
-- ============================================================

-- UUID生成のための拡張機能有効化（なければ）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- 1. RLSを有効化し、すべてのユーザーに読み取り/書き込みアクセスを許可 ----

-- テーブルごとにRLSを有効化し、全アクセスポリシーを設定
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'users', 'roles', 'permissions', 'lesson_slots', 
        'reservations', 'payments', 'stripe_customers', 
        'stripe_user_subscriptions', 'messages'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- RLS有効化
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        -- 既存のポリシーを削除
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', tbl);
        
        -- 全アクセスポリシーを設定
        EXECUTE format(
            'CREATE POLICY "Enable read access for all users" ON public.%I
             AS PERMISSIVE FOR ALL TO public
             USING (true) WITH CHECK (true)', 
            tbl
        );
        
        RAISE NOTICE 'RLS設定完了: %', tbl;
    END LOOP;
END $$;

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS set_default_role ON public.users;

-- 新しいトリガー関数を作成（DOブロックの外で定義）
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

-- ---- 1.5 新しいカラムがなければ追加 ----

-- Lesson Slots & Reservations テーブルの拡張
DO $$
BEGIN
    -- minDurationカラムの追加 (存在しなければ)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'lesson_slots' 
        AND column_name = 'minDuration'
    ) THEN
        ALTER TABLE public.lesson_slots ADD COLUMN "minDuration" INT DEFAULT 60;
        RAISE NOTICE 'minDurationカラムを追加しました';
    END IF;
    
    -- maxDurationカラムの追加 (存在しなければ)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'lesson_slots' 
        AND column_name = 'maxDuration'
    ) THEN
        ALTER TABLE public.lesson_slots ADD COLUMN "maxDuration" INT DEFAULT 90;
        RAISE NOTICE 'maxDurationカラムを追加しました';
    END IF;
    
    -- durationMinutesカラムの追加 (存在しなければ)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name = 'durationMinutes'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN "durationMinutes" INT DEFAULT 60;
        RAISE NOTICE 'durationMinutesカラムを追加しました';
    END IF;
END $$;


-- ---- 2. 基本ロールのみをUUID形式で作成 ----

-- トランザクション開始
BEGIN;

-- 基本ロールのみをシンプルに作成
DO $$
DECLARE
    admin_role_id UUID;
    mentor_role_id UUID;
    student_role_id UUID;
BEGIN
    -- 古いパーミッションを削除（ロールへの外部キー参照あり）
    DELETE FROM public.permissions;
    
    -- 外部キー制約を一時的に無効化
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_roleId_fkey;
    
    -- 既存のロールを削除
    DELETE FROM public.roles;
    
    -- nameにUNIQUE制約を追加（なければ）
    ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_unique;
    ALTER TABLE public.roles ADD CONSTRAINT roles_name_unique UNIQUE (name);
    
    -- 3つの基本ロールを作成（UUIDで）
    INSERT INTO public.roles (id, name, description)
    VALUES 
        (uuid_generate_v4(), 'Administrator', '管理者権限を持つロール'),
        (uuid_generate_v4(), 'Mentor', '講師権限を持つロール'),
        (uuid_generate_v4(), 'Student', '生徒権限を持つロール');
        
    -- 生成したロールIDを取得
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Administrator';
    SELECT id INTO mentor_role_id FROM public.roles WHERE name = 'Mentor'; 
    SELECT id INTO student_role_id FROM public.roles WHERE name = 'Student';
    
    RAISE NOTICE 'ロールID - 管理者: %, 講師: %, 学生: %', admin_role_id, mentor_role_id, student_role_id;
    
    -- 外部キー制約を再設定
    ALTER TABLE public.users
    ADD CONSTRAINT users_roleId_fkey 
    FOREIGN KEY ("roleId") 
    REFERENCES public.roles(id);
    
    -- トリガーを作成
    CREATE TRIGGER set_default_role
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION set_default_student_role();
    
    -- 基本的な権限を設定
    INSERT INTO public.permissions (id, name, "roleId", "createdAt", "updatedAt")
    VALUES 
        ('1', 'manage_users', admin_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('2', 'create_courses', admin_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('3', 'edit_courses', admin_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('4', 'view_all_reservations', admin_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('5', 'manage_payments', admin_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('6', 'create_slots', mentor_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('7', 'view_own_reservations', mentor_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('8', 'book_lessons', student_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('9', 'view_own_bookings', student_role_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- ---- 3. 結果確認 ----

-- ロール情報を確認
SELECT id, name, description FROM public.roles;

-- トランザクション終了
COMMIT; 