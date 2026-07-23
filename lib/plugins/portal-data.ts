//
// User portal (P-2) — server-side data fetch for /dashboard/plugins. This is the enforcement point of
// the authorization contract (plan-brief §4#1): the DB query is scoped to the authenticated user's
// VERIFIED emails ONLY (server-side — a client-supplied email is never trusted). Kept as a thin,
// testable seam over the pure core (verifiedEmailsOf + buildPortalItems) so the "only my rows" and
// "fail-closed when no verified email" guarantees are unit-tested with a mocked DB.
import { and, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pluginEntitlements } from "@/db/schema";
import { verifiedEmailsOf, buildPortalItems, type PortalItem, type ClerkUserLike } from "@/lib/plugins/portal";

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
