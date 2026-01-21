-- Migration: Add Free Trial Columns to Subscriptions
-- Purpose: Enable 3-day trial with 50 turns for Free tier users

-- Add trial tracking columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_turns_used INTEGER DEFAULT 0;

-- Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_started
ON subscriptions (trial_started_at)
WHERE trial_started_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.trial_started_at IS 'When the 3-day free trial was started';
COMMENT ON COLUMN subscriptions.trial_used IS 'Whether trial has been used (prevents re-use)';
COMMENT ON COLUMN subscriptions.trial_turns_used IS 'Number of AI turns used during trial (limit: 50)';
