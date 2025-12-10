-- Mentor Matching Chat Tables Migration
-- Date: 2025-12-10
-- Purpose: Add chat_sessions and chat_messages for mentor matching feature
-- Note: Uses IF NOT EXISTS for idempotency

-- ========================================
-- ENUM Types
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_role') THEN
    CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
  END IF;
END $$;

-- ========================================
-- chat_sessions - チャットセッション管理
-- ========================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- セッション情報
  title TEXT,
  summary JSONB,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,

  -- 統計情報
  message_count INTEGER DEFAULT 0 NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Add user_id column if table exists but column doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE chat_sessions ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Add message_count column if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'message_count') THEN
    ALTER TABLE chat_sessions ADD COLUMN message_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add is_pinned column if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'is_pinned') THEN
    ALTER TABLE chat_sessions ADD COLUMN is_pinned BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add archived_at column if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'archived_at') THEN
    ALTER TABLE chat_sessions ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_pinned ON chat_sessions(is_pinned);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_active ON chat_sessions(user_id, is_active);

-- ========================================
-- chat_messages - チャットメッセージ
-- ========================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- メッセージ内容
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  processed_content TEXT,

  -- メタデータ
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB,

  -- 関連情報
  parent_message_id UUID,
  is_edited BOOLEAN DEFAULT false NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add user_id column if table exists but column doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'user_id') THEN
    ALTER TABLE chat_messages ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Add parent_message_id column if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'parent_message_id') THEN
    ALTER TABLE chat_messages ADD COLUMN parent_message_id UUID;
  END IF;
END $$;

-- Add is_edited column if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'is_edited') THEN
    ALTER TABLE chat_messages ADD COLUMN is_edited BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add edited_at column if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'edited_at') THEN
    ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);

-- GINインデックス（tags検索用）
CREATE INDEX IF NOT EXISTS idx_chat_messages_tags_gin ON chat_messages USING GIN (tags);

-- ========================================
-- updated_at トリガー
-- ========================================

CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_sessions_updated_at') THEN
    CREATE TRIGGER update_chat_sessions_updated_at
      BEFORE UPDATE ON chat_sessions
      FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at();
  END IF;
END $$;

-- ========================================
-- RLS Policies (Row Level Security)
-- ========================================

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS chat_sessions_select_own ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_insert_own ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_update_own ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_delete_own ON chat_sessions;
DROP POLICY IF EXISTS chat_messages_select_own ON chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_own ON chat_messages;
DROP POLICY IF EXISTS chat_messages_update_own ON chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_own ON chat_messages;

-- Create policies for chat_sessions
CREATE POLICY chat_sessions_select_own ON chat_sessions
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY chat_sessions_insert_own ON chat_sessions
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY chat_sessions_update_own ON chat_sessions
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY chat_sessions_delete_own ON chat_sessions
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

-- Create policies for chat_messages
CREATE POLICY chat_messages_select_own ON chat_messages
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY chat_messages_insert_own ON chat_messages
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY chat_messages_update_own ON chat_messages
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY chat_messages_delete_own ON chat_messages
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.current_user_id', true) IS NULL);
