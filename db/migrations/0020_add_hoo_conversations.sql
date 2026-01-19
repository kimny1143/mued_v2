-- Migration: Add Hoo conversations tracking
-- Date: 2026-01-19
-- Description: Add hoo_conversations_used column for MUEDnote subscription tracking

-- Add new column for Hoo conversation tracking
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS hoo_conversations_used INTEGER NOT NULL DEFAULT 0;

-- Verification query (run manually to check results):
-- SELECT id, plan, hoo_conversations_used FROM subscriptions LIMIT 5;
