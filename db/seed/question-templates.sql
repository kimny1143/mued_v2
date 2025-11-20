-- ================================================
-- Seed: Question Templates
-- Phase 1.3: Initial Template Data for InterviewerService
-- Date: 2025-11-20
-- ================================================
--
-- This file seeds the question_templates table with 21 initial templates
-- covering 7 focusAreas (harmony, melody, rhythm, mix, emotion, image, structure)
-- and 3 depths (shallow, medium, deep).
--
-- Usage:
--   psql $DATABASE_URL -f db/seed/question-templates.sql
--
-- ================================================

-- ========================================
-- 1. Harmony (和声) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('harmony', 'shallow', 'どのコードを使いましたか？', '{}', 10, 'technical'),
  ('harmony', 'medium', 'コード進行を変更した理由は何ですか？', '{}', 8, 'diagnostic'),
  ('harmony', 'deep', 'この和音進行が表現したい感情の本質は何ですか？', '{}', 5, 'reflective')
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. Melody (旋律) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('melody', 'shallow', 'メロディのどの部分を変更しましたか？', '{}', 10, 'technical'),
  ('melody', 'medium', 'フレーズの音域を変更した理由は？', '{}', 8, 'diagnostic'),
  ('melody', 'deep', 'このメロディラインで伝えたい物語は何ですか？', '{}', 5, 'reflective')
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. Rhythm (リズム) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('rhythm', 'shallow', 'どのリズムパターンを使いましたか？', '{}', 10, 'technical'),
  ('rhythm', 'medium', 'テンポを変更した理由は何ですか？', '{}', 8, 'diagnostic'),
  ('rhythm', 'deep', 'このグルーブ感が聴き手にどう感じてほしいですか？', '{}', 5, 'creative')
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. Mix (ミックス) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('mix', 'shallow', 'どの楽器の音量を調整しましたか？', '{}', 10, 'technical'),
  ('mix', 'medium', 'EQを変更した狙いは何ですか？', '{}', 8, 'diagnostic'),
  ('mix', 'deep', 'この音像バランスが表現したい空間感は？', '{}', 5, 'creative')
ON CONFLICT DO NOTHING;

-- ========================================
-- 5. Emotion (感情) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('emotion', 'shallow', 'どんな感情を表現したいですか？', '{}', 10, 'reflective'),
  ('emotion', 'medium', 'この感情を選んだ理由は？', '{}', 8, 'creative'),
  ('emotion', 'deep', '聴き手の心にどんな変化を起こしたいですか？', '{}', 5, 'reflective')
ON CONFLICT DO NOTHING;

-- ========================================
-- 6. Image (音像) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('image', 'shallow', '音の広がりをどう調整しましたか？', '{}', 10, 'technical'),
  ('image', 'medium', 'リバーブを変更した意図は？', '{}', 8, 'diagnostic'),
  ('image', 'deep', 'この空間イメージが聴き手に見せたい景色は？', '{}', 5, 'creative')
ON CONFLICT DO NOTHING;

-- ========================================
-- 7. Structure (構成) Templates
-- ========================================

INSERT INTO question_templates (focus, depth, template_text, variables, priority, category)
VALUES
  ('structure', 'shallow', '曲のどのセクションを変更しましたか？', '{}', 10, 'technical'),
  ('structure', 'medium', 'この構成にした理由は何ですか？', '{}', 8, 'diagnostic'),
  ('structure', 'deep', 'この展開で聴き手の体験をどう設計していますか？', '{}', 5, 'creative')
ON CONFLICT DO NOTHING;

-- ========================================
-- Verify insertion
-- ========================================

-- Count templates by focus area
DO $$
DECLARE
  harmony_count INTEGER;
  melody_count INTEGER;
  rhythm_count INTEGER;
  mix_count INTEGER;
  emotion_count INTEGER;
  image_count INTEGER;
  structure_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO harmony_count FROM question_templates WHERE focus = 'harmony';
  SELECT COUNT(*) INTO melody_count FROM question_templates WHERE focus = 'melody';
  SELECT COUNT(*) INTO rhythm_count FROM question_templates WHERE focus = 'rhythm';
  SELECT COUNT(*) INTO mix_count FROM question_templates WHERE focus = 'mix';
  SELECT COUNT(*) INTO emotion_count FROM question_templates WHERE focus = 'emotion';
  SELECT COUNT(*) INTO image_count FROM question_templates WHERE focus = 'image';
  SELECT COUNT(*) INTO structure_count FROM question_templates WHERE focus = 'structure';
  SELECT COUNT(*) INTO total_count FROM question_templates;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Question Templates Seed Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Harmony templates: %', harmony_count;
  RAISE NOTICE 'Melody templates: %', melody_count;
  RAISE NOTICE 'Rhythm templates: %', rhythm_count;
  RAISE NOTICE 'Mix templates: %', mix_count;
  RAISE NOTICE 'Emotion templates: %', emotion_count;
  RAISE NOTICE 'Image templates: %', image_count;
  RAISE NOTICE 'Structure templates: %', structure_count;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Total templates: %', total_count;
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- Seed Complete
-- ========================================
