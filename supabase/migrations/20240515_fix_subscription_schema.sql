-- テーブル構造とデータを修正
ALTER TABLE IF EXISTS stripe_user_subscriptions
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- userId カラムに user_id の値をコピー（すでにデータがある場合）
UPDATE stripe_user_subscriptions
SET "userId" = user_id
WHERE "userId" IS NULL AND user_id IS NOT NULL;

-- 適切なインデックスを作成
CREATE INDEX IF NOT EXISTS idx_stripe_user_subscriptions_userid ON stripe_user_subscriptions ("userId");

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

-- サブスクリプション取得関数を修正
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