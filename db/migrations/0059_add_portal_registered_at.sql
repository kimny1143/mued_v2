-- User portal — plugin_entitlements.portal_registered_at (North Star §③ registration signal).
--
-- PURE ADDITIVE (Tier 2, same precedent as 0058/first_touch/marketing_consents): a nullable timestamp
-- set best-effort ONCE when a signed-in owner first views /dashboard/plugins (lib/plugins/portal-data.ts
-- markPortalRegistered — scoped to the caller's VERIFIED emails, fail-open, only-if-NULL). It gives the
-- daily collector an authoritative "portal registered" signal that did not exist before (getPortalItems
-- was pure-read): cumulative = WHERE portal_registered_at IS NOT NULL, daily = ::date = :day.
--
-- Nullable + no default → existing rows stay NULL (not-yet-registered), which is the correct semantics.
ALTER TABLE plugin_entitlements ADD COLUMN IF NOT EXISTS portal_registered_at timestamp;
