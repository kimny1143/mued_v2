-- ================================================
-- Test Database Initialization for pgvector
-- Purpose: Set up pgvector extension and test schema
-- ================================================

-- ========================================
-- 1. Enable pgvector extension
-- ========================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension installation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension failed to install';
  END IF;
END $$;

-- ========================================
-- 2. Create test_embeddings table
-- ========================================

CREATE TABLE IF NOT EXISTS test_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- 3. Create HNSW index for similarity search
-- ========================================

-- HNSW index for cosine similarity
-- Parameters:
--   m = 16: number of bi-directional links (default 16)
--   ef_construction = 64: size of dynamic candidate list (default 64)
CREATE INDEX IF NOT EXISTS idx_test_embeddings_vector
  ON test_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ========================================
-- 4. Create helper functions
-- ========================================

-- Function to calculate cosine similarity
CREATE OR REPLACE FUNCTION cosine_similarity(a VECTOR, b VECTOR)
RETURNS FLOAT AS $$
BEGIN
  RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;

-- Function to find similar embeddings
CREATE OR REPLACE FUNCTION find_similar_embeddings(
  query_embedding VECTOR,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.text,
    cosine_similarity(te.embedding, query_embedding) AS similarity,
    te.metadata
  FROM test_embeddings te
  WHERE cosine_similarity(te.embedding, query_embedding) >= similarity_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 5. Create test data for verification
-- ========================================

-- Helper function to generate random embeddings
CREATE OR REPLACE FUNCTION generate_random_embedding(dimensions INT DEFAULT 1536)
RETURNS VECTOR AS $$
DECLARE
  result FLOAT[];
  i INT;
BEGIN
  result := ARRAY[]::FLOAT[];
  FOR i IN 1..dimensions LOOP
    result := array_append(result, random());
  END LOOP;
  RETURN result::VECTOR;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Insert sample test data (5 records)
INSERT INTO test_embeddings (text, embedding, metadata)
VALUES
  (
    'Dメジャーのコード進行を練習しました',
    generate_random_embedding(1536),
    '{"focus": "harmony", "level": "beginner"}'::JSONB
  ),
  (
    'リズムパターンの練習をしました',
    generate_random_embedding(1536),
    '{"focus": "rhythm", "level": "intermediate"}'::JSONB
  ),
  (
    'メロディーラインを作曲しました',
    generate_random_embedding(1536),
    '{"focus": "melody", "level": "advanced"}'::JSONB
  ),
  (
    'ミキシングのバランスを調整しました',
    generate_random_embedding(1536),
    '{"focus": "mix", "level": "intermediate"}'::JSONB
  ),
  (
    '曲の構成を考えました',
    generate_random_embedding(1536),
    '{"focus": "structure", "level": "beginner"}'::JSONB
  );

-- ========================================
-- 6. Create updated_at trigger function
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. Add table comments
-- ========================================

COMMENT ON TABLE test_embeddings IS 'Test table for pgvector integration tests';
COMMENT ON COLUMN test_embeddings.embedding IS 'OpenAI text-embedding-ada-002 vector (1536 dimensions)';
COMMENT ON FUNCTION cosine_similarity IS 'Calculate cosine similarity between two vectors (returns 0-1)';
COMMENT ON FUNCTION find_similar_embeddings IS 'Find similar embeddings using cosine similarity';

-- ========================================
-- 8. Analyze table for query optimization
-- ========================================

ANALYZE test_embeddings;

-- ========================================
-- 9. Create rag_embeddings table (for integration tests)
-- ========================================

-- Production table used by RAGService
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('session', 'template')),
  source_id UUID NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small' NOT NULL,
  embedding_hash TEXT,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Partial indexes for source type filtering
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_session
  ON rag_embeddings(source_id, created_at DESC)
  WHERE source_type = 'session';

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_metadata
  ON rag_embeddings USING GIN (metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::JSONB;

-- ========================================
-- 10. Create question_templates table (for integration tests)
-- ========================================

CREATE TABLE IF NOT EXISTS question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus TEXT NOT NULL,
  depth TEXT NOT NULL,
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::JSONB,
  category TEXT,
  language TEXT DEFAULT 'ja',
  tags TEXT[],
  priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for template retrieval
CREATE INDEX IF NOT EXISTS idx_question_templates_focus_depth
  ON question_templates(focus, depth, priority);

-- ========================================
-- 11. Create session-related tables (Phase 2)
-- ========================================

-- Create ENUM types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    CREATE TYPE session_type AS ENUM ('composition', 'practice', 'mix', 'ear_training', 'listening', 'theory', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_focus') THEN
    CREATE TYPE interview_focus AS ENUM ('harmony', 'melody', 'rhythm', 'mix', 'emotion', 'image', 'structure');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_depth') THEN
    CREATE TYPE interview_depth AS ENUM ('shallow', 'medium', 'deep');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('draft', 'interviewing', 'completed', 'archived');
  END IF;
END $$;

-- Create users table (matching app schema)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  profile_image_url TEXT,
  bio TEXT,
  skills JSONB,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type session_type NOT NULL,
  status session_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  project_id UUID,
  project_name TEXT,
  user_short_note TEXT NOT NULL,
  daw_meta JSONB DEFAULT '{}'::JSONB,
  ai_annotations JSONB DEFAULT '{}'::JSONB,
  attachments JSONB DEFAULT '[]'::JSONB,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_with_mentor BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Create session_analyses table
CREATE TABLE IF NOT EXISTS session_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  analysis_version TEXT NOT NULL DEFAULT 'mvp-1.0',
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_analyses_session ON session_analyses(session_id);

-- Create interview_questions table
CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  focus interview_focus NOT NULL,
  depth interview_depth NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  generated_by TEXT DEFAULT 'ai',
  template_id TEXT,
  rag_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_session ON interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_session_order ON interview_questions(session_id, "order");

-- Create interview_answers table
CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  ai_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interview_answers_session ON interview_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_answers_question ON interview_answers(question_id);

-- ========================================
-- Initialization complete
-- ========================================
