-- 0066: news_list_events — every MUEDsp news decision, keyed on email, append-only. PURE ADDITIVE.
-- Why: the Resend list is now a window of the latest 1,000 (kimny 2026-10-30), so it can no longer be the record of who
-- agreed to the news or who withdrew. kimny 「進めて」 (2026-10-30, conductor (a)): the DB holds everyone, old and new;
-- Resend is the daily copy. A future rebuild of the list from this table must leave out whoever never agreed or withdrew.
-- See db/schema/news-list-events.ts for the rebuild rule.
-- PURE ADDITIVE (one new table, nothing else touched); safe to re-run (IF NOT EXISTS).
-- Apply BEFORE the code is deployed:
--   npx tsx scripts/run-sql-migration.ts db/migrations/0066_news_list_events.sql
-- Undo: remove the table — only before any row matters; the withdrawn rows are the only record of those withdrawals.
CREATE TABLE IF NOT EXISTS news_list_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('granted', 'not_granted', 'withdrawn')),
  surface text NOT NULL CHECK (surface IN ('download', 'demo', 'cart', 'unsubscribe_link', 'resend_footer', 'import')),
  product_key text,
  source text,
  locale text,
  occurred_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_list_events_email ON news_list_events (email);
CREATE INDEX IF NOT EXISTS idx_news_list_events_recorded_at ON news_list_events (recorded_at);

COMMENT ON TABLE news_list_events IS 'Append-only: each MUEDsp news checkbox answer and each withdrawal, by email. No row before 2026-10-30 = unknown (the forms before then are not recorded here).';
COMMENT ON COLUMN news_list_events.status IS 'granted = ticked the news checkbox; not_granted = submitted without ticking it; withdrawn = asked to stop the news.';
COMMENT ON COLUMN news_list_events.surface IS 'Where it happened: download (free three), demo, cart (FastSpring order), unsubscribe_link (our one-click / footer link), resend_footer (found unsubscribed in Resend by the list trim), import (backfill).';
COMMENT ON COLUMN news_list_events.occurred_at IS 'When it really happened. NULL = not known (resend_footer and import: Resend does not give the unsubscribe time).';
COMMENT ON COLUMN news_list_events.recorded_at IS 'When this row was written (for import: the export time).';
