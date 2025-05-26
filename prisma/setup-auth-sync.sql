-- ===================================
-- 認証ユーザー自動同期システム 単独セットアップ
-- ===================================
-- 
-- このスクリプトは、既存のデータベースに認証同期システムのみを
-- 追加するためのものです。
-- 
-- 実行前提条件:
-- - public.roles テーブルが存在し、'Student' ロールが設定済み
-- - public.users テーブルが存在する
-- 
-- 実行方法:
-- 1. Supabase SQL Editor で実行
-- 2. または psql コマンドで実行
-- ===================================

-- 1. 既存のトリガーと関数をクリーンアップ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();
DROP FUNCTION IF EXISTS public.handle_user_delete();

-- 2. 認証ユーザー同期関数の作成
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
    
    RAISE NOTICE '新規ユーザー同期完了: % (%) - ロール: %', user_name, user_email, default_role_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 認証ユーザー更新同期関数の作成
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
    
    RAISE NOTICE 'ユーザー情報更新同期完了: % (%)', user_name, user_email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. トリガーの作成
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- 5. 既存の認証ユーザーを同期
DO $$
DECLARE
    auth_user RECORD;
    user_name TEXT;
    user_email TEXT;
    user_image TEXT;
    default_role_id TEXT;
    sync_count INTEGER := 0;
    skip_count INTEGER := 0;
BEGIN
    -- デフォルトロールIDを取得
    SELECT id INTO default_role_id 
    FROM public.roles 
    WHERE name = 'Student' 
    LIMIT 1;
    
    IF default_role_id IS NULL THEN
        default_role_id := 'student';
        RAISE NOTICE 'Student ロールが見つからないため、デフォルト値 "student" を使用します';
    END IF;
    
    RAISE NOTICE '既存認証ユーザーの同期を開始します...';
    
    -- 既存の認証ユーザーをループ処理
    FOR auth_user IN 
        SELECT id, email, raw_user_meta_data, email_confirmed_at, created_at
        FROM auth.users
    LOOP
        -- 既に同期済みかチェック（型キャスト追加）
        IF EXISTS(SELECT 1 FROM public.users WHERE id = auth_user.id::text) THEN
            skip_count := skip_count + 1;
            CONTINUE;
        END IF;
        
        -- メタデータから情報を抽出
        user_email := auth_user.email;
        user_name := COALESCE(
            auth_user.raw_user_meta_data->>'full_name',
            auth_user.raw_user_meta_data->>'name',
            auth_user.raw_user_meta_data->>'display_name',
            split_part(auth_user.email, '@', 1)
        );
        user_image := auth_user.raw_user_meta_data->>'avatar_url';
        
        -- public.usersテーブルに挿入（型キャスト追加）
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
        );
        
        sync_count := sync_count + 1;
        RAISE NOTICE '同期完了: % (%)', user_name, user_email;
    END LOOP;
    
    RAISE NOTICE '=== 既存認証ユーザー同期完了 ===';
    RAISE NOTICE '新規同期: % 件', sync_count;
    RAISE NOTICE 'スキップ: % 件 (既存)', skip_count;
    RAISE NOTICE '合計処理: % 件', sync_count + skip_count;
END $$;

-- 6. 権限設定
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.roles TO anon, authenticated;

-- 7. 動作確認用のテスト関数
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
        
    -- テスト5: 同期されていないユーザーの確認
    RETURN QUERY
    SELECT 
        'unsynced_users_check'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id::text = pu.id WHERE pu.id IS NULL) = 0
             THEN 'PASS' ELSE 'WARNING' END::TEXT,
                 'Unsynced users: ' || (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id::text = pu.id WHERE pu.id IS NULL)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. セットアップ完了確認
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    unsynced_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO unsynced_count 
    FROM auth.users au 
    LEFT JOIN public.users pu ON au.id::text = pu.id 
    WHERE pu.id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 認証ユーザー自動同期システム セットアップ完了 ===';
    RAISE NOTICE '';
    RAISE NOTICE '📊 統計情報:';
    RAISE NOTICE '  - 認証ユーザー数: %', auth_count;
    RAISE NOTICE '  - 公開ユーザー数: %', public_count;
    RAISE NOTICE '  - 未同期ユーザー数: %', unsynced_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 実装された機能:';
    RAISE NOTICE '  - Googleログイン時の自動ユーザー作成';
    RAISE NOTICE '  - 認証情報更新時の同期';
    RAISE NOTICE '  - デフォルトロール（student）の自動設定';
    RAISE NOTICE '  - メタデータからの情報抽出';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 動作確認:';
    RAISE NOTICE '  SELECT * FROM public.test_user_sync();';
    RAISE NOTICE '';
    RAISE NOTICE '📝 詳細確認:';
    RAISE NOTICE '  SELECT au.email, pu.name, pu."roleId" FROM auth.users au JOIN public.users pu ON au.id = pu.id;';
    RAISE NOTICE '';
    
    IF unsynced_count > 0 THEN
        RAISE WARNING '⚠️  未同期のユーザーが % 件あります。手動同期が必要な場合があります。', unsynced_count;
    ELSE
        RAISE NOTICE '✅ すべてのユーザーが正常に同期されています。';
    END IF;
    
    RAISE NOTICE '=== セットアップ完了 ===';
END $$; 