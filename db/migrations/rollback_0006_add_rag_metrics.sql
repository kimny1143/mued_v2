-- Rollback script for 0002_add_rag_metrics
-- WARNING: This will delete all RAG metrics data
-- Created: 2025-10-29

BEGIN;

-- Step 1: Drop foreign key constraints (if exists from 0004 migration)
ALTER TABLE ai_dialogue_log DROP CONSTRAINT IF EXISTS fk_ai_dialogue_user;
ALTER TABLE provenance DROP CONSTRAINT IF EXISTS fk_provenance_content;
ALTER TABLE provenance DROP CONSTRAINT IF EXISTS fk_provenance_acquired_by;

-- Step 2: Drop triggers
DROP TRIGGER IF EXISTS update_ai_dialogue_log_updated_at ON ai_dialogue_log;
DROP TRIGGER IF EXISTS update_provenance_updated_at ON provenance;
DROP TRIGGER IF EXISTS update_plugin_registry_updated_at ON plugin_registry;

-- Step 3: Drop tables (cascade to remove dependent objects)
DROP TABLE IF EXISTS plugin_registry CASCADE;
DROP TABLE IF EXISTS rag_metrics_history CASCADE;
DROP TABLE IF EXISTS provenance CASCADE;

-- Step 4: Remove extended columns from ai_dialogue_log
-- Note: This preserves the base table for future re-migration
ALTER TABLE ai_dialogue_log
  DROP COLUMN IF EXISTS citations,
  DROP COLUMN IF EXISTS latency_ms,
  DROP COLUMN IF EXISTS token_cost_jpy,
  DROP COLUMN IF EXISTS citation_rate,
  DROP COLUMN IF EXISTS prompt_tokens,
  DROP COLUMN IF EXISTS completion_tokens,
  DROP COLUMN IF EXISTS total_tokens,
  DROP COLUMN IF EXISTS relevance_score,
  DROP COLUMN IF EXISTS user_feedback,
  DROP COLUMN IF EXISTS context_window_size,
  DROP COLUMN IF EXISTS temperature;

-- Step 5: Drop indexes added by 0003 migration (if exists)
DROP INDEX IF EXISTS idx_ai_dialogue_user_created;
DROP INDEX IF EXISTS idx_provenance_expiring;
DROP INDEX IF EXISTS idx_rag_metrics_date_unique;
DROP INDEX IF EXISTS idx_plugin_enabled_healthy;

-- Step 6: Drop enums
DROP TYPE IF EXISTS license_type CASCADE;
DROP TYPE IF EXISTS acquisition_method CASCADE;
DROP TYPE IF EXISTS content_type CASCADE;

-- Step 7: Drop function (only if no other triggers use it)
-- Note: Check before dropping in production
-- DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;

-- Verification queries
DO $$
DECLARE
  dialogue_count INTEGER;
  provenance_exists BOOLEAN;
BEGIN
  -- Check ai_dialogue_log still exists with base columns
  SELECT COUNT(*) INTO dialogue_count FROM ai_dialogue_log;
  RAISE NOTICE 'ai_dialogue_log records remaining: %', dialogue_count;

  -- Check provenance table no longer exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'provenance'
  ) INTO provenance_exists;

  IF provenance_exists THEN
    RAISE WARNING 'Rollback incomplete: provenance table still exists';
  ELSE
    RAISE NOTICE 'Rollback successful: provenance table removed';
  END IF;
END $$;
