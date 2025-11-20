-- ================================================
-- Migration: 0013_add_question_templates
-- Phase 1.3: Question Template System for Interviewer
-- Date: 2025-11-20
-- ================================================

-- ========================================
-- 1. Create question_templates table
-- ========================================

CREATE TABLE IF NOT EXISTS question_templates (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification (using existing ENUMs from migration 0010)
  focus interview_focus NOT NULL,
  depth interview_depth NOT NULL,

  -- Content
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::JSONB,

  -- Metadata
  category TEXT CHECK (category IN ('technical', 'creative', 'reflective', 'diagnostic')),
  language VARCHAR(10) DEFAULT 'ja' NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Priority & analytics
  priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at TIMESTAMPTZ,

  -- Status
  enabled BOOLEAN DEFAULT TRUE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT chk_question_templates_text_length CHECK (LENGTH(template_text) >= 5),
  CONSTRAINT chk_question_templates_variables_valid CHECK (
    variables IS NULL OR
    variables = '{}'::JSONB OR
    (variables ? 'placeholders' AND jsonb_typeof(variables->'placeholders') = 'array')
  )
);

-- ========================================
-- 2. Create indexes
-- ========================================

-- Primary lookup (focus + depth + priority)
CREATE INDEX IF NOT EXISTS idx_question_templates_focus_depth
  ON question_templates(focus, depth, priority DESC)
  WHERE enabled = TRUE;

-- Priority-based selection
CREATE INDEX IF NOT EXISTS idx_question_templates_priority
  ON question_templates(priority DESC, created_at DESC)
  WHERE enabled = TRUE;

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_question_templates_category
  ON question_templates(category, focus)
  WHERE enabled = TRUE AND category IS NOT NULL;

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_question_templates_analytics
  ON question_templates(usage_count DESC, last_used_at DESC)
  WHERE enabled = TRUE;

-- Full-text search on template_text
CREATE INDEX IF NOT EXISTS idx_question_templates_fts
  ON question_templates USING GIN (to_tsvector('japanese', template_text));

-- Tag search
CREATE INDEX IF NOT EXISTS idx_question_templates_tags
  ON question_templates USING GIN (tags);

-- ========================================
-- 3. Add foreign key to interview_questions
-- ========================================

DO $$
BEGIN
  -- Add foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_questions_template'
  ) THEN
    ALTER TABLE interview_questions
    ADD CONSTRAINT fk_interview_questions_template
    FOREIGN KEY (template_id) REFERENCES question_templates(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for template usage tracking
CREATE INDEX IF NOT EXISTS idx_interview_questions_template
  ON interview_questions(template_id)
  WHERE template_id IS NOT NULL;

-- ========================================
-- 4. Create triggers
-- ========================================

-- Trigger 1: updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_question_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_question_templates_updated_at
      BEFORE UPDATE ON question_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger 2: Auto-generate embedding placeholder
CREATE OR REPLACE FUNCTION auto_generate_template_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: This requires rag_embeddings table to exist (migration 0012)
  INSERT INTO rag_embeddings (source_type, source_id, metadata, embedding)
  VALUES (
    'template',
    NEW.id,
    jsonb_build_object(
      'focus', NEW.focus,
      'depth', NEW.depth,
      'pending_embedding', TRUE
    ),
    -- Placeholder embedding (zeros) - will be updated by async job
    ARRAY_FILL(0.0, ARRAY[1536])::VECTOR(1536)
  )
  ON CONFLICT (source_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_auto_generate_template_embedding'
  ) THEN
    CREATE TRIGGER trg_auto_generate_template_embedding
      AFTER INSERT ON question_templates
      FOR EACH ROW
      EXECUTE FUNCTION auto_generate_template_embedding();
  END IF;
END $$;

-- Trigger 3: Increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE question_templates
    SET
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_increment_template_usage'
  ) THEN
    CREATE TRIGGER trg_increment_template_usage
      AFTER INSERT ON interview_questions
      FOR EACH ROW
      EXECUTE FUNCTION increment_template_usage();
  END IF;
END $$;

-- ========================================
-- 5. Seed initial templates
-- ========================================

-- Insert default question templates
INSERT INTO question_templates (focus, depth, template_text, category, priority, variables)
VALUES
  -- Harmony templates
  ('harmony', 'shallow', 'このコード進行を選んだ理由を教えてください。', 'technical', 80,
   '{"placeholders": [{"key": "chord", "description": "コード名", "type": "string", "required": false}]}'::JSONB),
  ('harmony', 'medium', 'コード進行の変更によって、曲の雰囲気はどう変わりましたか？', 'creative', 70, '{}'::JSONB),
  ('harmony', 'deep', '和音の選択において、古典和声と現代和声のどちらを意識しましたか？', 'reflective', 50, '{}'::JSONB),

  -- Melody templates
  ('melody', 'shallow', 'メロディラインで最も気に入っているフレーズはどこですか？', 'creative', 80, '{}'::JSONB),
  ('melody', 'medium', 'メロディの音域設定で工夫した点はありますか？', 'technical', 70, '{}'::JSONB),
  ('melody', 'deep', 'このメロディで表現したい感情の本質は何ですか？', 'reflective', 60, '{}'::JSONB),

  -- Rhythm templates
  ('rhythm', 'shallow', 'このグルーブ感を作るために意識したことは何ですか？', 'technical', 80, '{}'::JSONB),
  ('rhythm', 'medium', 'テンポやリズムパターンの変更理由を教えてください。', 'diagnostic', 70, '{}'::JSONB),
  ('rhythm', 'deep', 'リズムの「揺らぎ」に込めた意図はありますか？', 'creative', 50, '{}'::JSONB),

  -- Mix templates
  ('mix', 'shallow', '音量バランスで最も調整に時間をかけた要素は何ですか？', 'technical', 80, '{}'::JSONB),
  ('mix', 'medium', 'EQやエフェクトで狙った効果は得られましたか？', 'diagnostic', 70, '{}'::JSONB),
  ('mix', 'deep', 'このミックスで最も「聴いてほしい」音は何ですか？', 'creative', 60, '{}'::JSONB),

  -- Emotion templates
  ('emotion', 'shallow', 'この曲で聴き手にどんな気持ちになってほしいですか？', 'reflective', 90, '{}'::JSONB),
  ('emotion', 'medium', '感情表現において、音楽的に工夫したポイントはどこですか？', 'creative', 75, '{}'::JSONB),
  ('emotion', 'deep', 'この曲を通じて、自分自身の中で何を発見しましたか？', 'reflective', 50, '{}'::JSONB),

  -- Image templates
  ('image', 'shallow', 'この曲で思い浮かべているイメージや風景はありますか？', 'creative', 85, '{}'::JSONB),
  ('image', 'medium', '音像の広がりや空間を作るためにどんな工夫をしましたか？', 'technical', 70, '{}'::JSONB),
  ('image', 'deep', '聴き手に「見せたい世界」の本質は何ですか？', 'reflective', 55, '{}'::JSONB),

  -- Structure templates
  ('structure', 'shallow', 'セクション（イントロ、Aメロ、サビなど）の配置で工夫した点は？', 'technical', 80, '{}'::JSONB),
  ('structure', 'medium', '曲の展開において、聴き手を飽きさせない工夫は何ですか？', 'creative', 70, '{}'::JSONB),
  ('structure', 'deep', 'この曲の「物語」は、音楽的にどのように語られていますか？', 'reflective', 60, '{}'::JSONB)

ON CONFLICT DO NOTHING;

-- ========================================
-- 6. Add table comments
-- ========================================

COMMENT ON TABLE question_templates IS 'Reusable question templates for AI Interviewer';
COMMENT ON COLUMN question_templates.focus IS 'Musical focus area (harmony, melody, rhythm, etc.)';
COMMENT ON COLUMN question_templates.depth IS 'Question depth: shallow (beginner), medium, deep (theoretical)';
COMMENT ON COLUMN question_templates.template_text IS 'Question text with optional {placeholders}';
COMMENT ON COLUMN question_templates.variables IS 'JSONB defining placeholders: {placeholders: [{key, description, type}]}';
COMMENT ON COLUMN question_templates.category IS 'Question category: technical, creative, reflective, diagnostic';
COMMENT ON COLUMN question_templates.priority IS 'Priority score 0-100 (higher = more likely to be selected)';
COMMENT ON COLUMN question_templates.usage_count IS 'Number of times this template was used';
COMMENT ON COLUMN question_templates.last_used_at IS 'Timestamp of last usage (for analytics)';
COMMENT ON COLUMN question_templates.enabled IS 'Whether template is active (for A/B testing)';

-- ========================================
-- 7. Analyze table
-- ========================================

ANALYZE question_templates;

-- ========================================
-- Migration 0013 complete
-- ========================================
