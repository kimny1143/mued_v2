-- ===================================
-- 認証ユーザー自動同期システム
-- ===================================
-- 
-- このファイルは、Supabase auth.users テーブルと public.users テーブルの
-- 自動同期を行うためのSQL関数とトリガーを定義します。
-- 
-- 機能:
-- 1. Googleログイン時の自動ユーザー作成
-- 2. 認証情報の更新時の同期
-- 3. デフォルトロール（student）の自動設定
-- 4. メタデータからの情報抽出と同期
--
-- 実行タイミング: DBリセット後の初回セットアップ時
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
        "roleId",
        "emailVerified",
        "createdAt",
        "updatedAt"
    ) VALUES (
        NEW.id::text,
        user_email,
        user_name,
        user_image,
        default_role_id,
        CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at
            ELSE NOW()
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        image = COALESCE(EXCLUDED.image, users.image),
        "emailVerified" = CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at
            ELSE users."emailVerified"
        END,
        "updatedAt" = NOW()
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
        image = COALESCE(user_image, image),
        "emailVerified" = CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL 
            THEN NEW.email_confirmed_at
            ELSE "emailVerified"
        END,
        "updatedAt" = NOW()
    WHERE id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 認証ユーザー削除同期関数の作成
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- 関連データの削除（カスケード削除の補完）
    -- 注意: 実際の削除は慎重に行う（データ保持ポリシーに従う）
    
    -- 予約データは履歴として保持し、ユーザー情報のみ匿名化
    UPDATE public.reservations 
    SET "studentId" = NULL 
    WHERE "studentId" = OLD.id;
    
    -- 決済データも履歴として保持
    UPDATE public.payments 
    SET "userId" = NULL 
    WHERE "userId" = OLD.id;
    
    -- メッセージは匿名化
    UPDATE public.messages 
    SET "sender_id" = NULL 
    WHERE "sender_id" = OLD.id;
    
    -- Stripeデータは保持（法的要件のため）
    -- stripe_customers と stripe_user_subscriptions は削除しない
    
    -- 最後にusersレコードを削除
    DELETE FROM public.users WHERE id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. トリガーの作成
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

-- ユーザー削除時のトリガー（オプション）
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_delete();

-- 5. 既存の認証ユーザーを同期（初回実行時のみ）
-- 注意: この処理は既存のauth.usersデータがある場合にのみ実行される
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
            "roleId",
            "emailVerified",
            "createdAt",
            "updatedAt"
        ) VALUES (
            auth_user.id::text,
            user_email,
            user_name,
            user_image,
            default_role_id,
            COALESCE(auth_user.email_confirmed_at, auth_user.created_at),
            auth_user.created_at,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        sync_count := sync_count + 1;
    END LOOP;
    
    RAISE NOTICE '既存認証ユーザー同期完了: % 件処理', sync_count;
END $$;

-- 6. 権限設定
-- トリガー関数に必要な権限を付与
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.roles TO anon, authenticated;

-- 7. 動作確認用のテスト関数（開発環境用）
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