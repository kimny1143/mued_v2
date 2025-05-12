-- サブスクリプション関連の権限とRLSポリシーを修正

-- 既存のポリシーを一旦削除（安全に行うための条件チェック付き）
DO $$
BEGIN
  -- すべての既存ポリシーを削除
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON stripe_user_subscriptions;', E'\n')
    FROM pg_policies
    WHERE tablename = 'stripe_user_subscriptions'
  );
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'ポリシー削除中にエラーが発生しましたが続行します: %', SQLERRM;
END $$;

-- RLS確実に有効化
ALTER TABLE IF EXISTS stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- anon, authenticated, service_roleに対して明示的に権限付与
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE stripe_user_subscriptions TO service_role;
GRANT SELECT ON TABLE stripe_user_subscriptions TO anon, authenticated;

-- RLSポリシーの作成（ユーザーは自分のデータのみ閲覧可能）
CREATE POLICY "ユーザーは自分のサブスクリプションのみ閲覧可能" 
ON stripe_user_subscriptions FOR SELECT 
TO anon, authenticated
USING ("userId"::text = auth.uid()::text);

-- 管理者（service_role）は全操作可能
CREATE POLICY "管理者は全操作可能" 
ON stripe_user_subscriptions FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- テーブルが存在しない場合に備えて安全に関数を作成
DROP FUNCTION IF EXISTS public.get_subscription_by_user_id(text);

-- サブスクリプション取得関数
CREATE OR REPLACE FUNCTION public.get_subscription_by_user_id(user_id TEXT)
RETURNS TABLE (
  id BIGINT,
  "userId" TEXT,
  "customerId" TEXT,
  "subscriptionId" TEXT,
  "priceId" TEXT,
  status TEXT,
  "currentPeriodStart" BIGINT,
  "currentPeriodEnd" BIGINT,
  "cancelAtPeriodEnd" BOOLEAN,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s."userId", 
    s."customerId", 
    s."subscriptionId", 
    s."priceId", 
    s.status, 
    s."currentPeriodStart", 
    s."currentPeriodEnd",
    s."cancelAtPeriodEnd",
    s."createdAt",
    s."updatedAt"
  FROM public.stripe_user_subscriptions s
  WHERE s."userId"::text = user_id::text
  LIMIT 1;
END;
$$;

-- 関数に対する権限付与
GRANT EXECUTE ON FUNCTION public.get_subscription_by_user_id(text) TO anon, authenticated, service_role;

-- デバッグ用関数
DROP FUNCTION IF EXISTS public.debug_get_subscription(text);

CREATE OR REPLACE FUNCTION public.debug_get_subscription(user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'subscription', (
      SELECT row_to_json(s)
      FROM public.stripe_user_subscriptions s
      WHERE s."userId"::text = user_id::text
      LIMIT 1
    ),
    'user_id', user_id,
    'timestamp', now(),
    'source', 'debug_function'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- デバッグ関数に対する権限付与
GRANT EXECUTE ON FUNCTION public.debug_get_subscription(text) TO anon, authenticated, service_role; 