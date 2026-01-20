-- Migration: Create hoo_conversations table
-- Date: 2026-01-20
-- Description: Store Hoo AI conversation history for MUEDnote

-- Create hoo_conversations table
CREATE TABLE IF NOT EXISTS hoo_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Conversation content
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  message_count INTEGER NOT NULL DEFAULT 0,

  -- AI model info
  model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  provider TEXT NOT NULL DEFAULT 'claude',

  -- Usage metrics
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Optional metadata
  summary TEXT,
  tags JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hoo_conversations_user_id ON hoo_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_hoo_conversations_started_at ON hoo_conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_hoo_conversations_last_message_at ON hoo_conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_hoo_conversations_user_started ON hoo_conversations(user_id, started_at);

-- Verification query:
-- SELECT id, user_id, message_count, model, started_at FROM hoo_conversations LIMIT 5;
