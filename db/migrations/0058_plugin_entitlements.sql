-- User portal — plugin_entitlements (P-1 of docs/portal/plan-brief-user-portal-20260717.md).
--
-- The self-owned, email-keyed ownership record for the FREE MUEDsp modules (MUEDsat / MUEDlim / future):
-- "this email has claimed a download → the portal (/dashboard/plugins) shows it + the latest version",
-- so a logged-in user updates from the portal instead of re-fetching an email link (the 定着装置).
--
-- Same shape/doctrine as masterchain_purchases/interest (0057): email-keyed, user_id nullable (the
-- subscribe email-gate is UNAUTHENTICATED — user_id is unknown at write, so the portal matches by the
-- Clerk-verified email). UNIQUE(email, plugin_key) makes a re-subscribe idempotent (onConflictDoNothing).
--
-- PURE ADDITIVE (Tier 2): one new table + its indexes, no change to any existing table. NO backfill in
-- this migration — the existing 250+ leads are backfilled from the Resend audiences in P-3, separately.
--
-- WARNING — DEPLOY ORDER: apply this to PRODUCTION Neon BEFORE the writer (subscribe-handler record)
-- goes live. Pure-additive CREATE TABLE is forward-compatible (old code ignores it), so a code-first
-- merge is still safe, but apply before the writer is exercised in prod. Hand-written like 0050–0057
-- (drizzle-kit journal is stale at 0008). prod apply = kimny (manual psql).

CREATE TABLE IF NOT EXISTS plugin_entitlements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,          -- lower-cased ownership key (portal join key)
  plugin_key  text NOT NULL,          -- 'muedsat' | 'muedlim' | future module
  source      text NOT NULL,          -- capture surface, e.g. 'muedsat_lp'
  first_touch jsonb,                  -- gaClientId + utm* (attribution parity with 0050/0057)
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable (guest; unauth at subscribe)
  created_at  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_plugin_entitlements_email_plugin UNIQUE (email, plugin_key)  -- idempotent re-subscribe
);
CREATE INDEX IF NOT EXISTS idx_plugin_entitlements_email  ON plugin_entitlements (email);
CREATE INDEX IF NOT EXISTS idx_plugin_entitlements_plugin ON plugin_entitlements (plugin_key);
