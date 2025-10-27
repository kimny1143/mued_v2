-- Service Accounts for Webhook Operations
-- Created: 2025-10-27
-- Purpose: Create service account with RLS bypass for webhooks

-- Create service account for webhook/system operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_account') THEN
        CREATE ROLE service_account WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_account;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_account;
        ALTER ROLE service_account SET search_path TO public;
    END IF;
END
$$;

-- Grant RLS bypass to service account (critical for webhooks)
ALTER ROLE service_account BYPASSRLS;

-- Create application role for normal operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
    END IF;
END
$$;
