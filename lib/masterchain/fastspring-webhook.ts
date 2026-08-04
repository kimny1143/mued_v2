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
import { issueLicense, LICENSE_VERSION } from "@/lib/masterchain/license";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { eq } from "drizzle-orm";
import { db } from "@/db";

// ── safe JSON access (lint-clean, no `any`) for the untyped external payload ───────────────────────
type Json = Record<string, unknown>;
const asObj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const asStr = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const asNum = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

export interface FastspringOrderParsed {
  orderId: string;
  email: string;
  /** Buyer name for the license payload. Empty string when FastSpring gives us no name. */
  name: string;
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

  // ★fallback を外した (freee課 検出 2026-08-04)。`data.total` は購入者通貨、
  // `totalInPayoutCurrencyValue` は支払通貨 (USD) で、`currency` は常に購入者通貨を入れる。
  // ∴ fallback が発火した行は「通貨欄 JPY・金額欄 USD」になり、$69 と ¥12,856 で
  // 桁が約150倍ずれる。★金額は、欠けているより間違っている方が高くつく。
  // 欠けた場合は undefined のままにし、FastSpring の Line Item Detail Export から
  // 後で補う (fee/tax/net と同じ経路・freee課 7/27)。
  const total = asNum(data.total);

  const first = asStr(contact.first) ?? "";
  const last = asStr(contact.last) ?? "";

  return {
    orderId,
    email: email.toLowerCase().trim(),
    name: [first, last].filter(Boolean).join(" ").trim(),
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

// ── REMOVED: firstLicenseKey() ────────────────────────────────────────────────────────────────────
// It dug through `data.items[].fulfillments[]` for a key FastSpring had generated and placed in the
// order payload, and carried `TODO(C1): confirm the real fulfillments path` because that shape was
// never checked against a real order.
//
// ★It is gone because the ISSUER CHANGED (2026-07-25, product): we mint the license ourselves with
// Ed25519 (lib/masterchain/license.ts). FastSpring cannot produce a signature the plugin will accept
// — it does not hold our private key — so there is no FastSpring-generated key to read back. We do
// not learn the key from the payload; we already have it, because we made it.
//
// docs/paid-line/c-plus-fastspring-reflux-webhook-design.md:90 still describes the old model and is
// SUPERSEDED; the note there points here.

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
 * Handle a verified, deduped `order.completed`.
 *
 * CRITICAL (awaited, in tx, a failure rolls the tx back → 5xx → FastSpring retries):
 *   - the buyer + issued-license record. ★This ledger is the ONLY recovery path if the signing key
 *     ever leaks: verification is offline with no revocation, so the only fix is "re-issue to every
 *     known buyer, then drop the old key in a new plugin build". Without the buyer list that is
 *     impossible. It is a business-continuity requirement, not a feature (conductor/dsp, 2026-07-26).
 *   - the license issuance itself, and its delivery email — the buyer cannot use the product without
 *     the key, so a delivery failure must NOT be swallowed. Same doctrine as the free-plugin gate in
 *     lib/plugins/subscribe-handler.ts: "Delivery is HONEST, not fake-open".
 *
 * FAIL-OPEN (never blocks fulfillment): GA4 purchase, buyers-audience add.
 */
export async function handleFastspringOrderCompleted(tx: Tx, event: unknown): Promise<void> {
  const parsed = parseFastspringOrderCompleted(event);
  if (!parsed) {
    logger.error("[fastspring] order.completed missing orderId/email — skipped");
    return;
  }

  // ── issue the license, ONCE per order ───────────────────────────────────────────────────────────
  // ★Idempotency is on the STORED keyfile, not on issueLicense(): the payload carries `issuedAt`, so
  // signing the same order twice yields two different (both valid) keys. FastSpring retries webhooks,
  // and without this read-back one retry would mail the buyer a second, different key.
  const [existing] = await tx
    .select({ licenseKey: masterchainPurchases.licenseKey })
    .from(masterchainPurchases)
    .where(eq(masterchainPurchases.orderId, parsed.orderId))
    .limit(1);

  let licenseKey = existing?.licenseKey ?? null;
  if (!licenseKey) {
    // Format v2 (product課 frozen). `scope` defaults to "masterchain" — it is what stops a valid
    // signature for one product from unlocking another.
    licenseKey = issueLicense({
      owner: parsed.email,
      order: parsed.orderId,
    });
    if (!licenseKey) {
      // Fail-CLOSED: no signing key configured (or it is malformed). Throwing rolls the tx back and
      // returns non-2xx, so FastSpring retries — better than recording a purchase with no license and
      // telling the buyer nothing. ★Never log the key material or the underlying crypto error.
      throw new Error(
        `[fastspring] cannot issue license for order ${parsed.orderId}: MASTERCHAIN_LICENSE_PRIVATE_KEY missing or invalid`,
      );
    }
  }

  // CRITICAL — self-owned buyer + issued-license record (idempotent on orderId).
  await tx
    .insert(masterchainPurchases)
    .values({
      orderId: parsed.orderId,
      email: parsed.email,
      licenseKey,
      licenseVersion: LICENSE_VERSION,
      issuedAt: new Date(),
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

  // CRITICAL — deliver the key. ★Only when we just issued it: on a FastSpring retry `existing` is
  // already set, and re-sending would mail the same buyer a duplicate for one order.
  if (!existing?.licenseKey) {
    // ★locale: the order payload carries no language today (FastspringOrderParsed has no locale
    // field), so this is 'en' until a popup custom tag supplies one — TODO(C1), same confirmation
    // pass as the payload shape. Guessing from buyerCountry would be a proxy for the buyer's reading
    // language, not a measurement of it.
    const delivery = await emailService
      .sendMasterchainLicenseDelivery({ email: parsed.email }, { locale: "en", licenseKey })
      .catch((err: unknown) => ({ success: false, error: String(err) }));

    if (!delivery.success) {
      // Fail-CLOSED: roll back → non-2xx → FastSpring retries. The retry is safe because the purchase
      // row was never committed, so the next attempt re-issues and re-sends exactly once.
      throw new Error(
        `[fastspring] license delivery email failed for order ${parsed.orderId}: ${delivery.error ?? "unknown"}`,
      );
    }
  }
}
