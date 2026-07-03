-- Advisory storefront #8 — pre-consult intake question (Chief proposal, kimny-approved).
--
-- Adds ONE nullable column to advisory_inquiries (the single KPI store for both lanes). The LP
-- booking modal asks "いま一番手間を食っている仕事はなんですか？（一言でOK）" and requires it
-- client-side; the column is nullable at the DB so the inquiry lane and any pre-existing rows stay
-- valid. insight課 reads this as qualitative segmentation alongside the existing counts.
--
-- PURE ADDITIVE (Tier 2): a single nullable ADD COLUMN, no backfill, no constraint change.
--
-- WARNING — DEPLOY ORDER: apply this to PRODUCTION Neon BEFORE merging/deploying the code that
-- writes pain_point. Merge = Vercel auto-deploy, so code-first would hit a missing column (42703
-- undefined_column). Pure-additive is forward-compatible: migration-first is safe (old code ignores
-- the new column). Hand-written like 0050–0055 (drizzle-kit journal is stale at 0008).

ALTER TABLE advisory_inquiries ADD COLUMN IF NOT EXISTS pain_point text;  -- pre-consult "biggest time-sink" answer; nullable (required only in the LP modal)
