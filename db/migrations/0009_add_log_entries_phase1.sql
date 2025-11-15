-- ================================================
-- Migration: 0009_add_log_entries_phase1
-- Phase 1: MUEDnote（制作・学習ログシステム）の実装
-- Date: 2025-11-15
-- ================================================

-- ========================================
-- 1. Create ENUM types with existence checks
-- ========================================

DO $$
BEGIN
  -- Create log_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_type') THEN
    CREATE TYPE log_type AS ENUM (
      'lesson',           -- レッスン関連
      'practice',         -- 練習記録
      'creation',         -- 制作活動
      'reflection',       -- 振り返り・考察
      'system',          -- システム自動生成
      'ear_training',    -- 耳トレーニング（Phase 2準備）
      'structure_analysis' -- 構造分析（Phase 3準備）
    );
  END IF;

  -- Create target_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_type') THEN
    CREATE TYPE target_type AS ENUM (
      'lesson',
      'material',
      'ear_exercise',
      'form_exercise',
      'reservation',
      'user_creation'
    );
  END IF;
END $$;

-- ========================================
-- 2. Create log_entries table
-- ========================================

CREATE TABLE IF NOT EXISTS log_entries (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL,

  -- Log classification
  type log_type NOT NULL,

  -- Polymorphic reference to target entity
  target_id UUID,
  target_type target_type,

  -- Content (Markdown format)
  content TEXT NOT NULL,

  -- AI-generated summary
  ai_summary JSONB,

  -- Metadata
  tags JSONB DEFAULT '[]'::JSONB,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'very_hard') OR difficulty IS NULL),
  emotion TEXT,
  attachments JSONB DEFAULT '[]'::JSONB,

  -- Privacy settings
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_with_mentor BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_target_consistency
    CHECK ((target_id IS NULL AND target_type IS NULL) OR
           (target_id IS NOT NULL AND target_type IS NOT NULL))
);

-- ========================================
-- 3. Add foreign key constraints
-- ========================================

DO $$
BEGIN
  -- Add foreign key to users table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_log_entries_user'
  ) THEN
    ALTER TABLE log_entries
    ADD CONSTRAINT fk_log_entries_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========================================
-- 4. Create indexes for performance
-- ========================================

-- User lookup index
CREATE INDEX IF NOT EXISTS idx_log_entries_user
  ON log_entries(user_id);

-- Type filtering index
CREATE INDEX IF NOT EXISTS idx_log_entries_type
  ON log_entries(type);

-- Target entity lookup index
CREATE INDEX IF NOT EXISTS idx_log_entries_target
  ON log_entries(target_id, target_type)
  WHERE target_id IS NOT NULL;

-- Chronological listing index
CREATE INDEX IF NOT EXISTS idx_log_entries_created_at
  ON log_entries(created_at DESC);

-- Composite index for user timeline queries
CREATE INDEX IF NOT EXISTS idx_log_entries_user_created
  ON log_entries(user_id, created_at DESC);

-- Public entries index for discovery features
CREATE INDEX IF NOT EXISTS idx_log_entries_public
  ON log_entries(is_public)
  WHERE is_public = TRUE;

-- GIN index for JSON tags search
CREATE INDEX IF NOT EXISTS idx_log_entries_tags_gin
  ON log_entries USING GIN (tags);

-- ========================================
-- 5. Create update trigger for updated_at
-- ========================================

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_log_entries_updated_at'
  ) THEN
    CREATE TRIGGER update_log_entries_updated_at
      BEFORE UPDATE ON log_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========================================
-- 6. Create helper views for common queries
-- ========================================

-- View for recent user logs with user info
CREATE OR REPLACE VIEW v_user_logs_recent AS
SELECT
  l.id,
  l.user_id,
  u.name as user_name,
  u.email as user_email,
  l.type,
  l.target_id,
  l.target_type,
  l.content,
  l.ai_summary,
  l.tags,
  l.difficulty,
  l.emotion,
  l.is_public,
  l.created_at
FROM log_entries l
JOIN users u ON l.user_id = u.id
WHERE l.created_at > NOW() - INTERVAL '30 days'
ORDER BY l.created_at DESC;

-- View for public logs (for discovery/learning from others)
CREATE OR REPLACE VIEW v_public_logs AS
SELECT
  l.id,
  l.user_id,
  u.name as user_name,
  l.type,
  l.content,
  l.ai_summary,
  l.tags,
  l.difficulty,
  l.created_at
FROM log_entries l
JOIN users u ON l.user_id = u.id
WHERE l.is_public = TRUE
ORDER BY l.created_at DESC;

-- ========================================
-- 7. Create initial data for testing (optional)
-- ========================================

-- Commented out for production, uncomment for development
/*
INSERT INTO log_entries (user_id, type, content, tags, difficulty, emotion)
SELECT
  u.id,
  'reflection',
  'Today I practiced scales and noticed improvement in finger independence.',
  '["practice", "scales", "technique"]'::JSONB,
  'medium',
  'confident'
FROM users u
WHERE u.role = 'student'
LIMIT 1;
*/

-- ========================================
-- 8. Add comments for documentation
-- ========================================

COMMENT ON TABLE log_entries IS 'MUEDnote: Central repository for all learning and creation logs';
COMMENT ON COLUMN log_entries.type IS 'Type of log entry (lesson, practice, creation, etc.)';
COMMENT ON COLUMN log_entries.target_id IS 'UUID of the related entity (lesson, material, etc.)';
COMMENT ON COLUMN log_entries.target_type IS 'Type of the related entity for polymorphic reference';
COMMENT ON COLUMN log_entries.content IS 'Main content in Markdown format';
COMMENT ON COLUMN log_entries.ai_summary IS 'AI-generated summary with key points and insights';
COMMENT ON COLUMN log_entries.tags IS 'User-defined and system-generated tags for categorization';
COMMENT ON COLUMN log_entries.difficulty IS 'Perceived difficulty level by the user';
COMMENT ON COLUMN log_entries.emotion IS 'Emotional state during the activity (frustrated, excited, etc.)';
COMMENT ON COLUMN log_entries.is_public IS 'Whether this log can be viewed by other users';
COMMENT ON COLUMN log_entries.share_with_mentor IS 'Whether this log is shared with assigned mentors';

-- ========================================
-- Migration complete
-- ========================================