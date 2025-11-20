-- ================================================
-- Migration: 0012_add_rag_embeddings
-- Phase 1.3: RAG Embeddings for Semantic Search
-- Date: 2025-11-20
-- ================================================

-- ========================================
-- 1. Enable pgvector extension
-- ========================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension failed to install';
  END IF;
END $$;

-- ========================================
-- 2. Create rag_embeddings table
-- ========================================

CREATE TABLE IF NOT EXISTS rag_embeddings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('session', 'template')),
  source_id UUID NOT NULL,

  -- Vector embedding
  embedding VECTOR(1536) NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002' NOT NULL,
  embedding_hash TEXT, -- For deduplication
  token_count INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT uq_rag_embeddings_source UNIQUE(source_type, source_id),
  CONSTRAINT uq_rag_embeddings_hash UNIQUE(embedding_hash)
);

-- ========================================
-- 3. Create indexes
-- ========================================

-- HNSW index for vector similarity search (PRIMARY)
-- Using HNSW instead of IVFFlat for Neon PostgreSQL
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Partial indexes for source type filtering
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_session
  ON rag_embeddings(source_id, created_at DESC)
  WHERE source_type = 'session';

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_template
  ON rag_embeddings(source_id)
  WHERE source_type = 'template';

-- Composite index for type-filtered vector search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_type_created
  ON rag_embeddings(source_type, created_at DESC);

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_metadata
  ON rag_embeddings USING GIN (metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::JSONB;

-- ========================================
-- 4. Create validation trigger
-- ========================================

CREATE OR REPLACE FUNCTION validate_rag_embedding_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type = 'session' THEN
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'Invalid source_id: session % does not exist', NEW.source_id;
    END IF;
  ELSIF NEW.source_type = 'template' THEN
    IF NOT EXISTS (SELECT 1 FROM question_templates WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'Invalid source_id: template % does not exist', NEW.source_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_rag_embedding_source
  BEFORE INSERT OR UPDATE ON rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rag_embedding_source();

-- ========================================
-- 5. Create updated_at trigger
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_rag_embeddings_updated_at'
  ) THEN
    CREATE TRIGGER update_rag_embeddings_updated_at
      BEFORE UPDATE ON rag_embeddings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========================================
-- 6. Add table comments
-- ========================================

COMMENT ON TABLE rag_embeddings IS 'Vector embeddings for RAG semantic search (sessions and templates)';
COMMENT ON COLUMN rag_embeddings.source_type IS 'Type of source: session (user log) or template (question template)';
COMMENT ON COLUMN rag_embeddings.source_id IS 'Foreign key to source table (sessions or question_templates)';
COMMENT ON COLUMN rag_embeddings.embedding IS 'OpenAI text-embedding vector (1536 dimensions)';
COMMENT ON COLUMN rag_embeddings.metadata IS 'Additional context: focus area, depth, timestamp, etc.';
COMMENT ON COLUMN rag_embeddings.embedding_model IS 'Model used to generate embedding (for versioning)';
COMMENT ON COLUMN rag_embeddings.embedding_hash IS 'SHA256 hash of input text (for deduplication)';
COMMENT ON COLUMN rag_embeddings.token_count IS 'Number of tokens used for embedding generation (cost tracking)';

-- ========================================
-- 7. Create helper view
-- ========================================

CREATE OR REPLACE VIEW v_rag_embeddings_with_source AS
SELECT
  e.id,
  e.source_type,
  e.source_id,
  e.embedding,
  e.metadata,
  e.embedding_model,
  e.created_at,
  -- Conditionally join source details
  CASE
    WHEN e.source_type = 'session' THEN (
      SELECT jsonb_build_object(
        'title', s.title,
        'user_short_note', s.user_short_note,
        'focus_area', (s.ai_annotations->>'focusArea')
      )
      FROM sessions s WHERE s.id = e.source_id
    )
    WHEN e.source_type = 'template' THEN (
      SELECT jsonb_build_object(
        'template_text', t.template_text,
        'focus', t.focus,
        'depth', t.depth
      )
      FROM question_templates t WHERE t.id = e.source_id
    )
  END AS source_details
FROM rag_embeddings e;

-- ========================================
-- 8. Analyze table
-- ========================================

ANALYZE rag_embeddings;

-- ========================================
-- Migration 0012 complete
-- ========================================
