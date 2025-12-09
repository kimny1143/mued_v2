-- Migration: Add webhook status tracking fields
-- Purpose: Enable idempotent webhook processing with status tracking
-- Date: 2025-12-09

-- 1. Create webhook_status enum type (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_status') THEN
    CREATE TYPE webhook_status AS ENUM ('processing', 'processed', 'failed');
  END IF;
END $$;

-- 2. Add status column with default 'processing'
-- For existing rows, we'll set them as 'processed' since they were successfully inserted
ALTER TABLE webhook_events
ADD COLUMN IF NOT EXISTS status webhook_status DEFAULT 'processing' NOT NULL;

-- Update existing rows to 'processed' (they were successfully handled before this migration)
UPDATE webhook_events SET status = 'processed' WHERE status = 'processing';

-- 3. Add completed_at column
ALTER TABLE webhook_events
ADD COLUMN IF NOT EXISTS completed_at timestamp;

-- Update existing rows - set completed_at = processed_at for consistency
UPDATE webhook_events SET completed_at = processed_at WHERE completed_at IS NULL;

-- 4. Add error_message column
ALTER TABLE webhook_events
ADD COLUMN IF NOT EXISTS error_message text;

-- 5. Create index on status for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
ON webhook_events USING btree (status);

-- 6. Add index for finding processing/failed events (for retry logic)
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created
ON webhook_events USING btree (status, created_at)
WHERE status IN ('processing', 'failed');
