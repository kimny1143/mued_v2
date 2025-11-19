-- ================================================
-- Rollback Migration: 0010_add_sessions_phase2
-- Removes Session/Interview system tables and types
-- Date: 2025-11-19
-- ================================================

-- ========================================
-- WARNING: This will permanently delete all session data
-- ========================================

BEGIN;

-- ========================================
-- 1. Drop views
-- ========================================

DROP VIEW IF EXISTS v_public_sessions CASCADE;
DROP VIEW IF EXISTS v_interview_qa_pairs CASCADE;
DROP VIEW IF EXISTS v_session_details CASCADE;
DROP VIEW IF EXISTS v_sessions_with_user CASCADE;

-- ========================================
-- 2. Drop triggers
-- ========================================

DROP TRIGGER IF EXISTS update_interview_answers_updated_at ON interview_answers;
DROP TRIGGER IF EXISTS update_session_analyses_updated_at ON session_analyses;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;

-- ========================================
-- 3. Drop indexes
-- ========================================

-- Session analyses indexes
DROP INDEX IF EXISTS idx_session_analyses_data_gin;
DROP INDEX IF EXISTS idx_session_analyses_session;

-- Interview answers indexes
DROP INDEX IF EXISTS idx_interview_answers_session_question;
DROP INDEX IF EXISTS idx_interview_answers_question;
DROP INDEX IF EXISTS idx_interview_answers_session;

-- Interview questions indexes
DROP INDEX IF EXISTS idx_interview_questions_focus;
DROP INDEX IF EXISTS idx_interview_questions_session_order;
DROP INDEX IF EXISTS idx_interview_questions_session;

-- Sessions indexes
DROP INDEX IF EXISTS idx_sessions_ai_annotations_gin;
DROP INDEX IF EXISTS idx_sessions_daw_meta_gin;
DROP INDEX IF EXISTS idx_sessions_project;
DROP INDEX IF EXISTS idx_sessions_public;
DROP INDEX IF EXISTS idx_sessions_user_status;
DROP INDEX IF EXISTS idx_sessions_user_created;
DROP INDEX IF EXISTS idx_sessions_status;
DROP INDEX IF EXISTS idx_sessions_type;
DROP INDEX IF EXISTS idx_sessions_user;

-- ========================================
-- 4. Drop tables (in reverse dependency order)
-- ========================================

DROP TABLE IF EXISTS interview_answers CASCADE;
DROP TABLE IF EXISTS interview_questions CASCADE;
DROP TABLE IF EXISTS session_analyses CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- ========================================
-- 5. Drop ENUM types
-- ========================================

DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS interview_depth CASCADE;
DROP TYPE IF EXISTS interview_focus CASCADE;
DROP TYPE IF EXISTS session_type CASCADE;

-- ========================================
-- Rollback complete
-- ========================================

COMMIT;
