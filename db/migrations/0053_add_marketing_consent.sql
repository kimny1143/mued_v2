-- Self-owned marketing list (product課 handoff docs/handoff-self-owned-list-impl-mued-20260611).
--
-- Two layers, all PURE ADDITIVE (Tier 2):
--  (A) users.marketing_consent / marketing_consent_at — de-normalized CURRENT value for fast list
--      extraction (WHERE marketing_consent = true). Nullable; existing rows stay NULL (no backfill,
--      first_touch 0050 同型).
--  (B) marketing_consents — append-only event ledger (who / when / which policy version / where) for
--      APPI/GDPR consent-management auditability. The current value above is the de-normalized view.
--
-- WARNING — DEPLOY ORDER (PR1 #1 risk): apply this to PRODUCTION Neon BEFORE merging/deploying the
-- code that reads/writes these. Merge = Vercel auto-deploy, so code-first would hit a missing column
-- (42703 undefined_column) = prod outage. Pure-additive is forward-compatible: migration-first is safe
-- (old code ignores the new column/table); reverse order is the Yuu-class outage. Lesson: migration
-- 0048 / PR#426 (2026-06-09). drizzle-kit generate is unusable here (journal stale at 0008; 0044+ are
-- hand-applied), so this is hand-written like 0050–0052.

-- (A) de-normalized current value on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent boolean;          -- null=not shown / true=opted-in / false=declined or withdrawn
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_at timestamp;     -- last change time of the current value

-- (B) append-only consent event ledger
CREATE TABLE IF NOT EXISTS marketing_consents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel        text NOT NULL DEFAULT 'email',   -- future: LINE, etc.
  status         text NOT NULL,                   -- 'granted' | 'withdrawn'
  policy_version text NOT NULL,                    -- privacy policy version at consent time
  locale         text NOT NULL,                    -- 'ja' | 'en' (language the copy was shown in)
  source         text NOT NULL,                    -- 'free15_claim' | 'onboarding' | 'settings' | 'import'
  created_at     timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_consents_user ON marketing_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_consents_status ON marketing_consents(status);
