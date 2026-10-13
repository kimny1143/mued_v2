-- 0064 — plugin_license_grants: time-limited license keys we hand out ourselves (testers). Not sales.
-- PURE ADDITIVE (one new table, nothing else touched); safe to re-run (IF NOT EXISTS).
-- Apply BEFORE the code is deployed:
--   psql "$DATABASE_URL" -f db/migrations/0064_plugin_license_grants.sql
-- Undo: see docs/paid-line/license-grants.md (the rows are the record of who got a key — read that first).
CREATE TABLE IF NOT EXISTS plugin_license_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product_id text NOT NULL,
  order_ref text NOT NULL UNIQUE,
  license_key text NOT NULL,
  license_version integer NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  reason text NOT NULL,
  granted_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plugin_license_grants_email ON plugin_license_grants (email);

COMMENT ON TABLE plugin_license_grants IS 'Time-limited license keys issued by an admin (testers). Not purchases: never counted as sales.';
COMMENT ON COLUMN plugin_license_grants.email IS 'Recipient, lower-cased. The portal shows the grant to whoever signs in with this verified address.';
COMMENT ON COLUMN plugin_license_grants.order_ref IS 'The keyfile''s order= line (grant-<product>-<uuid>). Tells a grant from a FastSpring order.';
COMMENT ON COLUMN plugin_license_grants.granted_by IS 'Clerk user id of the admin who issued it.';
