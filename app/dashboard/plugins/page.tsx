import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { getPortalItemsForUser, getPurchaseItemsForUser, getTrialItemForUser, markPortalRegistered } from "@/lib/plugins/portal-data";
import { MASTERCHAIN_TRIAL_LIVE } from "@/lib/masterchain/config";
import { buildAvailableItems } from "@/lib/plugins/portal";
import { windowsBetaFor } from "@/lib/plugins/windows-beta";
import {
  PluginsPortalView,
  type PortalViewItem,
  type AvailableViewItem,
  type PurchaseViewItem,
} from "./plugins-portal-view";

/**
 * User portal — /dashboard/plugins (P-2, docs/portal/plan-brief-user-portal-20260717.md).
 *
 * Server component: resolve the signed-in user, fetch ONLY the free-module entitlements owned by their
 * VERIFIED emails (getPortalItemsForUser — the authorization boundary; see plugin-portal-data.test.ts),
 * and render the rack. The DB query never leaves the server; the client gets only serializable portal
 * items (no licenseKey — that's P-4/paid). noindex is inherited from the dashboard layout's metadata.
 */
export const metadata = { title: "Your plugins — MUED" };

export default async function PluginsPortalPage() {
  const user = await currentUser();
  // Belt-and-suspenders: middleware already gates /dashboard(.*). The redirect_url returns the user
  // straight back here after sign-in (no sign-in loop — verify #3).
  //
  // The literal path is safe only because middleware runs first and handles the real bounce, query
  // string included (lib/middleware/sign-in-redirect.ts). This branch is reached only if that gate
  // stops covering /dashboard(.*) — and at that point this line would silently drop the query, which
  // is exactly the bug that made the welcome emails' campaign parameters vanish. If the matcher ever
  // changes, route this through buildSignInRedirectTarget too.
  if (!user) redirect("/sign-in?redirect_url=/dashboard/plugins");

  const items = await getPortalItemsForUser(user);
  // P-4 — the paid line. Same authorization boundary (verified emails only); see
  // plugin-portal-purchases.test.ts. Returns [] for everyone who has not bought.
  const purchases = await getPurchaseItemsForUser(user);
  const trial = MASTERCHAIN_TRIAL_LIVE ? await getTrialItemForUser(user) : null;
  // A replaced trial's key never crosses the server/client boundary.
  const trialViewItem = trial ? {
    licenseKey: purchases.length > 0 ? null : trial.licenseKey,
    expiresAtISO: trial.expiresAt.toISOString(),
    expired: trial.expiresAt.getTime() <= Date.now(),
  } : null;
  // North Star §③: record that this owner reached their portal (best-effort, fail-open, once). Does not
  // block or affect the render — a write error is swallowed inside markPortalRegistered.
  await markPortalRegistered(user);
  const viewItems: PortalViewItem[] = items.map((it) => ({
    pluginKey: it.pluginKey,
    i18nNamespace: it.i18nNamespace,
    version: it.version,
    downloadUrl: it.downloadUrl,
    // ★null when the module is included because they already hold another one (never claimed).
    claimedAtISO: it.claimedAt ? it.claimedAt.toISOString() : null,
    // ★Windows beta — null until WINDOWS_BETA_LIVE (the portal is the only place it is linked).
    windows: windowsBetaFor(it.pluginKey),
  }));

  // The live free modules this user does NOT own yet. Registry-derived and read-only — nothing is
  // written, and the alternative (bulk-inserting entitlement rows so the shelf looks right) was
  // rejected because it would put "never obtained it" rows into the table the funnel collector reads.
  const purchaseViewItems: PurchaseViewItem[] = purchases.map((p) => ({
    version: p.version,
    downloadUrl: p.downloadUrl,
    licenseKey: p.licenseKey, // ★verbatim — the keyfile is signed over its exact bytes; null once refunded
    purchasedAtISO: p.purchasedAt.toISOString(),
    refundedAtISO: p.refundedAt ? p.refundedAt.toISOString() : null,
    windows: p.windows, // null until masterchain for Windows ships (MASTERCHAIN_WINDOWS_LIVE)
  }));

  const available: AvailableViewItem[] = buildAvailableItems(items).map((a) => ({
    pluginKey: a.pluginKey,
    lpPath: a.lpPath,
  }));

  return (
    <MuednoteLayout>
      <PluginsPortalView items={viewItems} available={available} purchases={purchaseViewItems} trial={trialViewItem} />
    </MuednoteLayout>
  );
}
