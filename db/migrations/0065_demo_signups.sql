-- 0065: demo_signups — demo sign-ups (masterchain, MUEDvox) recorded in our own DB. PURE ADDITIVE.
-- Why: after the Resend marketing plan was cancelled (2026-10-27) the list is past the free tier's limit, and the demo
-- entrance wrote the address nowhere else (kimny 「直そう。」). See db/schema/demo-signups.ts.
-- PURE ADDITIVE (one new table, nothing else touched); safe to re-run (IF NOT EXISTS).
-- Apply BEFORE the code is deployed:
--   psql "$DATABASE_URL" -f db/migrations/0065_demo_signups.sql
-- Undo: remove the table — only before any row matters; the rows are the only record of these sign-ups.
CREATE TABLE IF NOT EXISTS demo_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product_key text NOT NULL,
  source text NOT NULL,
  locale text,
  first_touch jsonb,
  news_notice_shown boolean NOT NULL,
  audience_added boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_demo_signups_email_product UNIQUE (email, product_key)
);
CREATE INDEX IF NOT EXISTS idx_demo_signups_email ON demo_signups (email);

COMMENT ON TABLE demo_signups IS 'Who asked for a paid product demo (masterchain, MUEDvox). Not an entitlement; the portal does not read it.';
COMMENT ON COLUMN demo_signups.source IS 'The page the demo form was on (muedsp_lp = /muedsp for masterchain, muedvox_lp = /muedvox).';
COMMENT ON COLUMN demo_signups.audience_added IS 'Whether the Resend list add succeeded at sign-up time (false = the list is missing this person).';
COMMENT ON COLUMN demo_signups.news_notice_shown IS 'The form told the person the address is used for MUEDsp news (kimny 2026-10-04: tell and send).';
