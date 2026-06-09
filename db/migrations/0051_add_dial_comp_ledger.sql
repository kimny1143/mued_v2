-- Add dial_comp_ledger — audit + idempotency for admin-granted free redo (comp) cycles.
--
-- A comp is an EXCEPTIONAL support remedy (not a default freebie): an admin grants a single
-- free retake cycle on a specific session (additionalCyclesPurchased +1 so the cycle becomes
-- usable for free, + additionalCycleLimit +1 so it doesn't consume the user's purchase headroom).
-- This ledger records every grant (admin, session, estimated RoEx cr cost, reason) and enforces
-- per-session lifetime-1 via a unique index. The admin daily cap (3 / rolling 24h) is enforced in
-- the grant transaction (lib/dial/comp.ts).
--
-- No FK on session_id so the audit trail survives session deletion (same as dial_admin_access_log).
-- Pure additive (CREATE TABLE) — nothing existing changes.
--
-- WARNING — DEPLOY ORDER: apply to PRODUCTION Neon BEFORE merging/deploying the code that writes
-- to it (the comp endpoint). Merge = Vercel auto-deploy, so table-first avoids a missing-table
-- error (lesson from migration 0048 / 0049).
CREATE TABLE IF NOT EXISTS dial_comp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  session_id UUID NOT NULL,
  comp_type TEXT NOT NULL,
  estimated_cr INTEGER NOT NULL,
  reason TEXT,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Per-session lifetime-1: at most one comp per session (DB backstop for the API guard).
CREATE UNIQUE INDEX IF NOT EXISTS dial_comp_ledger_unique_session ON dial_comp_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_dial_comp_ledger_admin ON dial_comp_ledger(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_dial_comp_ledger_granted ON dial_comp_ledger(granted_at);
