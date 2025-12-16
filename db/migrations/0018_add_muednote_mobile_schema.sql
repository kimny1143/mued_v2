-- =============================================
-- MUEDnote Mobile v7 MVP Schema
-- =============================================
-- Purpose: Simple session + logs tables for mobile app
-- Following CLAUDE.md idempotent migration rules
-- Date: 2025-12-15
-- =============================================

-- =============================================
-- Session Status ENUM
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'muednote_mobile_session_status') THEN
    CREATE TYPE muednote_mobile_session_status AS ENUM (
      'active',     -- Session in progress
      'completed',  -- Session ended normally
      'synced'      -- Synced to server
    );
  END IF;
END $$;

-- =============================================
-- Mobile Sessions Table
-- =============================================
CREATE TABLE IF NOT EXISTS muednote_mobile_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,              -- Clerk user_id (TEXT, not UUID)
  duration_sec INTEGER NOT NULL,      -- Planned duration (3600/5400/7200)
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  device_id TEXT,                     -- For multi-device support (future)
  session_memo TEXT,                  -- Optional: User's session reflection
  status muednote_mobile_session_status DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Mobile Logs Table (Thought Fragments)
-- =============================================
CREATE TABLE IF NOT EXISTS muednote_mobile_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  timestamp_sec REAL NOT NULL,        -- Seconds from session start
  text TEXT NOT NULL,                 -- Transcribed text
  confidence REAL,                    -- Whisper confidence (0-1)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Foreign Key (with existence check)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_muednote_mobile_logs_session'
      AND table_name = 'muednote_mobile_logs'
  ) THEN
    ALTER TABLE muednote_mobile_logs
      ADD CONSTRAINT fk_muednote_mobile_logs_session
      FOREIGN KEY (session_id)
      REFERENCES muednote_mobile_sessions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_muednote_mobile_sessions_user
  ON muednote_mobile_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_muednote_mobile_sessions_user_created
  ON muednote_mobile_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_muednote_mobile_logs_session
  ON muednote_mobile_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_muednote_mobile_logs_session_timestamp
  ON muednote_mobile_logs(session_id, timestamp_sec);

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE muednote_mobile_sessions IS 'MUEDnote Mobile v7 MVP - Simple timer sessions for thought capture';
COMMENT ON TABLE muednote_mobile_logs IS 'MUEDnote Mobile v7 MVP - Transcribed thought logs from sessions';
COMMENT ON COLUMN muednote_mobile_sessions.duration_sec IS 'Planned session duration in seconds (typically 3600, 5400, or 7200)';
COMMENT ON COLUMN muednote_mobile_sessions.session_memo IS 'Optional user reflection about the session';
COMMENT ON COLUMN muednote_mobile_logs.timestamp_sec IS 'Offset in seconds from session start time';
COMMENT ON COLUMN muednote_mobile_logs.confidence IS 'Whisper ASR confidence score (0.0-1.0)';
