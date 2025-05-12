-- RLSを有効化
ALTER TABLE stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 1" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 2" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 3" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view by text casting" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON stripe_user_subscriptions;

-- ユーザーポリシー：テキストに明示的にキャスト
CREATE POLICY "Users can view by text casting"
ON stripe_user_subscriptions
FOR SELECT
USING (auth.uid()::text = "userId"::text);

-- サービスロールポリシー
CREATE POLICY "Service role can manage all subscriptions"
ON stripe_user_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- 権限を設定
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_subscriptions TO anon;

-- 既存の関数をドロップ
DROP FUNCTION IF EXISTS get_subscription_by_user_id(uuid);
DROP FUNCTION IF EXISTS get_subscription_by_user_id(text);
DROP FUNCTION IF EXISTS get_subscription_by_user_id_v2(text);
DROP FUNCTION IF EXISTS get_subscription_by_uuid_id(uuid);
DROP FUNCTION IF EXISTS debug_get_subscription_for_user(text);

-- 単純化したRPC関数（すべて明示的なテキストキャスト）
CREATE OR REPLACE FUNCTION get_subscription_by_user_id(user_id TEXT)
RETURNS SETOF stripe_user_subscriptions
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM stripe_user_subscriptions 
  WHERE "userId"::text = user_id::text
  LIMIT 1;
$$;

-- 単純化した別バージョン（診断用）
CREATE OR REPLACE FUNCTION debug_get_subscription_for_user(user_id TEXT)
RETURNS SETOF stripe_user_subscriptions
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM stripe_user_subscriptions 
  WHERE "userId"::text = user_id::text
  LIMIT 1;
$$;
