-- User portal — plugin_entitlements.locale (conductor dispatch 2026-08-29).
--
-- Which locale of the landing page a capture came from. The subscribe payload has carried `locale`
-- since P-1 (lib/plugins/subscribe-handler.ts:27) and uses it for the welcome email and the Resend
-- audience, but throws it away before recordPluginEntitlement — so the surface a person actually
-- used is not recorded anywhere.
--
-- ★WHAT THIS IS FOR, and what it is NOT. The original ask was "what share of subscribers are
-- Japanese"; that question closed on 2026-08-29 by census (ja = 0 of 82) and is NOT why this column
-- exists. It exists for the question the census raised instead: ★every Japanese-domain user in the
-- list registered through the ENGLISH landing page (.co.jp / .ne.jp addresses, all with English
-- subject lines) — which suggests the /ja/ pages may be barely used. ★This column measures WHICH
-- PAGE WAS USED. It is not an inference about a person's language or country, and must not be read
-- as one.
--
-- ★INTERPRETATION, so the first person to query it does not overcount. The zod schema is
-- `z.enum(["ja","en"]).default("en")`, so a request that omits locale is stored as 'en'. The shared
-- signup form always sends the real value (useLocale), so form traffic is genuine — but a direct API
-- call without the field lands in 'en' too. ★Therefore: a `ja` count is exact; an `en` count is an
-- UPPER bound. Rows written before this migration are NULL, which is neither.
--
-- PURE ADDITIVE (Tier 2): one nullable column on one table, no default, no backfill, no constraint.
-- Same precedent as first_touch (0050) / marketing_consents (0053) / masterchain (0057) /
-- portal_registered_at (0059). Existing rows keep working; nothing reads it yet.
--
-- ★★DEPLOY ORDER — THIS ONE BITES SILENTLY. Apply to PRODUCTION Neon BEFORE merging the code that
-- writes the column. recordPluginEntitlement is best-effort and SWALLOWS its errors (by design: a
-- portal-record failure must never break a subscribe response), so if the writer ships first, every
-- insert fails against a column that does not exist and ★every new entitlement is lost without a
-- single visible error. ★That is why the writer is deliberately NOT in the same pull request as this
-- file. prod apply = kimny (manual psql), as with 0046/0047/0058/0059.
--
-- Rollback: ALTER TABLE plugin_entitlements DROP COLUMN IF EXISTS locale;

ALTER TABLE plugin_entitlements
  ADD COLUMN IF NOT EXISTS locale text;  -- 'ja' | 'en'; NULL = written before this column existed

COMMENT ON COLUMN plugin_entitlements.locale IS
  'Landing-page locale the capture came from. ja = exact; en = upper bound (the zod default fills it when a request omits the field); NULL = pre-0061 row.';
