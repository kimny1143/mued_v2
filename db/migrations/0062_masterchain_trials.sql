-- 0062 — masterchain trials. PURE ADDITIVE; safe to re-run (IF NOT EXISTS).
-- Apply: psql "$DATABASE_URL" -f db/migrations/0062_masterchain_trials.sql
-- Separate from purchases so a trial never grants a perpetual paid entitlement.
CREATE TABLE IF NOT EXISTS masterchain_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_canonical text NOT NULL UNIQUE,
  clerk_user_id text NOT NULL UNIQUE,
  license_key text NOT NULL,
  license_version integer NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  eula_version text,
  eula_accepted_at timestamptz,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  first_touch jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_masterchain_trials_email ON masterchain_trials(email);
CREATE INDEX IF NOT EXISTS idx_masterchain_trials_created_at ON masterchain_trials(created_at);

COMMENT ON TABLE masterchain_trials IS 'One lifetime trial per Clerk user and canonical email; retain expired rows to prevent repeat trials.';
COMMENT ON COLUMN masterchain_trials.email IS 'Verified Clerk email used as license owner, trimmed and lower-cased; canonicalization is only for deduplication, not authorization.';
COMMENT ON COLUMN masterchain_trials.email_canonical IS 'Gmail dots and plus tags folded, googlemail normalized to gmail; unique across Clerk accounts.';
COMMENT ON COLUMN masterchain_trials.clerk_user_id IS 'Clerk user id string, NOT the users.id UUID; deliberately no users foreign key.';
COMMENT ON COLUMN masterchain_trials.license_key IS 'Our signed Ed25519 v2 keyfile, persisted once for idempotent recovery; never unsigned.';
COMMENT ON COLUMN masterchain_trials.license_version IS 'Keyfile format version (LICENSE_VERSION).';
COMMENT ON COLUMN masterchain_trials.issued_at IS 'When this trial was issued; retries never extend it.';
COMMENT ON COLUMN masterchain_trials.expires_at IS 'UTC expiry signed into the keyfile, at whole-second precision.';
COMMENT ON COLUMN masterchain_trials.eula_version IS 'EULA revision explicitly accepted at issuance.';
COMMENT ON COLUMN masterchain_trials.eula_accepted_at IS 'Server timestamp of EULA acceptance at issuance.';
COMMENT ON COLUMN masterchain_trials.marketing_opt_in IS 'Explicit opt-in only; trial delivery is transactional and does not require it.';
COMMENT ON COLUMN masterchain_trials.first_touch IS 'Optional attribution supplied at the first claim; retries do not overwrite it.';
