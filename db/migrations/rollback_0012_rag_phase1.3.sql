-- ================================================
-- Rollback: Phase 1.3 RAG Migrations
-- Rollback migrations: 0012, 0013, 0014
-- Emergency rollback for Phase 1.3
-- Date: 2025-11-20
-- ================================================

-- ========================================
-- 1. Drop RLS policies (migration 0014)
-- ========================================

-- rag_embeddings policies
DROP POLICY IF EXISTS "Users can read own session embeddings" ON rag_embeddings;
DROP POLICY IF EXISTS "All users can read template embeddings" ON rag_embeddings;
DROP POLICY IF EXISTS "Service role full access" ON rag_embeddings;
DROP POLICY IF EXISTS "Users can insert own session embeddings" ON rag_embeddings;

-- question_templates policies
DROP POLICY IF EXISTS "Authenticated users can read enabled templates" ON question_templates;
DROP POLICY IF EXISTS "Admins can read all templates" ON question_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON question_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON question_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON question_templates;
DROP POLICY IF EXISTS "Service role full access to templates" ON question_templates;

-- Disable RLS
ALTER TABLE rag_embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_templates DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. Drop triggers (migration 0013)
-- ========================================

-- question_templates triggers
DROP TRIGGER IF EXISTS trg_increment_template_usage ON interview_questions;
DROP TRIGGER IF EXISTS trg_auto_generate_template_embedding ON question_templates;
DROP TRIGGER IF EXISTS update_question_templates_updated_at ON question_templates;

-- rag_embeddings triggers
DROP TRIGGER IF EXISTS update_rag_embeddings_updated_at ON rag_embeddings;
DROP TRIGGER IF EXISTS trg_validate_rag_embedding_source ON rag_embeddings;

-- ========================================
-- 3. Drop functions (migration 0012, 0013)
-- ========================================

DROP FUNCTION IF EXISTS increment_template_usage();
DROP FUNCTION IF EXISTS auto_generate_template_embedding();
DROP FUNCTION IF EXISTS validate_rag_embedding_source();

-- ========================================
-- 4. Drop views (migration 0012)
-- ========================================

DROP VIEW IF EXISTS v_rag_embeddings_with_source;

-- ========================================
-- 5. Drop foreign key constraint (migration 0013)
-- ========================================

ALTER TABLE interview_questions DROP CONSTRAINT IF EXISTS fk_interview_questions_template;

-- ========================================
-- 6. Drop indexes (migration 0013)
-- ========================================

-- question_templates indexes
DROP INDEX IF EXISTS idx_question_templates_focus_depth;
DROP INDEX IF EXISTS idx_question_templates_priority;
DROP INDEX IF EXISTS idx_question_templates_category;
DROP INDEX IF EXISTS idx_question_templates_analytics;
DROP INDEX IF EXISTS idx_question_templates_fts;
DROP INDEX IF EXISTS idx_question_templates_tags;
DROP INDEX IF EXISTS idx_interview_questions_template;

-- ========================================
-- 7. Drop indexes (migration 0012)
-- ========================================

-- rag_embeddings indexes
DROP INDEX IF EXISTS idx_rag_embeddings_vector;
DROP INDEX IF EXISTS idx_rag_embeddings_session;
DROP INDEX IF EXISTS idx_rag_embeddings_template;
DROP INDEX IF EXISTS idx_rag_embeddings_type_created;
DROP INDEX IF EXISTS idx_rag_embeddings_metadata;

-- ========================================
-- 8. Drop tables (migration 0013, 0012)
-- ========================================

DROP TABLE IF EXISTS question_templates CASCADE;
DROP TABLE IF EXISTS rag_embeddings CASCADE;

-- ========================================
-- 9. Drop pgvector extension (OPTIONAL)
-- ========================================

-- WARNING: Only drop pgvector if no other tables use it
-- DROP EXTENSION IF EXISTS vector CASCADE;

COMMENT ON EXTENSION vector IS 'pgvector extension NOT dropped (may be used by other tables). To drop manually, run: DROP EXTENSION IF EXISTS vector CASCADE;';

-- ========================================
-- 10. Verify rollback
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rag_embeddings') THEN
    RAISE EXCEPTION 'Rollback failed: rag_embeddings table still exists';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'question_templates') THEN
    RAISE EXCEPTION 'Rollback failed: question_templates table still exists';
  END IF;

  RAISE NOTICE 'Phase 1.3 rollback completed successfully';
END $$;

-- ================================================
-- Rollback complete
-- ================================================
