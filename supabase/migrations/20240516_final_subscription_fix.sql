-- 最終的なサブスクリプション修正スクリプト：PL/pgSQLを使用して安全に適用

-- すべての既存ポリシーを削除するブロック
DO $$
BEGIN
  -- すべてのポリシーをドロップする動的SQL
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON stripe_user_subscriptions;', E'\n')
    FROM pg_policies
    WHERE tablename = 'stripe_user_subscriptions'
  );
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'ポリシー削除中にエラーが発生しましたが、処理を続行します: %', SQLERRM;
END $$;

-- RLSを有効化
ALTER TABLE stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 必要な権限を付与
GRANT ALL ON stripe_user_subscriptions TO service_role;
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_subscriptions TO anon;

-- 動的にポリシーを作成
DO $$
DECLARE
  admin_policy_exists boolean;
  user_policy_exists boolean;
BEGIN
  -- 管理者ポリシーの存在確認
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_user_subscriptions' 
    AND policyname = 'admin_full_access'
  ) INTO admin_policy_exists;
  
  -- ユーザーポリシーの存在確認
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_user_subscriptions' 
    AND policyname = 'users_view_own'
  ) INTO user_policy_exists;
  
  -- 管理者ポリシーが存在しない場合のみ作成
  IF NOT admin_policy_exists THEN
    EXECUTE 'CREATE POLICY admin_full_access ON stripe_user_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true)';
    RAISE NOTICE 'admin_full_access ポリシーを作成しました';
  ELSE
    RAISE NOTICE 'admin_full_access ポリシーはすでに存在します';
  END IF;
  
  -- ユーザーポリシーが存在しない場合のみ作成
  IF NOT user_policy_exists THEN
    EXECUTE 'CREATE POLICY users_view_own ON stripe_user_subscriptions FOR SELECT TO authenticated USING (auth.uid()::text = "userId"::text)';
    RAISE NOTICE 'users_view_own ポリシーを作成しました';
  ELSE
    RAISE NOTICE 'users_view_own ポリシーはすでに存在します';
  END IF;
END $$;

-- ユニーク制約の設定
DO $$
BEGIN
  -- ユニーク制約を確認して存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stripe_user_subscriptions_userid_unique'
  ) THEN
    ALTER TABLE stripe_user_subscriptions 
    ADD CONSTRAINT stripe_user_subscriptions_userid_unique UNIQUE ("userId");
    RAISE NOTICE 'ユニーク制約を追加しました';
  ELSE
    RAISE NOTICE 'ユニーク制約はすでに存在します';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE '制約設定中にエラーが発生しましたが、処理を続行します: %', SQLERRM;
END $$;

-- 既存の関数を削除
DROP FUNCTION IF EXISTS get_subscription_by_user_id(text);
DROP FUNCTION IF EXISTS debug_get_subscription_for_user(text);

-- サブスクリプション取得関数を作成
CREATE OR REPLACE FUNCTION get_subscription_by_user_id(user_id TEXT)
RETURNS TABLE (
  id BIGINT,
  "userId" TEXT,
  "customerId" TEXT,
  "subscriptionId" TEXT,
  "priceId" TEXT,
  status TEXT,
  "currentPeriodStart" BIGINT,
  "currentPeriodEnd" BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, 
    "userId", 
    "customerId", 
    "subscriptionId", 
    "priceId", 
    status, 
    "currentPeriodStart", 
    "currentPeriodEnd"
  FROM stripe_user_subscriptions 
  WHERE "userId"::text = user_id::text
  LIMIT 1;
$$;

-- デバッグ用関数
CREATE OR REPLACE FUNCTION debug_get_subscription_for_user(user_id TEXT)
RETURNS TABLE (
  id BIGINT,
  "userId" TEXT,
  "customerId" TEXT,
  "subscriptionId" TEXT,
  "priceId" TEXT,
  status TEXT,
  "currentPeriodStart" BIGINT,
  "currentPeriodEnd" BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, 
    "userId", 
    "customerId", 
    "subscriptionId", 
    "priceId", 
    status, 
    "currentPeriodStart", 
    "currentPeriodEnd"
  FROM stripe_user_subscriptions 
  WHERE "userId"::text = user_id::text
  LIMIT 1;
$$; 