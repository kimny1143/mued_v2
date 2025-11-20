-- ================================================
-- Migration: 0014_add_rag_rls_policies
-- Phase 1.3: Row-Level Security for RAG Tables
-- Date: 2025-11-20
-- ================================================

-- ========================================
-- 1. Enable RLS on rag_embeddings
-- ========================================

ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. RLS Policies for rag_embeddings
-- ========================================

-- Policy 1: Users can only read embeddings for their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_embeddings' AND policyname = 'Users can read own session embeddings'
  ) THEN
    CREATE POLICY "Users can read own session embeddings"
      ON rag_embeddings
      FOR SELECT
      USING (
        source_type = 'session' AND
        source_id IN (
          SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- Policy 2: All authenticated users can read template embeddings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_embeddings' AND policyname = 'All users can read template embeddings'
  ) THEN
    CREATE POLICY "All users can read template embeddings"
      ON rag_embeddings
      FOR SELECT
      USING (
        source_type = 'template' AND
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

-- Policy 3: Service role has full access (for background jobs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_embeddings' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON rag_embeddings
      FOR ALL
      USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
      );
  END IF;
END $$;

-- Policy 4: Users can insert embeddings for their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rag_embeddings' AND policyname = 'Users can insert own session embeddings'
  ) THEN
    CREATE POLICY "Users can insert own session embeddings"
      ON rag_embeddings
      FOR INSERT
      WITH CHECK (
        source_type = 'session' AND
        source_id IN (
          SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- ========================================
-- 3. Enable RLS on question_templates
-- ========================================

ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. RLS Policies for question_templates
-- ========================================

-- Policy 1: All authenticated users can read enabled templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_templates' AND policyname = 'Authenticated users can read enabled templates'
  ) THEN
    CREATE POLICY "Authenticated users can read enabled templates"
      ON question_templates
      FOR SELECT
      USING (
        enabled = TRUE AND
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

-- Policy 2: Admins can read all templates (including disabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_templates' AND policyname = 'Admins can read all templates'
  ) THEN
    CREATE POLICY "Admins can read all templates"
      ON question_templates
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 3: Admins can insert templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_templates' AND policyname = 'Admins can insert templates'
  ) THEN
    CREATE POLICY "Admins can insert templates"
      ON question_templates
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 4: Admins can update templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_templates' AND policyname = 'Admins can update templates'
  ) THEN
    CREATE POLICY "Admins can update templates"
      ON question_templates
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 5: Admins can delete templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_templates' AND policyname = 'Admins can delete templates'
  ) THEN
    CREATE POLICY "Admins can delete templates"
      ON question_templates
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 6: Service role has full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_templates' AND policyname = 'Service role full access to templates'
  ) THEN
    CREATE POLICY "Service role full access to templates"
      ON question_templates
      FOR ALL
      USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
      );
  END IF;
END $$;

-- ========================================
-- 5. Add comments
-- ========================================

COMMENT ON POLICY "Users can read own session embeddings" ON rag_embeddings IS
  'Users can only access embeddings for sessions they own (data privacy)';

COMMENT ON POLICY "All users can read template embeddings" ON rag_embeddings IS
  'Template embeddings are public knowledge (shared across all users)';

COMMENT ON POLICY "Authenticated users can read enabled templates" ON question_templates IS
  'All logged-in users can read active templates for interview generation';

COMMENT ON POLICY "Admins can insert templates" ON question_templates IS
  'Only admins can create new question templates';

-- ========================================
-- 6. Verify RLS is enabled
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'rag_embeddings' AND rowsecurity = TRUE
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on rag_embeddings';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'question_templates' AND rowsecurity = TRUE
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on question_templates';
  END IF;

  RAISE NOTICE 'RLS successfully enabled on rag_embeddings and question_templates';
END $$;

-- ========================================
-- Migration 0014 complete
-- ========================================
