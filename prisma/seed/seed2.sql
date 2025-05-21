-- auth.usersからpublic.usersへの同期を行うトリガー関数
-- すべてのユーザーはデフォルトで生徒ロールとなります

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();

-- 新規ユーザー作成時のトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    student_role_id UUID;
BEGIN
    -- デフォルトの生徒ロールIDを取得
    SELECT id INTO student_role_id FROM public.roles WHERE name = 'Student';
    
    -- public.usersテーブルに挿入
    INSERT INTO public.users (id, email, name, "roleId")
    VALUES (
        NEW.id::text, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
        student_role_id
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー情報更新時のトリガー関数
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET 
        email = NEW.email,
        name = COALESCE(
            NEW.raw_user_meta_data->>'name', 
            NEW.raw_user_meta_data->>'full_name', 
            public.users.name, 
            NEW.email
        )
    WHERE id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新規ユーザー作成時のトリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ユーザー情報更新時のトリガー
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 既存のauth.usersのデータをpublic.usersに同期
DO $$
DECLARE
    student_role_id UUID;
BEGIN
    -- デフォルトの生徒ロールIDを取得
    SELECT id INTO student_role_id FROM public.roles WHERE name = 'Student';
    
    IF student_role_id IS NULL THEN
        RAISE EXCEPTION 'Student role not found. Please run the basic role creation script first to set up roles.';
    END IF;
    
    -- 既存のauth.usersデータをpublic.usersに同期
    INSERT INTO public.users (id, email, name, "roleId")
    SELECT 
        au.id::text,
        au.email,
        COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', au.email),
        student_role_id
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id::text = pu.id
    WHERE pu.id IS NULL; -- まだpublic.usersに存在しないユーザーのみ
    
    RAISE NOTICE '% 件のユーザーを同期しました', FOUND;
END $$;

-- 同期結果の確認
SELECT 'Auth ユーザー数: ' || COUNT(*) FROM auth.users;
SELECT 'Public ユーザー数: ' || COUNT(*) FROM public.users;

COMMIT; 