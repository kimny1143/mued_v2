//
// User portal (P-2) — server-side data fetch for /dashboard/plugins. This is the enforcement point of
// the authorization contract (plan-brief §4#1): the DB query is scoped to the authenticated user's
// VERIFIED emails ONLY (server-side — a client-supplied email is never trusted). Kept as a thin,
// testable seam over the pure core (verifiedEmailsOf + buildPortalItems) so the "only my rows" and
// "fail-closed when no verified email" guarantees are unit-tested with a mocked DB.
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pluginEntitlements, masterchainPurchases, masterchainTrials, pluginLicenseGrants } from "@/db/schema";
import {
  verifiedEmailsOf,
  buildPortalItems,
  buildPurchaseItems,
  buildGrantItems,
  type PortalItem,
  type PurchaseItem,
  type GrantItem,
  type ClerkUserLike,
} from "@/lib/plugins/portal";
import { MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION } from "@/lib/masterchain/config";
import { paidProductByProductId } from "@/lib/plugins/paid-products";
import { MUEDVOX_DOWNLOAD_URL, MUEDVOX_WINDOWS_URL, MUEDVOX_WINDOWS_VERSION } from "@/lib/muedvox/config";
import { masterchainWindowsBuild } from "@/lib/plugins/windows-beta";

/** Trial ownership requires BOTH a verified email and the issuing Clerk account. */
export async function getTrialItemForUser(user: (ClerkUserLike & { id?: string }) | null | undefined) {
  const emails = verifiedEmailsOf(user);
  if (!user?.id || emails.length === 0) return null;

  const [row] = await db
    .select({ licenseKey: masterchainTrials.licenseKey, expiresAt: masterchainTrials.expiresAt })
    .from(masterchainTrials)
    .where(and(
      inArray(masterchainTrials.email, emails),
      eq(masterchainTrials.clerkUserId, user.id),
    ))
    .limit(1);
  return row ?? null;
}

/**
 * The free-module portal items owned by `user`, resolved by the user's VERIFIED emails only.
 * Fail-closed: with no verified email the query is NOT run and [] is returned (never "everything").
 * Selects only pluginKey + createdAt — there is no license/PII column on this table, and P-2 emits no
 * licenseKey (that's P-4/paid). The registry supplies the current version + download URL at assembly.
 */
export async function getPortalItemsForUser(user: ClerkUserLike | null | undefined): Promise<PortalItem[]> {
  const emails = verifiedEmailsOf(user);
  if (emails.length === 0) return []; // fail-closed — no verified email owns nothing

  const rows = await db
    .select({ pluginKey: pluginEntitlements.pluginKey, createdAt: pluginEntitlements.createdAt })
    .from(pluginEntitlements)
    .where(inArray(pluginEntitlements.email, emails)); // scoped to the caller's verified emails ONLY

  return buildPortalItems(rows);
}

/**
 * Best-effort: mark the caller's owned entitlements as "portal registered" the first time a signed-in
 * owner views their portal (North Star §③ registration signal; column 0059). Scoped to the caller's
 * VERIFIED emails ONLY — the SAME authorization boundary as getPortalItemsForUser, so it can only touch
 * rows the caller already owns (never a client-supplied email) — and writes only rows still NULL, so the
 * first view wins (idempotent). Writes nothing but a timestamp; carries no auth/session logic.
 *
 * FAIL-OPEN: a write error must NEVER break the portal render (this is a metrics signal, not the DL
 * experience), so it is swallowed. Fire from the authenticated page after resolving the user.
 */
export async function markPortalRegistered(user: ClerkUserLike | null | undefined): Promise<void> {
  const emails = verifiedEmailsOf(user);
  if (emails.length === 0) return; // fail-closed — no verified email → nothing owned to mark
  try {
    await db
      .update(pluginEntitlements)
      .set({ portalRegisteredAt: new Date() })
      .where(and(
        inArray(pluginEntitlements.email, emails),      // caller's verified emails ONLY
        isNull(pluginEntitlements.portalRegisteredAt),  // first view wins (idempotent, no clobber)
      ));
  } catch {
    // FAIL-OPEN — registration tracking must never break the portal/DL experience.
  }
}

/**
 * P-4 — the paid purchases owned by `user`, resolved by the user's VERIFIED emails only.
 *
 * ★SAME authorization boundary as getPortalItemsForUser, deliberately: one seam, one place to get it
 * wrong, one place the Tier-3 test points at. A second path "just for the paid line" is how the two
 * drift until only one of them checks verification.
 * ★Fail-closed: with no verified email the query is NOT run and [] is returned (never "everything").
 * ★Selects only productId + licenseKey + createdAt + refundedAt. The row also carries amount / order id / EULA columns; none of
 * them belong on this screen, and not selecting them means a future view change cannot leak them.
 */
export async function getPurchaseItemsForUser(user: ClerkUserLike | null | undefined): Promise<PurchaseItem[]> {
  const emails = verifiedEmailsOf(user);
  if (emails.length === 0) return []; // fail-closed — no verified email owns nothing

  const rows = await db
    .select({
      productId: masterchainPurchases.productId,
      licenseKey: masterchainPurchases.licenseKey,
      createdAt: masterchainPurchases.createdAt,
      refundedAt: masterchainPurchases.refundedAt,
    })
    .from(masterchainPurchases)
    .where(inArray(masterchainPurchases.email, emails)); // scoped to the caller's verified emails ONLY

  return buildPurchaseItems(rows, paidDistribution);
}

/** Where a paid product's installers are today — shared by purchases and grants, so the two rows cannot differ. */
function paidDistribution(productId: string) {
  const product = paidProductByProductId(productId);
  if (!product) return null;
  switch (product.key) {
    case "masterchain":
      return { product, downloadUrl: MASTERCHAIN_DOWNLOAD_URL,
        windows: masterchainWindowsBuild(MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION) };
    case "muedvox":
      return { product, downloadUrl: MUEDVOX_DOWNLOAD_URL,
        windows: MUEDVOX_WINDOWS_URL ? { url: MUEDVOX_WINDOWS_URL, version: MUEDVOX_WINDOWS_VERSION } : null };
    default: {
      const exhaustive: never = product.key;
      throw new Error(`Unhandled paid product: ${exhaustive}`);
    }
  }
}

/**
 * The time-limited keys we handed to `user` (plugin_license_grants — testers), resolved by the user's VERIFIED
 * emails only. ★The SAME authorization boundary as purchases: a grant is issued to an address, and only someone who
 * has proved they hold that address sees it — so it can be issued before the person has an account.
 * ★Fail-closed: no verified email → the query is NOT run. ★Fail-open on a DB error: this table is newer than the
 *   portal, and a missing table (migration 0064 not applied yet) must not take the whole page down — the row is
 *   simply absent.
 */
export async function getGrantItemsForUser(user: ClerkUserLike | null | undefined): Promise<GrantItem[]> {
  const emails = verifiedEmailsOf(user);
  if (emails.length === 0) return [];
  try {
    const rows = await db
      .select({
        productId: pluginLicenseGrants.productId,
        licenseKey: pluginLicenseGrants.licenseKey,
        issuedAt: pluginLicenseGrants.issuedAt,
        expiresAt: pluginLicenseGrants.expiresAt,
      })
      .from(pluginLicenseGrants)
      .where(inArray(pluginLicenseGrants.email, emails)); // scoped to the caller's verified emails ONLY
    return buildGrantItems(rows, paidDistribution);
  } catch {
    return [];
  }
}
