-- stripe_user_subscriptionsテーブルのビューを作成
-- PrismaのキャメルケースカラムをSupabaseで使用できるようにする

-- 既存のビューを削除（存在する場合）
DROP VIEW IF EXISTS public.stripe_subscriptions_view;

-- 新しいビューを作成
CREATE OR REPLACE VIEW public.stripe_subscriptions_view AS
SELECT 
    id,
    "userId" as user_id,
    "customerId" as customer_id,
    "subscriptionId" as subscription_id,
    "priceId" as price_id,
    status as subscription_status,
    "currentPeriodStart" as current_period_start,
    "currentPeriodEnd" as current_period_end,
    "cancelAtPeriodEnd" as cancel_at_period_end,
    "paymentMethodBrand" as payment_method_brand,
    "paymentMethodLast4" as payment_method_last4,
    "createdAt" as created_at,
    "updatedAt" as updated_at,
    "deletedAt" as deleted_at
FROM public.stripe_user_subscriptions;

-- ビューに権限を付与
GRANT SELECT ON public.stripe_subscriptions_view TO authenticated;
GRANT SELECT ON public.stripe_subscriptions_view TO anon;

-- RLSポリシーを作成（ビューに対して）
ALTER VIEW public.stripe_subscriptions_view SET (security_invoker = on);

-- コメントを追加
COMMENT ON VIEW public.stripe_subscriptions_view IS 'PrismaのキャメルケースカラムをSupabaseのスネークケースに変換するビュー'; 