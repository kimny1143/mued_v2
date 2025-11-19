-- ================================================
-- Migration: 0010_add_sessions_phase2
-- Phase 2: MUEDnote Session/Interview システム
-- AI Interview-driven Composition/Practice Logging
-- Date: 2025-11-19
-- ================================================

-- ========================================
-- 1. Create ENUM types with existence checks
-- ========================================

DO $$
BEGIN
  -- Create session_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    CREATE TYPE session_type AS ENUM (
      'composition',      -- 作曲
      'practice',         -- 練習
      'mix',              -- ミックス
      'ear_training',     -- 耳トレーニング
      'listening',        -- リスニング分析
      'theory',           -- 音楽理論
      'other'             -- その他
    );
  END IF;

  -- Create interview_focus enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_focus') THEN
    CREATE TYPE interview_focus AS ENUM (
      'harmony',          -- 和音・コード進行
      'melody',           -- メロディライン
      'rhythm',           -- リズム・グルーブ
      'mix',              -- ミックス・音響バランス
      'emotion',          -- 感情・表現意図
      'image',            -- 音像・空間イメージ
      'structure'         -- 楽曲構造・展開
    );
  END IF;

  -- Create interview_depth enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_depth') THEN
    CREATE TYPE interview_depth AS ENUM (
      'shallow',   -- 表層的（初心者向け）
      'medium',    -- 中程度（一般的な深さ）
      'deep'       -- 深い（理論的・哲学的）
    );
  END IF;

  -- Create session_status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM (
      'draft',          -- 下書き（作成中）
      'interviewing',   -- インタビュー中
      'completed',      -- 完了
      'archived'        -- アーカイブ済み
    );
  END IF;
END $$;

-- ========================================
-- 2. Create sessions table
-- ========================================

CREATE TABLE IF NOT EXISTS sessions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL,

  -- Session classification
  type session_type NOT NULL,
  status session_status NOT NULL DEFAULT 'draft',

  -- Basic information
  title TEXT NOT NULL,
  project_id UUID,
  project_name TEXT,

  -- User input
  user_short_note TEXT NOT NULL,

  -- DAW metadata (MVP: estimated, Final: measured)
  daw_meta JSONB DEFAULT '{}'::JSONB,

  -- AI annotations
  ai_annotations JSONB DEFAULT '{}'::JSONB,

  -- Attachments
  attachments JSONB DEFAULT '[]'::JSONB,

  -- Privacy settings
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_with_mentor BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_sessions_title_length CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 200),
  CONSTRAINT chk_sessions_user_short_note_length CHECK (LENGTH(user_short_note) >= 1)
);

-- ========================================
-- 3. Create session_analyses table
-- ========================================

CREATE TABLE IF NOT EXISTS session_analyses (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to sessions (1:1 relationship)
  session_id UUID NOT NULL UNIQUE,

  -- Analysis data (JSONB format)
  analysis_data JSONB NOT NULL,

  -- Metadata
  analysis_version TEXT NOT NULL DEFAULT 'mvp-1.0',
  confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. Create interview_questions table
-- ========================================

CREATE TABLE IF NOT EXISTS interview_questions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to sessions
  session_id UUID NOT NULL,

  -- Question content
  text TEXT NOT NULL,
  focus interview_focus NOT NULL,
  depth interview_depth NOT NULL,

  -- Display order
  "order" INTEGER NOT NULL DEFAULT 0,

  -- Question generation metadata
  generated_by TEXT DEFAULT 'ai',
  template_id TEXT,
  rag_context JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_interview_questions_text_length CHECK (LENGTH(text) >= 5),
  CONSTRAINT chk_interview_questions_order CHECK ("order" >= 0)
);

-- ========================================
-- 5. Create interview_answers table
-- ========================================

CREATE TABLE IF NOT EXISTS interview_answers (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  session_id UUID NOT NULL,
  question_id UUID NOT NULL,

  -- Answer content
  text TEXT NOT NULL,

  -- AI insights
  ai_insights JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_interview_answers_text_length CHECK (LENGTH(text) >= 1),
  -- Ensure one answer per question
  CONSTRAINT uq_interview_answers_question UNIQUE (question_id)
);

-- ========================================
-- 6. Add foreign key constraints
-- ========================================

DO $$
BEGIN
  -- sessions -> users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sessions_user'
  ) THEN
    ALTER TABLE sessions
    ADD CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- session_analyses -> sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_session_analyses_session'
  ) THEN
    ALTER TABLE session_analyses
    ADD CONSTRAINT fk_session_analyses_session
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;

  -- interview_questions -> sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_questions_session'
  ) THEN
    ALTER TABLE interview_questions
    ADD CONSTRAINT fk_interview_questions_session
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;

  -- interview_answers -> sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_answers_session'
  ) THEN
    ALTER TABLE interview_answers
    ADD CONSTRAINT fk_interview_answers_session
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;

  -- interview_answers -> interview_questions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_answers_question'
  ) THEN
    ALTER TABLE interview_answers
    ADD CONSTRAINT fk_interview_answers_question
    FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========================================
-- 7. Create indexes for performance
-- ========================================

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_type
  ON sessions(type);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_status
  ON sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_sessions_public
  ON sessions(is_public)
  WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_sessions_project
  ON sessions(project_id)
  WHERE project_id IS NOT NULL;

-- Session analyses table indexes
CREATE INDEX IF NOT EXISTS idx_session_analyses_session
  ON session_analyses(session_id);

-- Interview questions table indexes
CREATE INDEX IF NOT EXISTS idx_interview_questions_session
  ON interview_questions(session_id);

CREATE INDEX IF NOT EXISTS idx_interview_questions_session_order
  ON interview_questions(session_id, "order");

CREATE INDEX IF NOT EXISTS idx_interview_questions_focus
  ON interview_questions(focus);

-- Interview answers table indexes
CREATE INDEX IF NOT EXISTS idx_interview_answers_session
  ON interview_answers(session_id);

CREATE INDEX IF NOT EXISTS idx_interview_answers_question
  ON interview_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_interview_answers_session_question
  ON interview_answers(session_id, question_id);

-- GIN indexes for JSONB search
CREATE INDEX IF NOT EXISTS idx_sessions_daw_meta_gin
  ON sessions USING GIN (daw_meta);

CREATE INDEX IF NOT EXISTS idx_sessions_ai_annotations_gin
  ON sessions USING GIN (ai_annotations);

CREATE INDEX IF NOT EXISTS idx_session_analyses_data_gin
  ON session_analyses USING GIN (analysis_data);

-- ========================================
-- 8. Create triggers for updated_at
-- ========================================

-- Trigger for sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_sessions_updated_at
      BEFORE UPDATE ON sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger for session_analyses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_session_analyses_updated_at'
  ) THEN
    CREATE TRIGGER update_session_analyses_updated_at
      BEFORE UPDATE ON session_analyses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger for interview_answers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_interview_answers_updated_at'
  ) THEN
    CREATE TRIGGER update_interview_answers_updated_at
      BEFORE UPDATE ON interview_answers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========================================
-- 9. Create helper views
-- ========================================

-- View: Sessions with user info
CREATE OR REPLACE VIEW v_sessions_with_user AS
SELECT
  s.id,
  s.user_id,
  u.name as user_name,
  u.email as user_email,
  s.type,
  s.status,
  s.title,
  s.project_name,
  s.user_short_note,
  s.daw_meta,
  s.ai_annotations,
  s.is_public,
  s.created_at,
  s.completed_at,
  -- Count related records
  (SELECT COUNT(*) FROM interview_questions WHERE session_id = s.id) as question_count,
  (SELECT COUNT(*) FROM interview_answers WHERE session_id = s.id) as answer_count
FROM sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;

-- View: Complete session details (for session page)
CREATE OR REPLACE VIEW v_session_details AS
SELECT
  s.id,
  s.user_id,
  u.name as user_name,
  s.type,
  s.status,
  s.title,
  s.project_name,
  s.user_short_note,
  s.daw_meta,
  s.ai_annotations,
  s.attachments,
  s.is_public,
  s.share_with_mentor,
  s.created_at,
  s.updated_at,
  s.completed_at,
  -- Session analysis
  sa.analysis_data,
  sa.analysis_version,
  sa.confidence as analysis_confidence,
  -- Question and answer counts
  (SELECT COUNT(*) FROM interview_questions WHERE session_id = s.id) as total_questions,
  (SELECT COUNT(*) FROM interview_answers WHERE session_id = s.id) as total_answers
FROM sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN session_analyses sa ON s.id = sa.session_id;

-- View: Interview Q&A pairs (for chat-like display)
CREATE OR REPLACE VIEW v_interview_qa_pairs AS
SELECT
  q.session_id,
  q.id as question_id,
  q.text as question_text,
  q.focus,
  q.depth,
  q."order",
  q.created_at as question_created_at,
  a.id as answer_id,
  a.text as answer_text,
  a.ai_insights,
  a.created_at as answer_created_at,
  a.updated_at as answer_updated_at
FROM interview_questions q
LEFT JOIN interview_answers a ON q.id = a.question_id
ORDER BY q.session_id, q."order";

-- View: Public sessions (for discovery/learning)
CREATE OR REPLACE VIEW v_public_sessions AS
SELECT
  s.id,
  s.user_id,
  u.name as user_name,
  s.type,
  s.title,
  s.user_short_note,
  s.daw_meta,
  s.created_at,
  (SELECT COUNT(*) FROM interview_questions WHERE session_id = s.id) as question_count,
  (SELECT COUNT(*) FROM interview_answers WHERE session_id = s.id) as answer_count
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_public = TRUE
  AND s.status = 'completed'
ORDER BY s.created_at DESC;

-- ========================================
-- 10. Add table comments
-- ========================================

COMMENT ON TABLE sessions IS 'MUEDnote Phase 2: AI Interview-driven composition and practice sessions';
COMMENT ON COLUMN sessions.user_short_note IS 'User initial short description (1-2 lines) of what they worked on';
COMMENT ON COLUMN sessions.daw_meta IS 'DAW metadata (MVP: estimated, Final: measured from MIDI/WAV analysis)';
COMMENT ON COLUMN sessions.ai_annotations IS 'AI-generated annotations and hypotheses about user intent';
COMMENT ON COLUMN sessions.status IS 'Session lifecycle: draft -> interviewing -> completed -> archived';

COMMENT ON TABLE session_analyses IS 'Detailed analysis output from Analyzer module';
COMMENT ON COLUMN session_analyses.analysis_data IS 'Structured analysis data including focus area, intent hypothesis, and metrics';
COMMENT ON COLUMN session_analyses.analysis_version IS 'Version of analysis algorithm used (for A/B testing and rollback)';
COMMENT ON COLUMN session_analyses.confidence IS 'Confidence score 0-100 for analysis accuracy';

COMMENT ON TABLE interview_questions IS 'AI-generated interview questions for eliciting user insights';
COMMENT ON COLUMN interview_questions.focus IS 'Musical focus area (harmony, melody, rhythm, etc.)';
COMMENT ON COLUMN interview_questions.depth IS 'Question depth level: shallow (beginner), medium, deep (theoretical)';
COMMENT ON COLUMN interview_questions."order" IS 'Display order within session (0-indexed)';
COMMENT ON COLUMN interview_questions.rag_context IS 'RAG context used for question generation (for debugging and improvement)';

COMMENT ON TABLE interview_answers IS 'User answers to interview questions';
COMMENT ON COLUMN interview_answers.ai_insights IS 'AI-extracted insights: key phrases, technical terms, emotional tone';

-- ========================================
-- 11. Create statistics for query optimization
-- ========================================

-- Analyze tables for query planner
ANALYZE sessions;
ANALYZE session_analyses;
ANALYZE interview_questions;
ANALYZE interview_answers;

-- ========================================
-- Migration complete
-- ========================================
