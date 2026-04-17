-- Migration: 0042_bonus_campaign
-- Adds first-purchase bonus campaign infrastructure:
-- 1. New 'bonus' value to dial_credit_pack_size enum
-- 2. source column on dial_credit_packs
-- 3. dial_first_purchase_bonus_granted flag on users
-- 4. dial_bonus_campaign_ledger audit table
-- 5. dial_campaign_state kill-switch table

-- 1. Add 'bonus' to dial_credit_pack_size enum
ALTER TYPE dial_credit_pack_size ADD VALUE IF NOT EXISTS 'bonus';

-- 2. Add source column to dial_credit_packs
ALTER TABLE dial_credit_packs
  ADD COLUMN IF NOT EXISTS source text;

-- 3. Add bonus-granted flag to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS dial_first_purchase_bonus_granted boolean NOT NULL DEFAULT false;

-- 4. Bonus campaign audit ledger (one row per bonus grant)
CREATE TABLE IF NOT EXISTS dial_bonus_campaign_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(clerk_id),
  credit_pack_id uuid NOT NULL REFERENCES dial_credit_packs(id),
  bonus_credits integer NOT NULL,
  estimated_cost_usd numeric(8, 4) NOT NULL,
  granted_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dial_bonus_ledger_user_id
  ON dial_bonus_campaign_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_dial_bonus_ledger_granted_at
  ON dial_bonus_campaign_ledger (granted_at);

-- 5. Campaign runtime state (kill switch + cumulative cost)
CREATE TABLE IF NOT EXISTS dial_campaign_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  cumulative_cost_usd numeric(10, 4) NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Seed the first-purchase bonus campaign row
INSERT INTO dial_campaign_state (campaign_name, enabled, cumulative_cost_usd)
VALUES ('first_purchase_400cr', true, 0)
ON CONFLICT (campaign_name) DO NOTHING;
