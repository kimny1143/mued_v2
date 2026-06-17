-- MUEDial explicit session state machine (Tier3 Phase 1 — docs/dial/tier3-statemachine-billing-plan-20260617.md).
--
-- Replaces task-inference phase detection (lib/dial/phase.ts detectPhase / isMasteringPhase) with an
-- explicit `state` column on dial_sessions. The 8 states are the canonical workflow phases:
--   uploading → previewing → mix_review → mix_final → mastering_review → mastered_final → settling → delivered
-- `archived` is NOT a phase (it is an orthogonal user action) — it stays on the existing `status` enum,
-- which is retained for the transition window (workflow = `state`; archive/legacy = `status`).
--
-- PURE ADDITIVE (new enum type + new column + index + one-time backfill UPDATE). The column is dormant
-- until the Phase 1 code reads/writes it (old code uses `status`), so it is forward-compatible.
--
-- WARNING — DEPLOY ORDER: apply this to PRODUCTION Neon BEFORE merging/deploying the Phase 1 code that
-- reads/writes `state`. Migration-first is safe (old code ignores the new column); code-first would hit
-- 42703 undefined_column = prod outage (Yuu-class; lesson migration 0048 / PR#426). drizzle-kit generate
-- is unusable (journal stale at 0008; 0044+ hand-applied) — hand-written like 0050–0053.
--
-- Pre-check (safe to run first):
--   SELECT typname FROM pg_type WHERE typname = 'dial_session_state';            -- expect 0 rows before
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'dial_sessions' AND column_name = 'state';              -- expect 0 rows before

DO $$ BEGIN
  CREATE TYPE dial_session_state AS ENUM (
    'uploading',         -- stems uploading
    'previewing',        -- free preview iteration
    'mix_review',        -- MixCheck rendered, reviewing
    'mix_final',         -- mix approved (mix locked)
    'mastering_review',  -- mastering preview, reviewing (free)
    'mastered_final',    -- master approved (220cr committed)
    'settling',          -- download requested, settling unpaid balance
    'delivered'          -- settled, clean deliverable downloadable
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE dial_sessions
  ADD COLUMN IF NOT EXISTS state dial_session_state NOT NULL DEFAULT 'uploading';

CREATE INDEX IF NOT EXISTS idx_dial_sessions_state ON dial_sessions(state);

-- One-time backfill: map existing rows to their phase by inspecting tasks (replicates detectPhase,
-- most-advanced-first). `settling` / `delivered` are NOT inferred (no DL/settlement state existed
-- pre-Tier3), so a previously-delivered session backfills to its render phase (mastered_final /
-- mix_final) — safe (the delivered DL gate is for new sessions; historical rows can still re-download).
-- All rows are backfilled regardless of `status` (incl. archived): `state` reflects phase; the archive
-- flag lives on `status`.
UPDATE dial_sessions s SET state = (CASE
  WHEN EXISTS (SELECT 1 FROM dial_tasks t WHERE t.session_id = s.id AND t.task_type = 'mastering' AND t.final_url IS NOT NULL)
    THEN 'mastered_final'
  WHEN EXISTS (SELECT 1 FROM dial_tasks t WHERE t.session_id = s.id AND t.task_type = 'mastering_preview' AND t.status = 'completed')
    THEN 'mastering_review'
  WHEN EXISTS (SELECT 1 FROM dial_tasks t WHERE t.session_id = s.id AND t.task_type IN ('final_basic','final_advanced') AND t.final_url IS NOT NULL)
    THEN 'mix_final'
  WHEN s.mix_check_count > 0
    THEN 'mix_review'
  WHEN EXISTS (SELECT 1 FROM dial_tasks t WHERE t.session_id = s.id AND t.task_type = 'preview' AND t.status = 'completed')
    THEN 'previewing'
  ELSE 'uploading'
END)::dial_session_state;
