-- ================================================
-- Migration: 0034_drop_log_entries_and_trial
-- Purpose: Remove Phase 1 log_entries table and trial columns
-- Date: 2026-03-28
-- Context: MUEDnote redesign — production logs removed (Phase 2),
--          trial system removed (v1.1.0 free-ification)
-- ================================================

-- ========================================
-- 1. Drop log_entries views
-- ========================================

DROP VIEW IF EXISTS v_public_logs;
DROP VIEW IF EXISTS v_user_logs_recent;

-- ========================================
-- 2. Drop log_entries trigger (keep function — used by other tables)
-- ========================================

DROP TRIGGER IF EXISTS update_log_entries_updated_at ON log_entries;

-- ========================================
-- 3. Drop log_entries table
-- ========================================

DROP TABLE IF EXISTS log_entries;

-- ========================================
-- 4. Drop log_entries enum types
-- ========================================

DROP TYPE IF EXISTS log_type;
DROP TYPE IF EXISTS target_type;

-- ========================================
-- 5. Drop trial columns from subscriptions
-- ========================================

DROP INDEX IF EXISTS idx_subscriptions_trial_started;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS trial_started_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS trial_used;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS trial_turns_used;
