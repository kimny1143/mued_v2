import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { getPortalItemsForUser, markPortalRegistered } from "@/lib/plugins/portal-data";
import { PluginsPortalView, type PortalViewItem } from "./plugins-portal-view";

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
  if (!user) redirect("/sign-in?redirect_url=/dashboard/plugins");

  const items = await getPortalItemsForUser(user);
  // North Star §③: record that this owner reached their portal (best-effort, fail-open, once). Does not
  // block or affect the render — a write error is swallowed inside markPortalRegistered.
  await markPortalRegistered(user);
  const viewItems: PortalViewItem[] = items.map((it) => ({
    pluginKey: it.pluginKey,
    i18nNamespace: it.i18nNamespace,
    version: it.version,
    downloadUrl: it.downloadUrl,
    claimedAtISO: it.claimedAt.toISOString(),
  }));

  return (
    <MuednoteLayout>
      <PluginsPortalView items={viewItems} />
    </MuednoteLayout>
  );
}
