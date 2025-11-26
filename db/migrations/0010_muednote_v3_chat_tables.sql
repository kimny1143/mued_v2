-- MUEDnote V3 Chat Tables Migration
-- Based on MUEDNOTE_INTEGRATED_SPEC_V2.md
-- Date: 2025-11-26
-- Note: Simplified for local-first Tauri app (no users table dependency)

-- ========================================
-- chat_sessions - チャットセッション管理
-- ========================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT DEFAULT 'default',
  title TEXT,
  summary JSONB,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_sessions_device ON chat_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- ========================================
-- chat_messages - チャットメッセージ
-- ========================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  processed_content TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- ========================================
-- ai_profiles - AI人格設定（オプション）
-- ========================================
CREATE TABLE IF NOT EXISTS ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
  personality_preset TEXT NOT NULL DEFAULT 'friendly-mentor',
  response_length TEXT NOT NULL DEFAULT 'standard',
  formality_level INTEGER NOT NULL DEFAULT 3 CHECK (formality_level BETWEEN 1 AND 5),
  question_frequency INTEGER NOT NULL DEFAULT 3 CHECK (question_frequency BETWEEN 1 AND 5),
  suggestion_frequency INTEGER NOT NULL DEFAULT 3 CHECK (suggestion_frequency BETWEEN 1 AND 5),
  encouragement_level INTEGER NOT NULL DEFAULT 3 CHECK (encouragement_level BETWEEN 1 AND 5),
  custom_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ai_memories - AIメモリ（オプション）
-- ========================================
CREATE TABLE IF NOT EXISTS ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL DEFAULT 'default',
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'pattern', 'feedback', 'knowledge')),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.50,
  frequency INTEGER DEFAULT 1,
  last_accessed TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ai_memories_device_type ON ai_memories(device_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_memories_confidence ON ai_memories(confidence);

-- ========================================
-- updated_at 関数
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- updated_at トリガー
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_sessions_updated_at') THEN
    CREATE TRIGGER update_chat_sessions_updated_at
      BEFORE UPDATE ON chat_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_profiles_updated_at') THEN
    CREATE TRIGGER update_ai_profiles_updated_at
      BEFORE UPDATE ON ai_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_memories_updated_at') THEN
    CREATE TRIGGER update_ai_memories_updated_at
      BEFORE UPDATE ON ai_memories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
