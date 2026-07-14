//
// C+ — FastSpring `order.completed` handling for the paid MUEDsp masterchain ($69) (design #670).
//
// Two reflux effects per order (「棚は借りる・客は所有する」を $69 買い手にこそ):
//   - CRITICAL: record the buyer (email + FastSpring-issued license key) into the self-owned
//     masterchain_purchases ledger — idempotent on orderId. This is the ownership record + the
//     foundation for a future account/subscription layer. It runs in the webhook tx; a failure
//     rolls back → 5xx → FastSpring retries (dedup by orderId).
//   - FAIL-OPEN (never blocks fulfillment): GA4 MP purchase (reusing #664's trackServerPurchase,
//     the second rail paired with Stripe/dial), the transactional welcome/delivery email (key + DL
//     link — TODO, needs an email.service method + copy), and the buyers marketing audience add
//     (consent-gated per #670 — a purchase is not itself a marketing opt-in).
//
// The order.completed payload SHAPE is placeholder here (parseFastspringOrderCompleted): the exact
// field paths + the popup custom-tags carrying gaClientId/utm are confirmed at C1 against a `.test.`
// storefront order (Kevin 審査後). Everything else (record, GA4 mapping, idempotency) is real.
import { trackServerPurchase, type GA4PurchaseParams } from "@/lib/analytics/ga4-server";
import { masterchainPurchases } from "@/db/schema";
import { addMasterchainContact } from "@/lib/masterchain/audience";
import { logger } from "@/lib/utils/logger";
import { db } from "@/db";

// ── safe JSON access (lint-clean, no `any`) for the untyped external payload ───────────────────────
type Json = Record<string, unknown>;
const asObj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const asStr = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const asNum = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

export interface FastspringOrderParsed {
  orderId: string;
  email: string;
  licenseKey?: string;
  productId: string;
  amountCents?: number;
  currency?: string;
  buyerCountry?: string;
  gaClientId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** buyer opted into product-update marketing (from a popup consent tag). Gates the audience add. */
  marketingConsent?: boolean;
}

/**
 * Parse a FastSpring `order.completed` event into the fields we record + attribute.
 * Returns null when the minimum (orderId + email) is absent.
 *
 * TODO(C1): the field paths below are the documented shape; confirm each against a real `.test.`
 * storefront order.completed payload (license-key fulfillment path + our custom tags) and adjust.
 */
export function parseFastspringOrderCompleted(event: unknown): FastspringOrderParsed | null {
  const e = asObj(event);
  const data = asObj(e.data);
  const account = asObj(data.account);
  const contact = asObj(account.contact);
  const address = asObj(data.address);
  const tags = asObj(data.tags); // custom tags set on the popup session (gaClientId + utm*)

  const orderId = asStr(data.order) ?? asStr(data.id) ?? asStr(e.id);
  const email = asStr(contact.email) ?? asStr(asObj(data.customer).email);
  if (!orderId || !email) return null;

  const total = asNum(data.total) ?? asNum(data.totalInPayoutCurrencyValue);

  return {
    orderId,
    email: email.toLowerCase().trim(),
    licenseKey: firstLicenseKey(data), // TODO(C1): confirm fulfillment path
    productId: "muedsp_masterchain",
    amountCents: total !== undefined ? Math.round(total * 100) : undefined,
    currency: asStr(data.currency),
    buyerCountry: asStr(address.country),
    gaClientId: asStr(tags.gaClientId),
    utmSource: asStr(tags.utmSource),
    utmMedium: asStr(tags.utmMedium),
    utmCampaign: asStr(tags.utmCampaign),
    utmContent: asStr(tags.utmContent),
    utmTerm: asStr(tags.utmTerm),
    marketingConsent: tags.marketingConsent === true || tags.marketingConsent === "true",
  };
}

/** Best-effort dig for the first issued license key. TODO(C1): confirm the real fulfillments path. */
function firstLicenseKey(data: Json): string | undefined {
  const items = Array.isArray(data.items) ? data.items : [];
  for (const it of items) {
    const fulfillments = asObj(asObj(it).fulfillments);
    for (const key of Object.keys(fulfillments)) {
      const list = fulfillments[key];
      if (Array.isArray(list)) {
        for (const f of list) {
          const lic = asStr(asObj(f).license) ?? asStr(asObj(f).value);
          if (lic) return lic;
        }
      }
    }
  }
  return undefined;
}

const ITEM_NAME = "MUEDsp masterchain";

/**
 * Build the GA4 purchase event from a parsed FastSpring order. Pure; returns null when there is no
 * GA client_id (GA4 MP requires one) — the caller then skips the event (same guard as #664/dial).
 */
export function buildMasterchainPurchaseEvent(parsed: FastspringOrderParsed): GA4PurchaseParams | null {
  const gaClientId = parsed.gaClientId?.trim();
  if (!gaClientId) return null;
  const utm = {
    source: parsed.utmSource,
    medium: parsed.utmMedium,
    campaign: parsed.utmCampaign,
    content: parsed.utmContent,
    term: parsed.utmTerm,
  };
  const hasUtm = Object.values(utm).some((v) => typeof v === "string" && v.length > 0);
  return {
    clientId: gaClientId,
    transactionId: parsed.orderId, // FastSpring order id → GA4 dedup on webhook retry
    value: (parsed.amountCents ?? 0) / 100,
    currency: (parsed.currency || "usd").toUpperCase(),
    itemName: ITEM_NAME,
    itemId: parsed.productId,
    utm: hasUtm ? utm : undefined,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Handle a verified, deduped `order.completed`. The buyer record is CRITICAL (awaited, in tx); the
 * GA4 purchase, buyers-audience add, and welcome email are FAIL-OPEN (never block fulfillment).
 */
export async function handleFastspringOrderCompleted(tx: Tx, event: unknown): Promise<void> {
  const parsed = parseFastspringOrderCompleted(event);
  if (!parsed) {
    logger.error("[fastspring] order.completed missing orderId/email — skipped");
    return;
  }

  // CRITICAL — self-owned buyer + license-key record (idempotent on orderId).
  await tx
    .insert(masterchainPurchases)
    .values({
      orderId: parsed.orderId,
      email: parsed.email,
      licenseKey: parsed.licenseKey,
      productId: parsed.productId,
      amountCents: parsed.amountCents,
      currency: parsed.currency,
      buyerCountry: parsed.buyerCountry,
      firstTouch: {
        gaClientId: parsed.gaClientId,
        utmSource: parsed.utmSource,
        utmMedium: parsed.utmMedium,
        utmCampaign: parsed.utmCampaign,
        utmContent: parsed.utmContent,
        utmTerm: parsed.utmTerm,
      },
    })
    .onConflictDoNothing({ target: masterchainPurchases.orderId });

  // FAIL-OPEN — GA4 purchase (second rail, paired with Stripe #664). Reuses ga4-server unchanged.
  const ga = buildMasterchainPurchaseEvent(parsed);
  if (ga) {
    trackServerPurchase(ga).catch((err) =>
      logger.error("[fastspring] GA4 purchase event failed", { error: String(err) }));
  }

  // FAIL-OPEN — buyers marketing audience add, CONSENT-GATED (#670): a purchase is not a marketing
  // opt-in. TODO(C4): finalize the opt-in capture (popup checkbox tag / double-opt-in). Until then a
  // buyer without an explicit consent tag is NOT added — the transactional welcome (below) still sends.
  if (parsed.marketingConsent) {
    addMasterchainContact("buyers", { email: parsed.email }).catch((err) =>
      logger.error("[fastspring] buyers audience add failed", { error: String(err) }));
  }

  // TODO(C+): transactional welcome/delivery email (license key + self-hosted DL link) — FastSpring's
  // DL link expires in 7 days, so our own delivery is the durable "客を所有する" touch. Needs an
  // email.service method + content copy; fail-open like the plugin welcome. Deferred to the email step.
}
