-- 完全に修正された版：既存関数を明示的に削除してから再作成

-- まず既存の関数を削除
DROP FUNCTION IF EXISTS get_subscription_by_user_id(text);
DROP FUNCTION IF EXISTS debug_get_subscription_for_user(text);

-- RLSポリシーをすべて削除して再設定
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 1" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 2" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 3" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view by text casting" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON stripe_user_subscriptions;

-- RLSを有効化
ALTER TABLE stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- シンプルなポリシーを作成（管理者モードと認証ユーザー用）
CREATE POLICY "Admin can manage all subscriptions"
ON stripe_user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own subscriptions"
ON stripe_user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId"::text);

-- 権限を設定
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_subscriptions TO anon;

-- サブスクリプション取得関数を作成（先に削除したのでエラーになりません）
CREATE FUNCTION get_subscription_by_user_id(user_id TEXT)
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

-- デバッグ用関数も同様に再作成
CREATE FUNCTION debug_get_subscription_for_user(user_id TEXT)
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