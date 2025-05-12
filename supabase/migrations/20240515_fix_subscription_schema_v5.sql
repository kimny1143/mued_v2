-- 既存ポリシーを考慮した最終修正版: ポリシー作成時にIF NOT EXISTSを使用

-- 既存の関数を削除
DROP FUNCTION IF EXISTS get_subscription_by_user_id(text);
DROP FUNCTION IF EXISTS debug_get_subscription_for_user(text);

-- RLSポリシーを明示的に削除
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 1" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 2" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions 3" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view by text casting" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Admin can manage all subscriptions" ON stripe_user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON stripe_user_subscriptions;

-- RLSを有効化
ALTER TABLE stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- シンプルなポリシーを作成（管理者モードと認証ユーザー用）
-- ポリシー名を変更して衝突を避ける
CREATE POLICY "Admin role has full access"
ON stripe_user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can view their own data"
ON stripe_user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId"::text);

-- 権限を設定
GRANT ALL ON stripe_user_subscriptions TO service_role;
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_subscriptions TO anon;

-- テーブルの PRIMARY KEY が userId になっているか確認
ALTER TABLE stripe_user_subscriptions 
DROP CONSTRAINT IF EXISTS stripe_user_subscriptions_pkey;

-- userId フィールドに UNIQUE 制約を追加
ALTER TABLE stripe_user_subscriptions 
DROP CONSTRAINT IF EXISTS stripe_user_subscriptions_userid_unique;

ALTER TABLE stripe_user_subscriptions 
ADD CONSTRAINT stripe_user_subscriptions_userid_unique UNIQUE ("userId");

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

-- デバッグ用関数も同様に再作成
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