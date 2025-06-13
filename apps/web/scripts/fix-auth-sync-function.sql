-- ===================================
-- auth.users同期関数の修正
-- Google認証のメタデータからロール情報を取得
-- ===================================

-- 修正版: 新規ユーザー作成時の同期関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
    user_role_name TEXT;
    default_role_id TEXT;
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
    
    -- メタデータからロール情報を取得（開発環境でのテスト用）
    user_role_name := NEW.raw_user_meta_data->>'role';
    
    -- ロール名からrole_idを取得、デフォルトは'student'
    SELECT id INTO default_role_id
    FROM public.roles
    WHERE name = COALESCE(user_role_name, 'student')
    LIMIT 1;
    
    -- role_idが見つからない場合は'student'を使用
    IF default_role_id IS NULL THEN
        SELECT id INTO default_role_id FROM public.roles WHERE name = 'student' LIMIT 1;
    END IF;
    
    -- public.usersテーブルに挿入（カラム名を修正）
    INSERT INTO public.users (
        id, email, name, image, role_id, email_verified
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
        email_verified = COALESCE(EXCLUDED.email_verified, users.email_verified);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 修正版: ユーザー更新時の同期関数
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
        email_verified = CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL 
            THEN NEW.email_confirmed_at
            ELSE email_verified
        END
    WHERE id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 動作確認
DO $$
BEGIN
    RAISE NOTICE '✅ Auth同期関数を修正しました';
    RAISE NOTICE '   - handle_new_user: カラム名を修正（roleId → role_id）';
    RAISE NOTICE '   - handle_new_user: メタデータからロール情報を取得';
    RAISE NOTICE '   - handle_user_update: カラム名を修正（emailVerified → email_verified）';
END $$;