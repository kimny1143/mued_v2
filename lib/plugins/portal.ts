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
import type { PaidProduct, PaidProductKey } from "@/lib/plugins/paid-products";
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
  /**
   * When this person claimed it — ★null for a module included because they already hold another one.
   * ★Null rather than a stand-in date: they never claimed it, and inventing a date to make the rows
   * look uniform would put a fact on screen that no one measured. The view renders those rows with a
   * different line instead.
   */
  claimedAt: Date | null;
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
  items.sort((a, b) => (b.claimedAt?.getTime() ?? 0) - (a.claimedAt?.getTime() ?? 0)); // newest claim first

  // ★THE FREE FAMILY IS ALL-OR-NOTHING once you are in it (kimny 2026-08-29). MUEDsat and MUEDlim were
  //   backfilled onto existing owners' shelves in July; MUEDrive was not, so the same uniform portal
  //   showed those people a "get it" card for a module the announcement email had already called
  //   theirs, and asked for their email a second time. kimny, verbatim: 「そしてポータルも他の２つと
  //   やり方が違う」. ★The portal code was identical for all three — what differed was history.
  //
  // ★Scoped to people who already hold at least one: someone with nothing has not given us an email
  //   yet, and the gate that captures it is the point. So the empty shelf is unchanged.
  //
  // ★KNOWN AND INTENDED CONSEQUENCE, recorded so it is not read as a bug later: a person who took
  //   ONLY MUEDrive today now also sees MUEDsat and MUEDlim on their shelf. That is consistent with
  //   having announced all three as free, and it is the same affordance running in the other
  //   direction. It is a visible change; it is not a defect.
  //
  // ★Nothing is written. This is a view over the registry, not a grant recorded in
  //   plugin_entitlements — that table keeps meaning "actually obtained", which is what the funnel
  //   collector's north-star denominator reads.
  //
  // ★★∴ THESE DOWNLOADS DO NOT APPEAR IN THAT DENOMINATOR (product課, 2026-08-29). An included tile
  //   renders the same direct .pkg link as a claimed one, so a MUEDsat owner can take MUEDrive without
  //   passing the email gate — intended — but no row is created, so MUEDrive's obtained count reads
  //   LOW, and "low" is indistinguishable from "not visible to this instrument" in the numbers alone.
  //   ★A trade-off, not a defect: the alternative was writing rows for people who never obtained the
  //   module, which is the thing this table exists to not say. ★Written down so that someone reading
  //   the north-star in six months does not take the low figure for the reality.
  if (items.length > 0) {
    for (const dist of Object.values(PLUGIN_DIST)) {
      if (!dist.live || seen.has(dist.key)) continue;
      items.push({
        pluginKey: dist.key,
        i18nNamespace: dist.i18nNamespace,
        version: dist.version,
        downloadUrl: dist.downloadUrl,
        claimedAt: null, // ★included, not claimed
      });
    }
  }
  return items;
}

/** A live free module the user does NOT own yet — the portal's "get it" affordance. */
export interface AvailableItem {
  pluginKey: PluginKey;
  i18nNamespace: string;
  /** Landing-page path (locale-prefixed by the view). ★NOT the .pkg — see PluginDist.lpPath. */
  lpPath: string;
}

/**
 * The live free modules a user does NOT own yet.
 *
 * ★WHY THIS EXISTS (2026-08-29). The portal renders only what `plugin_entitlements` records, and it
 * had no branch for anything else — so someone holding two of the three modules saw two tiles and no
 * way to reach the third. The announcement email for MUEDrive told an existing list the module was
 * "already on your shelf", and for anyone who had not downloaded it the shelf disagreed.
 *
 * ★The alternative considered and rejected was bulk-inserting entitlement rows for the announcement
 * list. That would have put "never obtained it" rows into the table the funnel collector reads, to
 * work around a missing affordance — and the next module would land in exactly the same state.
 * Nothing is written here: this is a catalogue view of the registry minus what the caller owns.
 *
 * `live` is honoured, so a staged module stays invisible. Order follows the registry (stable).
 */
export function buildAvailableItems(owned: readonly { pluginKey: string }[] | null | undefined): AvailableItem[] {
  const ownedKeys = new Set((owned ?? []).map((o) => o.pluginKey));
  const out: AvailableItem[] = [];
  for (const dist of Object.values(PLUGIN_DIST)) {
    if (!dist.live) continue;            // staged module — not discoverable yet
    if (ownedKeys.has(dist.key)) continue;
    out.push({ pluginKey: dist.key, i18nNamespace: dist.i18nNamespace, lpPath: dist.lpPath });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// P-4 — the PAID line. Kept separate from buildPortalItems on purpose: that function documents
// "NEVER emits a licenseKey", and the way to keep that true is for the licence path to be a
// different function with its own type, not a nullable field threaded through the free one.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal purchase shape the assembler consumes (decoupled from the Drizzle row). */
export interface OwnedPurchase {
  productId: string;
  licenseKey: string | null;
  createdAt: Date;
  /** Set by a FULL refund / chargeback (return.created). */
  refundedAt?: Date | null;
}

export interface PurchaseItem {
  productKey: PaidProductKey;
  displayName: string;
  keyFileName: string;
  /**
   * ★Derived from the download URL, not stored in a second constant. The free modules keep
   * `*_VERSION` and `*_DOWNLOAD_URL` side by side and plugin-version-matches-download.test.ts exists
   * precisely because "the same fact lives in two constants, so they WILL drift again". Adding
   * MASTERCHAIN_VERSION would buy that problem for a value the URL already carries.
   * ★Null when the filename carries no parseable version — the row still renders, without a version.
   */
  version: string | null;
  downloadUrl: string;
  /**
   * ★Only ever the caller's OWN row — the query upstream is scoped to their verified emails.
   * ★null for a refunded purchase: the key does not cross to the client at all (like a replaced trial).
   */
  licenseKey: string | null;
  purchasedAt: Date;
  /** When it was refunded in full (or charged back); null otherwise. */
  refundedAt: Date | null;
  /** The Windows build (VST3) — null until masterchain for Windows ships, and for a refunded purchase. */
  windows: { url: string; version: string } | null;
}

/** "…/MUEDsp-masterchain-0.1.3-installer.pkg" → "0.1.3". Null when the filename carries none. */
function versionInUrl(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/-(\d+\.\d+\.\d+)(?:-[a-z]+)?-installer\.pkg$/);
    return m ? m[1] : null;
  } catch {
    return null; // a malformed/relative URL must not throw the whole shelf
  }
}

/**
 * Map a buyer's paid purchases → portal rows. The caller MUST pass rows already filtered to
 * verifiedEmailsOf() on the server.
 *
 * ★Rows with no licenseKey are SKIPPED, not rendered blank. A purchase row exists from the moment the
 * webhook lands; the key is written in the same handler, but a partially-written row (or a legacy row
 * from before issuance moved in-house) would otherwise put an empty "copy this" box on the buyer's
 * screen — which looks like the key was lost. Showing nothing is honest; showing an empty box is not.
 * ★Deduped by licenceKey: one buyer with two verified addresses must not see the same key twice.
 * Ordered newest purchase first.
 */
export function buildPurchaseItems(
  purchases: readonly OwnedPurchase[] | null | undefined,
  resolve: (productId: string) => {
    product: PaidProduct;
    downloadUrl: string;
    windows: { url: string; version: string } | null;
  } | null,
): PurchaseItem[] {
  const items: PurchaseItem[] = [];
  const seen = new Set<string>();
  for (const p of purchases ?? []) {
    const resolved = resolve(p.productId);
    if (!resolved) continue;
    const { product, downloadUrl, windows } = resolved;
    const raw = p.licenseKey;
    // ★Emptiness is judged on a trimmed copy; the value we EMIT is verbatim. The keyfile is signed
    // over its exact bytes (licence.ts "prefix rule": nothing is re-serialised or normalised on
    // either side), and it ends with a newline. Trimming it for tidiness would hand the buyer bytes
    // we never signed — a mutation visible only at offline verification, i.e. only to purchasers.
    if (!raw || raw.trim() === "" || seen.has(raw)) continue;
    seen.add(raw);
    const refundedAt = p.refundedAt ?? null;
    items.push({
      productKey: product.key,
      displayName: product.displayName,
      keyFileName: product.keyFileName,
      version: versionInUrl(downloadUrl),
      downloadUrl,
      // ★A refunded purchase keeps its row on the shelf, marked — but the key is not handed out again.
      licenseKey: refundedAt ? null : raw,
      purchasedAt: p.createdAt,
      refundedAt,
      windows: refundedAt ? null : windows,
    });
  }
  items.sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());
  return items;
}

/** A time-limited key we handed out ourselves (plugin_license_grants) — a tester's loan, never a purchase. */
export interface OwnedGrant {
  productId: string;
  licenseKey: string;
  issuedAt: Date;
  expiresAt: Date;
}

/**
 * A portal row for a grant. ★Its own type, with no "purchased" field: the page cannot print "purchased on" for it.
 * The key stays downloadable after the expiry (the plugin itself falls back to its demo); `expired` only labels it.
 */
export interface GrantItem {
  productKey: PaidProductKey;
  displayName: string;
  keyFileName: string;
  version: string | null;
  downloadUrl: string;
  windows: { url: string; version: string } | null;
  licenseKey: string;
  issuedAt: Date;
  expiresAt: Date;
  expired: boolean;
}

/**
 * Map a person's grants → portal rows. The caller MUST pass rows already filtered to verifiedEmailsOf() on the
 * server. Deduped by key; ★the latest expiry first, so an extension sits above the key it extends.
 */
export function buildGrantItems(
  grants: readonly OwnedGrant[] | null | undefined,
  resolve: (productId: string) => {
    product: PaidProduct;
    downloadUrl: string;
    windows: { url: string; version: string } | null;
  } | null,
  now: Date = new Date(),
): GrantItem[] {
  const items: GrantItem[] = [];
  const seen = new Set<string>();
  for (const g of grants ?? []) {
    const resolved = resolve(g.productId);
    if (!resolved) continue;
    if (!g.licenseKey || g.licenseKey.trim() === "" || seen.has(g.licenseKey)) continue;
    seen.add(g.licenseKey);
    items.push({
      productKey: resolved.product.key,
      displayName: resolved.product.displayName,
      keyFileName: resolved.product.keyFileName,
      version: versionInUrl(resolved.downloadUrl),
      downloadUrl: resolved.downloadUrl,
      windows: resolved.windows,
      licenseKey: g.licenseKey,
      issuedAt: g.issuedAt,
      expiresAt: g.expiresAt,
      expired: g.expiresAt.getTime() <= now.getTime(),
    });
  }
  items.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
  return items;
}
