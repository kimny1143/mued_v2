-- Migration: Credit rollover policy
-- 1. Make dial_credit_expiry.expires_at nullable (NULL = no expiry while subscribed)
-- 2. Add expires_at to dial_credit_packs (12-month expiry)
-- 3. Remove expiry from existing active subscriber grants

-- 1. Make expires_at nullable on dial_credit_expiry
ALTER TABLE "dial_credit_expiry"
  ALTER COLUMN "expires_at" DROP NOT NULL;

-- 2. Add expires_at column to dial_credit_packs
ALTER TABLE "dial_credit_packs"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp;

-- 3. Remove expiry from existing grants belonging to active subscriptions
--    (existing grants that haven't expired yet get unlimited rollover)
UPDATE "dial_credit_expiry" ce
SET "expires_at" = NULL
FROM "dial_subscriptions" ds
WHERE ce."subscription_id" = ds."id"
  AND ds."status" = 'active'
  AND ce."credits_remaining" > 0
  AND (ce."expires_at" IS NULL OR ce."expires_at" > NOW());
