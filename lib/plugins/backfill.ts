//
// User portal P-3 (docs/portal/plan-brief-user-portal-20260717.md) — pure transform for the one-shot
// backfill of plugin_entitlements from the existing Resend audiences (the only record of the free-
// download leads that predate P-1's write, ~250 people). Kept pure so the dedup/normalization contract
// is unit-tested without Resend or the DB (the script wrapper lives in scripts/backfill-plugin-
// entitlements.ts and its RUN is gated = kimny/conductor).
//
// ★COMPLIANCE CONTRACT (conductor 2026-07-17) — ownership record ≠ send permission. This transform
// INCLUDES unsubscribed contacts on purpose: the entitlements table is the truth of who OWNS a free
// module (an audience opt-out is not a download revocation, and the portal is not email). But the P-3
// announcement email ("your portal is ready") must be sent to SUBSCRIBED contacts ONLY — send via the
// Resend audience broadcast (auto-suppresses unsubscribed) by default; a manual send must filter the
// recipient list to entitlements MINUS unsubscribed. Do NOT reuse this ownership set as a send list.
import type { PluginKey } from "@/lib/plugins/registry";

/** Minimal Resend contact shape the transform reads (decoupled from the Resend SDK types). */
export interface ResendContactLite {
  email?: string | null;
  unsubscribed?: boolean;
}

/** A plugin_entitlements insert row produced by the backfill (email-keyed; user_id stays null). */
export interface EntitlementBackfillRow {
  email: string;
  pluginKey: PluginKey;
  source: string;
}

/**
 * Transform a plugin's Resend audience contacts → plugin_entitlements rows. Lower-cases + de-dupes the
 * email and drops blanks. INCLUDES unsubscribed contacts by design: an audience unsubscribe is a
 * marketing-email preference, NOT a revocation of the download the person already owns — and the portal
 * is not email, so they should still see their plugin if they sign in. source = '{plugin}_backfill' so
 * a backfilled row is distinguishable from a live subscribe capture ('{plugin}_lp').
 */
export function contactsToEntitlementRows(
  plugin: PluginKey,
  contacts: readonly ResendContactLite[] | null | undefined,
): EntitlementBackfillRow[] {
  const rows: EntitlementBackfillRow[] = [];
  const seen = new Set<string>();
  for (const c of contacts ?? []) {
    const email = c?.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    rows.push({ email, pluginKey: plugin, source: `${plugin}_backfill` });
  }
  return rows;
}
