-- stripe_customers テーブルの権限修正
GRANT ALL ON TABLE public.stripe_customers TO authenticated;
GRANT ALL ON TABLE public.stripe_customers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.stripe_customers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.stripe_customers_id_seq TO service_role;

-- stripe_user_subscriptions テーブルの権限修正  
GRANT ALL ON TABLE public.stripe_user_subscriptions TO authenticated;
GRANT ALL ON TABLE public.stripe_user_subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.stripe_user_subscriptions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.stripe_user_subscriptions_id_seq TO service_role;

-- RLSを無効化（開発環境のみ）
ALTER TABLE public.stripe_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_user_subscriptions DISABLE ROW LEVEL SECURITY; 