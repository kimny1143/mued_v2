-- 0060 — masterchain license issuance metadata (C+ 完成 / 2026-07-26)
--
-- Context: the license ISSUER changed. `masterchain_purchases.license_key` was specified as "the key
-- FastSpring generated, which we merely record" (docs/paid-line/c-plus-…-design.md:90). That model
-- cannot work: the plugin verifies an Ed25519 signature against a public key compiled into the
-- binary, and FastSpring does not hold our private key. We now mint the keyfile ourselves
-- (lib/masterchain/license.ts), so the column holds OUR signed keyfile and needs its provenance.
--
-- PURE ADDITIVE — two nullable columns, no backfill, no rewrite of existing rows. Old code ignores
-- them; new code writes them. Same precedent as 0050 (first_touch) / 0053 / 0057 / 0059.
--
-- ★Why these two and not more: `issued_at` distinguishes "when we signed" from `created_at` ("when
-- the order arrived") — they diverge the moment a key is re-issued, which is exactly the situation
-- (signing-key rotation) where the distinction matters. `license_version` lets a future format change
-- be told apart from v1 without parsing the keyfile.
--
-- Apply: psql "$DATABASE_URL" -f db/migrations/0060_masterchain_license_issuance.sql
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE masterchain_purchases
  ADD COLUMN IF NOT EXISTS license_version integer;

ALTER TABLE masterchain_purchases
  ADD COLUMN IF NOT EXISTS issued_at timestamp;

COMMENT ON COLUMN masterchain_purchases.license_key IS
  'Ed25519 keyfile issued by us (lib/masterchain/license.ts) — NOT a FastSpring serial. With email, the only recovery path from a signing-key leak: verification is offline and nothing can be revoked remotely.';
COMMENT ON COLUMN masterchain_purchases.license_version IS 'keyfile format version (LICENSE_VERSION)';
COMMENT ON COLUMN masterchain_purchases.issued_at IS 'when the keyfile was signed (differs from created_at after a re-issue)';
