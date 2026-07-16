//
// User portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md) — the SECURITY CORE, kept pure
// and framework-free so the authorization contract is unit-tested directly (conductor's non-negotiable
// Tier3 condition, plan-brief §4#1).
//
// Two responsibilities, both auth-critical:
//   1. verifiedEmailsOf(user)  — the ONLY legitimate ownership key set: the user's VERIFIED emails.
//   2. buildPortalItems(entitlements) — map owned free modules → current distributable (registry
//      version + DL url). It emits NO licenseKey (P-2 = free modules only; licenseKey is introduced in
//      P-4 for paid masterchain). PortalItem structurally has no licenseKey field — a leak is a compile
//      error, not just a runtime omission.
//
// The DB query that filters entitlements to `email = ANY(verifiedEmailsOf(user))` lives in the server
// component (app/dashboard/plugins) — never trust a client-supplied email. This module does the pure
// transforms around that query.
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";

/** Structural shape of a Clerk email address — avoids a hard Clerk type dependency in this pure module. */
export interface ClerkEmailLike {
  emailAddress: string;
  verification?: { status?: string | null } | null;
}
export interface ClerkUserLike {
  emailAddresses?: ClerkEmailLike[] | null;
}

/**
 * The set of the user's VERIFIED email addresses, lower-cased and de-duplicated. This is the ONLY
 * legitimate ownership key for the portal: an UNVERIFIED email must never grant access to that
 * address's entitlements (else a user could claim another person's downloads by merely adding their
 * address unverified). Returns [] when there is no verified email → the portal shows NOTHING, never
 * everything (fail-closed).
 */
export function verifiedEmailsOf(user: ClerkUserLike | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of user?.emailAddresses ?? []) {
    if (e?.verification?.status !== "verified") continue; // fail-closed: only verified counts
    const email = e.emailAddress?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/**
 * A portal row for a free module the user owns. Structurally has NO `licenseKey` field — the P-2
 * server response cannot carry one (conductor's non-negotiable condition). The page renders the
 * localized product name from `i18nNamespace`.
 */
export interface PortalItem {
  pluginKey: PluginKey;
  i18nNamespace: string;
  version: string;
  downloadUrl: string;
  claimedAt: Date;
}

/** Minimal entitlement shape the assembler consumes (decoupled from the Drizzle row). */
export interface OwnedEntitlement {
  pluginKey: string;
  createdAt: Date;
}

/**
 * Map a user's owned free-module entitlements → portal rows using the distribution registry (current
 * version + download URL). The caller MUST pass entitlements already filtered to verifiedEmailsOf() on
 * the server. Unknown/legacy plugin keys are skipped; duplicates collapse (defense — UNIQUE(email,
 * plugin_key) already prevents dupes per email, but a multi-verified-email user could own the same
 * plugin under two addresses). NEVER emits a licenseKey. Ordered newest-claim-first for display.
 */
export function buildPortalItems(entitlements: readonly OwnedEntitlement[] | null | undefined): PortalItem[] {
  const items: PortalItem[] = [];
  const seen = new Set<string>();
  for (const e of entitlements ?? []) {
    const key = e.pluginKey as PluginKey;
    const dist = PLUGIN_DIST[key];
    if (!dist || seen.has(key)) continue; // unknown/legacy key → skip; dedup a plugin owned twice
    seen.add(key);
    items.push({
      pluginKey: key,
      i18nNamespace: dist.i18nNamespace,
      version: dist.version,
      downloadUrl: dist.downloadUrl,
      claimedAt: e.createdAt,
    });
  }
  items.sort((a, b) => b.claimedAt.getTime() - a.claimedAt.getTime()); // newest claim first
  return items;
}
