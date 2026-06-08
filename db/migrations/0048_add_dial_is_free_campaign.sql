-- Add is_free_campaign flag to dial_sessions.
-- First-run free campaign: marks Stripe-bypass promo grant sessions (RoEx pool funded, capped).
-- Used to bound cost (base_cycle_limit=1), disable reference-track (hidden /mixcomparison cost),
-- and exclude from paid-user counts. See lib/dial/free-campaign.ts.
-- Pure additive column (NOT NULL DEFAULT false) — backward compatible, no backfill needed.
ALTER TABLE dial_sessions ADD COLUMN is_free_campaign BOOLEAN NOT NULL DEFAULT false;
