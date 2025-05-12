-- さらに修正されたバージョン: サービスロールに完全な権限を付与

-- 既存の関数を削除
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
GRANT ALL ON stripe_user_subscriptions TO service_role;
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_subscriptions TO anon;

-- テーブルの PRIMARY KEY が userId になっているか確認
ALTER TABLE stripe_user_subscriptions 
DROP CONSTRAINT IF EXISTS stripe_user_subscriptions_pkey;

-- PRIMARY KEY が存在しない場合は、id を PRIMARY KEY として作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'stripe_user_subscriptions'::regclass AND contype = 'p'
  ) THEN
    -- id フィールドが存在するか確認
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stripe_user_subscriptions' AND column_name = 'id'
    ) THEN
      -- id を PRIMARY KEY に設定
      ALTER TABLE stripe_user_subscriptions 
      ADD CONSTRAINT stripe_user_subscriptions_pkey PRIMARY KEY (id);
    END IF;
  END IF;
END $$;

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