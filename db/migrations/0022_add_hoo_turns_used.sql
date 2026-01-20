-- Migration: Add hoo_turns_used column to subscriptions table
-- This enables separate tracking of:
--   - hoo_conversations_used: thread count (soft limit: 30/month for Basic)
--   - hoo_turns_used: total turn count across all conversations (hard limit: 150/month for Basic)

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS hoo_turns_used integer NOT NULL DEFAULT 0;

-- Update comment for clarity
COMMENT ON COLUMN subscriptions.hoo_conversations_used IS 'Number of Hoo conversation threads created this billing period (soft limit)';
COMMENT ON COLUMN subscriptions.hoo_turns_used IS 'Number of Hoo conversation turns used this billing period (hard limit)';
