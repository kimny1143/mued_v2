-- Migration: MUEDial Subscription v2
-- Adds credit-based subscription system with 3 tiers (basic/pro/studio),
-- credit packs, and credit expiry tracking.

-- 1. Update dial_sub_tier enum: add new values
-- PostgreSQL doesn't allow removing enum values, so we add new ones
-- and handle old values at the application level.
ALTER TYPE "dial_sub_tier" ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE "dial_sub_tier" ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE "dial_sub_tier" ADD VALUE IF NOT EXISTS 'studio';

-- 1b. Migrate existing records from old tier values to new ones
UPDATE "dial_subscriptions" SET "tier" = 'basic' WHERE "tier" = 'monthly_5';
UPDATE "dial_subscriptions" SET "tier" = 'studio' WHERE "tier" = 'studio_15';

-- 2. Create credit pack size enum
DO $$ BEGIN
  CREATE TYPE "dial_credit_pack_size" AS ENUM ('small', 'large');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Add customer_country to dial_purchases
ALTER TABLE "dial_purchases"
  ADD COLUMN IF NOT EXISTS "customer_country" text;

-- 4. Add customer_country to dial_subscriptions
ALTER TABLE "dial_subscriptions"
  ADD COLUMN IF NOT EXISTS "customer_country" text;

-- 5. Create dial_credit_packs table
CREATE TABLE IF NOT EXISTS "dial_credit_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("clerk_id"),
  "pack_size" "dial_credit_pack_size" NOT NULL,
  "credits" integer NOT NULL,
  "credits_remaining" integer NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'usd',
  "customer_country" text,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "status" "dial_purchase_status" NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_dial_credit_packs_user_id"
  ON "dial_credit_packs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_dial_credit_packs_status"
  ON "dial_credit_packs" ("status");

-- 6. Create dial_credit_expiry table
CREATE TABLE IF NOT EXISTS "dial_credit_expiry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subscription_id" uuid NOT NULL REFERENCES "dial_subscriptions"("id") ON DELETE CASCADE,
  "credits" integer NOT NULL,
  "credits_remaining" integer NOT NULL,
  "granted_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_dial_credit_expiry_sub_id"
  ON "dial_credit_expiry" ("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_dial_credit_expiry_expires_at"
  ON "dial_credit_expiry" ("expires_at");
