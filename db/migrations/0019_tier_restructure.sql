-- Migration: Subscription Tier Restructure
-- Date: 2026-01-19
-- Description: Change from 4-tier (freemium/starter/basic/premium) to 3-tier (free/basic/premium)

-- Step 1: Migrate starter users to basic (free upgrade)
UPDATE subscriptions
SET plan = 'basic',
    updated_at = NOW()
WHERE plan = 'starter';

-- Step 2: Rename freemium to free
UPDATE subscriptions
SET plan = 'free',
    updated_at = NOW()
WHERE plan = 'freemium';

-- Step 3: Update the default value for new subscriptions
-- Note: This is handled in the application code (Drizzle schema)
-- The default is now 'free' instead of 'freemium'

-- Verification query (run manually to check results):
-- SELECT plan, COUNT(*) FROM subscriptions GROUP BY plan ORDER BY plan;
