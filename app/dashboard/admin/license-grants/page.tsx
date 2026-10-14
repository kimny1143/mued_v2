import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/middleware/admin";
import { GRANT_ISSUER_USER_IDS, GRANTABLE_PRODUCTS, MAX_GRANT_MINUTES } from "@/lib/plugins/license-grants";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";
import { LicenseGrantsForm } from "./license-grants-form";

/**
 * /dashboard/admin/license-grants — the one screen for handing a tester a time-limited key.
 * ★Same gate as the API it posts to (kimny + admin role); anyone else gets the site's 404.
 * ★Operator-only and Japanese-only on purpose: one person uses it. noindex comes from the dashboard layout.
 */
export const metadata = { title: "License grants — MUED" };
export const dynamic = "force-dynamic";

export default async function LicenseGrantsPage() {
  const { userId } = await auth();
  if (!userId || !GRANT_ISSUER_USER_IDS.includes(userId) || !(await isAdmin(userId))) notFound();
  // The picker lists exactly what the API accepts, in its order (the first, MUEDvox, is the default).
  const products = GRANTABLE_PRODUCTS.map((key) => ({ key, label: PAID_PRODUCTS[key].displayName }));
  return <LicenseGrantsForm maxDays={MAX_GRANT_MINUTES / 1440} products={products} />;
}
