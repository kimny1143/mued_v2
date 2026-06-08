-- Add is_free_campaign flag to dial_sessions.
-- First-run free campaign: marks Stripe-bypass promo grant sessions (RoEx pool funded, capped).
-- Used to bound cost (base_cycle_limit=1), disable reference-track (hidden /mixcomparison cost),
-- and exclude from paid-user counts. See lib/dial/free-campaign.ts.
-- Pure additive column (NOT NULL DEFAULT false) — backward compatible, no backfill needed.
ALTER TABLE dial_sessions ADD COLUMN is_free_campaign BOOLEAN NOT NULL DEFAULT false;

-- Lifetime-1 race safety net: at most one free-campaign grant per user.
-- DB-level backstop on top of the API guard (advisory lock + check). Same pattern
-- as dial_subs_unique_active_per_user (migration 0047).
CREATE UNIQUE INDEX dial_sessions_unique_free_campaign_per_user
  ON dial_sessions (user_id)
  WHERE is_free_campaign = true;
