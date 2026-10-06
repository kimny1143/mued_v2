//
// C+ — FastSpring `order.completed` handling for the paid MUEDsp masterchain ($69) (design #670).
//
// Two reflux effects per order (「棚は借りる・客は所有する」を $69 買い手にこそ):
//   - CRITICAL: record the buyer (email + FastSpring-issued license key) into the self-owned
//     masterchain_purchases ledger — idempotent on orderId. This is the ownership record + the
//     foundation for a future account/subscription layer. It runs in the webhook tx; a failure
//     rolls back → 5xx → FastSpring retries (dedup by orderId).
//   - FAIL-OPEN (never blocks fulfillment): GA4 MP purchase (reusing #664's trackServerPurchase,
//     the second rail paired with Stripe/dial), and the buyers marketing audience add
//     (consent-gated per #670 — a purchase is not itself a marketing opt-in).
//   - ★CRITICAL, and NOT fail-open: the licence delivery email. See the call site near the bottom —
//     a send failure throws, the tx rolls back, and FastSpring retries, because a recorded purchase
//     whose buyer got nothing is worse than a retry.
//
// ★THIS PARAGRAPH USED TO SAY THE DELIVERY EMAIL WAS "TODO, needs an email.service method + copy",
// ★and it was WRONG for a day — the method landed in #991 (emailTemplates.masterchainLicenseDelivery
// / emailService.sendMasterchainLicenseDelivery) and is called below. ★On 2026-09-11 that stale
// sentence was read as current and became an instruction to build what already existed; the work was
// stopped by measuring, not by anyone noticing the comment. ★A header that describes a plan is
// indistinguishable from one describing the code once the plan has shipped — which is the same
// failure as a TODO that survives the decision not to do it (see the locale note further down).
//
// The order.completed payload SHAPE is placeholder here (parseFastspringOrderCompleted): the exact
// field paths + the popup custom-tags carrying gaClientId/utm are confirmed at C1 against a `.test.`
// storefront order (Kevin 審査後). Everything else (record, GA4 mapping, idempotency) is real.
import { trackServerPurchase, type GA4PurchaseParams } from "@/lib/analytics/ga4-server";
import { masterchainPurchases } from "@/db/schema";
import { addBuyerToMuedspNews, addMasterchainContact } from "@/lib/masterchain/audience";
import { MUEDVOX_DOWNLOAD_URL } from "@/lib/muedvox/config";
import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";
import { issueLicense, LICENSE_VERSION } from "@/lib/masterchain/license";
import { paidProductByFastspringPath, type PaidProduct } from "@/lib/plugins/paid-products";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { and, eq, inArray, isNull } from "drizzle-orm";
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
  /**
   * The paid product this order is for — or null when we must NOT fulfil it: the order is not exactly ONE
   * item of quantity 1 whose `data.items[].product` path is in PAID_PRODUCTS (docs/paid-line/c9-…).
   * ★Before C9 this was hard-coded to masterchain for EVERY order, so a second product's buyer would have
   *   been issued a masterchain key — unrevocable (offline verification).
   */
  product: PaidProduct | null;
  /** masterchain_purchases.product_id — `product.productId`, null when `product` is null. */
  productId: string | null;
  /** `data.items[].product` as received ("(none)" when missing) — only for the refusal log. */
  itemPaths: string[];
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
  /** Exact EULA version accepted immediately before the popup opened. */
  eulaVersion?: string;
  /** FastSpring order completion time; persisted only when eulaVersion is present. */
  eulaAcceptedAt?: Date;
  /** The order's language as FastSpring reports it (`data.language`, e.g. "ja") — picks the email's language. */
  language?: string;
}

/**
 * The language of the purchase email: Japanese when the order's language is Japanese, English otherwise
 * (absent included). ★Measured, not guessed: the live order of 2026-10-01 carried `data.language: "ja"`
 * (bought from the ja page, JP). ★Never inferred from the country — a JP address is not a reading language.
 */
export function licenseEmailLocale(language: string | undefined): "ja" | "en" {
  return typeof language === "string" && /^ja(\b|[-_])/i.test(language.trim()) ? "ja" : "en";
}

/**
 * Parse a FastSpring `order.completed` event into the fields we record + attribute.
 * Returns null when the minimum (orderId + email) is absent.
 *
 * ★C1 の実測（2026-09-16・order GLASSWERKSJP260916-5300-60118・`.test.` storefront）で
 * ★**下の path のうち2つが実態と違うことが分かった**。★値は見ず field 名と型のみで確認:
 *   ★`data.account` は ★**string**（object ではない）∴ ★`account.contact.email` は ★常に MISSING。
 *       → ★email が取れているのは ★`data.customer.email` の fallback のおかげ（★実在を確認）。
 *       → ★buyer email の canonical は ★`data.recipients[0].recipient.email`（★実在を確認）。
 *   ★`data.tags` は ★**MISSING**。★ただし ★この test 注文は ★popup を経由していない（管理画面から手動）
 *       ∴ ★**popup が付ける tags が届かない証拠にはならない** —— ★popup 発の注文で再確認が必要。
 *   ★確認できた分: `data.order` / `data.id` / `data.total` / `data.currency` /
 *       `data.items[0].fulfillments` は ★すべて実在（型も一致）。
 * ★**account path は本 PR で是正済**（recipient → customer の順・★name の silent-empty も同時に直した）。
 * ★**残る TODO(C1-b) は `tags` のみ**: ★`data.tags` は MISSING だったが、★その注文は popup 非経由
 *   ∴ ★popup 発の注文で再確認するまで ★結論を出さない（★first-touch/UTM が空のまま出荷しないため）。
 * ★参考: ★`data.address.country` は ★実在しており buyerCountry は壊れていない（★触らない）。
 *   ★`data.items[0].sku` は ★null（★parser は sku を読まず productId を固定しているので影響なし）。
 */
/** ★配列として読む（★違う型なら空配列）。★`data.recipients` が array であることは実測済。 */
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function parseFastspringOrderCompleted(event: unknown): FastspringOrderParsed | null {
  const e = asObj(event);
  const data = asObj(e.data);
  const address = asObj(data.address);
  const tags = asObj(data.tags); // custom tags set on the popup session (gaClientId + utm*)

  // ★buyer の在り処 —— ★2026-09-16 の実受信で確定（★型のみ確認・値は見ていない）:
  //   ★`data.account` は ★**string** ∴ ★`data.account.contact` は ★MISSING
  //      → ★旧実装の `contact.email` / `contact.first` / `contact.last` は ★すべて dead。
  //      → ★email は `data.customer.email` の fallback が救っていたが、★`name` は ★**常に空**だった。
  //   ★canonical は ★`data.recipients[0].recipient`（★`email` `first` `last` `address` が在る）。
  //   ★`data.customer` も object で ★`email` `first` `last` `phone` `company` を持つ（★二番手）。
  const recipient = asObj(asObj(asArr(data.recipients)[0]).recipient);
  const customer = asObj(data.customer);

  const orderId = asStr(data.order) ?? asStr(data.id) ?? asStr(e.id);
  // ★recipient → customer の順（★どちらも実在を確認済）。★`contact` は残さない ——★dead path を
  // ★残すと「fallback が在る」ように読めるが、★実際には一度も値を返さない。
  const email = asStr(recipient.email) ?? asStr(customer.email);
  if (!orderId || !email) return null;

  // ★fallback を外した (freee課 検出 2026-08-04)。`data.total` は購入者通貨、
  // `totalInPayoutCurrencyValue` は支払通貨 (USD) で、`currency` は常に購入者通貨を入れる。
  // ∴ fallback が発火した行は「通貨欄 JPY・金額欄 USD」になり、$69 と ¥12,856 で
  // 桁が約150倍ずれる。★金額は、欠けているより間違っている方が高くつく。
  // 欠けた場合は undefined のままにし、FastSpring の Line Item Detail Export から
  // 後で補う (fee/tax/net と同じ経路・freee課 7/27)。
  const total = asNum(data.total);

  // ★ここが ★silent-empty だった箇所 ——★`contact` が常に {} なので ★name は常に ""。
  // ★配達メールや freee 記帳で使う側からは「★名前が無い注文」と見え、★欠陥に見えない。
  const first = asStr(recipient.first) ?? asStr(customer.first) ?? "";
  const last = asStr(recipient.last) ?? asStr(customer.last) ?? "";
  const eulaVersion = asStr(tags.eula_version);
  // ★The product comes from the order, not from a constant (C9). Measured 2026-10-04 on every live order:
  //   exactly one item, quantity 1, `product: "muedsp-masterchain"` (the path; `sku` is null).
  const items = asArr(data.items).map((i) => ({ product: asStr(asObj(i).product), quantity: asNum(asObj(i).quantity) }));
  const product = items.length === 1 && items[0].quantity === 1 ? paidProductByFastspringPath(items[0].product) : null;
  // `data.changed` is FastSpring's documented order timestamp in milliseconds. Keep event.created as
  // a fallback for non-expanded payload variants; unlike webhook receipt time, both remain stable on
  // retries. `changedInSeconds` is the documented seconds representation of the same order time.
  const changedInSeconds = asNum(data.changedInSeconds);
  const changedMillis =
    asNum(data.changed) ??
    asNum(data.changedValue) ??
    (changedInSeconds !== undefined ? changedInSeconds * 1000 : undefined) ??
    asNum(e.created);
  const acceptedAt = changedMillis === undefined ? undefined : new Date(changedMillis);
  const validAcceptedAt = acceptedAt && !Number.isNaN(acceptedAt.getTime()) ? acceptedAt : undefined;

  return {
    orderId,
    email: email.toLowerCase().trim(),
    name: [first, last].filter(Boolean).join(" ").trim(),
    product,
    productId: product?.productId ?? null,
    itemPaths: items.map((i) => i.product ?? "(none)"),
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
    eulaVersion,
    eulaAcceptedAt: eulaVersion ? validAcceptedAt : undefined,
    language: asStr(data.language),
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

/**
 * Build the GA4 purchase event from a parsed FastSpring order. Pure; returns null when there is no
 * GA client_id (GA4 MP requires one) — the caller then skips the event (same guard as #664/dial).
 */
export function buildMasterchainPurchaseEvent(parsed: FastspringOrderParsed): GA4PurchaseParams | null {
  const gaClientId = parsed.gaClientId?.trim();
  if (!gaClientId || !parsed.product) return null;
  // ★金額か通貨が欠けた注文は、GA4 へ送らない (freee課 検出 2026-08-04)。
  // 以前は `?? 0` と `|| "usd"` で埋めていたが、どちらも数字を壊す:
  //   - amountCents 欠け → 「purchase・value 0」= 無料で売れたように見える (過小)
  //   - currency 欠け   → value は購入者通貨のまま "USD" と申告 = JPY なら約150倍 (過大)
  // ★GA4 の purchase value は CAC / ROAS の分母になるので、どちらも「広告を止める/増やす」
  //   の判断を直接 動かす。★そして GA4 側は「送られなかった注文」と「value 0 の注文」を
  //   区別しない。∴ 埋めずに送らない。注文自体は masterchain_purchases に残るので、
  //   後から突合できる (呼び出し側が理由をログに出す)。
  // ★value / currency を optional にする案は採らなかった: GA4PurchaseParams は dial の
  //   購入経路 (#664) と共有の型で、緩めると そちらにも欠けた purchase が通る。
  if (parsed.amountCents === undefined || !parsed.currency) return null;
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
    value: parsed.amountCents / 100,
    currency: parsed.currency.toUpperCase(),
    itemName: parsed.product.itemName,
    itemId: parsed.product.productId,
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
/** ★戻り値: `"ok"` ＝ 履行した ／ `"unparseable"` ＝ ★parse できなかった（★route が行を `failed` で
 *  確定させてから ★tx の外で throw する）。★license / email の失敗は ★従来どおり throw して
 *  ★tx 全体を rollback する（★売上行を作らずに retry させるのが正しいので、そこは変えない）。 */
export async function handleFastspringOrderCompleted(
  tx: Tx,
  event: unknown,
): Promise<"ok" | "unparseable" | "unknown_product"> {
  const parsed = parseFastspringOrderCompleted(event);
  if (!parsed) {
    // ★ここで throw しない（#1039 ではしていた）—— ★CCO レビュー #1039 の指摘。
    //
    // ★この関数は route の `db.transaction(...)` の ★**中**で呼ばれる ∴ ★throw すると
    // ★直前に insert した行（★payload を含む）も ★rollback で消える。★retry 窓は開くが、
    // ★**実 payload という唯一の手掛かりを失う** ——★route の `envelopeShape` docstring が
    // まさにこの損失を嘆いている（"leave nothing to correct it with"）。
    // ★id / type の拒否では避けられない（★id は key そのもの・★type の拒否は行より前）が、
    // ★**parse 失敗では避けられる** ——★行はもう tx の中に在るから。
    //
    // ★∴ 判別可能な戻り値にして、★route が行を `failed` で確定させ、★tx の外で throw する。
    // ★`failed` は `processed` ではないので ★冪等 guard は弾かない ＝ 再配達で履行に到達できる。
    // ★ここでの `failed` は意味も正しい（★skip と違って ★実際に失敗している）。
    return "unparseable";
  }

  // ── which product — BEFORE anything is issued (C9 · kimny 2026-10-04「鍵を出さず通知」) ─────────────
  // ★No key, no purchase row, no email for an order we cannot map to exactly one product we sell. A key
  //   for the wrong product cannot be taken back (offline verification); a missing delivery can be fixed:
  //   the route records the event as failed and answers 500, FastSpring redelivers, and once the product
  //   is added to PAID_PRODUCTS (and deployed) the next redelivery fulfils it with no hand work.
  const product = parsed.product;
  if (!product) {
    logger.error("[fastspring] order.completed for a product we do not sell (or not exactly one item) — NOT fulfilled", {
      orderId: parsed.orderId,
      items: parsed.itemPaths,
      next: "add the FastSpring product path to lib/plugins/paid-products.ts; FastSpring's redelivery then fulfils it",
    });
    const alertEmail = process.env.OPERATOR_ALERT_EMAIL;
    if (alertEmail && emailService.isConfigured()) {
      void emailService
        .sendAdminAlert(
          alertEmail,
          `[fastspring] PAID order ${parsed.orderId} was NOT fulfilled: product ${JSON.stringify(parsed.itemPaths)} is not in PAID_PRODUCTS (or the order is not exactly one item). The buyer has no key yet. Add the path to lib/plugins/paid-products.ts — FastSpring's redelivery will then fulfil it. If FastSpring has stopped retrying by then, resend the order.completed webhook from the FastSpring admin (order → webhooks). This alert repeats on every redelivery until it is fixed.`,
        )
        .catch((err: unknown) => logger.error("[fastspring] operator alert failed", { error: String(err) }));
    }
    return "unknown_product";
  }

  // ── issue the license, ONCE per order ───────────────────────────────────────────────────────────
  // ★Idempotency is on the STORED keyfile, not on issueLicense(): the payload carries `issuedAt`, so
  // signing the same order twice yields two different (both valid) keys. FastSpring retries webhooks,
  // and without this read-back one retry would issue a second, different key.
  const [existing] = await tx
    .select({ licenseKey: masterchainPurchases.licenseKey })
    .from(masterchainPurchases)
    .where(eq(masterchainPurchases.orderId, parsed.orderId))
    .limit(1);

  let licenseKey = existing?.licenseKey ?? null;
  if (!licenseKey) {
    // Format v2 (product課 frozen). `scope` is what stops a valid signature for one product from
    // unlocking another — so it comes from the product, not from issueLicense's masterchain default (C9).
    licenseKey = issueLicense({
      owner: parsed.email,
      order: parsed.orderId,
      scope: product.scope,
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
      eulaVersion: parsed.eulaVersion,
      eulaAcceptedAt: parsed.eulaVersion ? parsed.eulaAcceptedAt : undefined,
      productId: product.productId,
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
  } else if (parsed.amountCents === undefined || !parsed.currency) {
    // ★異常。この log は load-bearing で、鳴らす条件を絞る必要がある (product課 検出)。
    //
    // 理由: 本ファイル冒頭のとおり payload の SHAPE は実物と未突合 (C1 で確定させる)。
    // ★もし `data.total` のパスが違えば、amountCents は全注文で undefined になる。
    //   本 PR 前: 「purchase が全部 value 0」= 変なパターンとして GA4 で目に付いた
    //   ★本 PR 後: 「purchase が1件も無い」= 売れていないのと区別できない
    // ∴ ★パスのずれを検出できる唯一の場所がここになった。
    //
    // GA4 側は「送られなかった注文」と「value 0 の注文」を区別しない。DB には行が残るので、
    // この log と masterchain_purchases の件数を突き合わせれば欠測が特定できる。
    logger.warn("[fastspring] GA4 purchase skipped — amount/currency missing (payload path?)", {
      orderId: parsed.orderId,
      hasAmount: parsed.amountCents !== undefined,
      hasCurrency: Boolean(parsed.currency),
    });
  } else {
    // ★gaClientId の不在は routine —— `tags` は popup セッション由来なので、直リンク・
    // メール経由・cookie 無しでは普通に欠ける。★上の warn に混ぜると、C1 で本当に
    // パスがずれていた時に埋もれる (product課 検出)。
    logger.debug("[fastspring] GA4 purchase skipped — no ga client_id (routine)", {
      orderId: parsed.orderId,
    });
  }

  // FAIL-OPEN — the buyer onto the MUEDsp news list + the buyers list, ONLY when the order says the notice was
  // shown: kimny 2026-10-06 (conductor relay) 「購入者をメールに入れます。」 under kimny's 10/4 rule — tell, send, and
  // let them unsubscribe. The cart shows the notice (muedsp.buyTry.cartAudienceNote) and tags marketingConsent
  // "true"; orders from before it carry "false" and are not added (no notice was shown — conductor 10/6: new
  // purchases only). Lookup first in both: an unsubscribed person stays unsubscribed.
  // ★Awaited (as the license email below is): a fire-and-forget call can be cut off when the function returns.
  //   Both never throw; a failure is logged and does not stop delivery.
  if (parsed.marketingConsent) {
    const [news, buyers] = await Promise.all([
      addBuyerToMuedspNews(parsed.email),
      addMasterchainContact("buyers", { email: parsed.email }),
    ]);
    if (!news) logger.error("[fastspring] buyer not added to the MUEDsp news list", { orderId: parsed.orderId });
    if (!buyers) logger.warn("[fastspring] buyer not added to the buyers list (unset or failed)", { orderId: parsed.orderId });
  }

  // CRITICAL — deliver portal access instructions. ★Only when we just issued it: on a FastSpring retry `existing` is
  // already set, and re-sending would mail the same buyer a duplicate for one order.
  if (!existing?.licenseKey) {
    // ★locale = the order's language (kimny, 2026-10-01, conductor's window: 「言語に合わせる」).
    //   `data.language` "ja" → Japanese; anything else, or none → English. Not inferred from the country.
    //   ★This REPLACES kimny's 2026-09-10 decision 「英語メールで問題ない。なぜなら最近は Gmail でも翻訳が入る
    //   ことが多いからだ」, which rested on the order payload carrying no language. The first live order
    //   (2026-10-01, bought from the ja page, JP) carried `data.language: "ja"` and received the English email.
    //   The FastSpring popup custom tag for language is still not needed — the order already says it.
    // ★A DELIVERY WITHOUT A DOWNLOAD LINK IS NOT A FAILURE, BUT IT MUST NOT BE SILENT (conductor,
    //   2026-09-11). The email degrades honestly when MASTERCHAIN_DOWNLOAD_URL is unset — it carries
    //   the portal link and "the link is coming, reply here" — so the buyer is not stranded and
    //   nothing broken is sent. ★What was missing is that NOBODY ON OUR SIDE could tell it happened.
    //
    // ★Two states, two lines, on purpose: "not configured yet" is a pre-launch condition, while
    //   "configured but the send failed" is an incident. ★Collapsing them is the shape #1002 fixed
    //   one level down — a configured-but-failed write that printed like a no-op.
    const deliveryConfig = (() => {
      switch (product.key) {
        case "masterchain":
          return { url: MASTERCHAIN_DOWNLOAD_URL, constant: "MASTERCHAIN_DOWNLOAD_URL",
            send: () => emailService.sendMasterchainLicenseDelivery({ email: parsed.email }, { locale: licenseEmailLocale(parsed.language) }) };
        case "muedvox":
          return { url: MUEDVOX_DOWNLOAD_URL, constant: "MUEDVOX_DOWNLOAD_URL",
            send: () => emailService.sendMuedvoxLicenseDelivery({ email: parsed.email }, { locale: licenseEmailLocale(parsed.language) }) };
        default: {
          const exhaustive: never = product.key;
          throw new Error(`Unhandled paid product: ${exhaustive}`);
        }
      }
    })();
    if (!deliveryConfig.url) {
      logger.error("[fastspring] delivering a PAID licence with NO download link — URL is unset", {
        orderId: parsed.orderId,
        next: `set ${deliveryConfig.constant} (+ the sha256/bytes pin) once the .pkg is on the shelf`,
      });
    }

    const delivery = await deliveryConfig.send()
      .catch((err: unknown) => ({ success: false, error: String(err) }));

    if (!delivery.success) {
      // ★THE `.catch` ABOVE IS NOT FAIL-OPEN, AND IT READS LIKE IT IS (conductor asked, 2026-09-11 —
      //   a fair misreading). It does not swallow the failure; it NORMALISES the two failure shapes
      //   into one, because `send` can either throw (transport) or resolve `{success:false}` (the
      //   provider said no — the same Resend semantics #1002 turned on). ★The decision is this `if`,
      //   which throws. ★Net behaviour: fail-CLOSED.
      //
      // Fail-CLOSED: roll back → non-2xx → FastSpring retries. The retry is safe because the purchase
      // row was never committed, so the next attempt re-issues and re-sends exactly once.
      throw new Error(
        `[fastspring] license delivery email failed for order ${parsed.orderId}: ${delivery.error ?? "unknown"}`,
      );
    }
  }

  return "ok";
}

// ─────────────────────────────────────────────────────────────────────────────
// return.created — a refund or chargeback (conductor 2026-09-30, f)
// ─────────────────────────────────────────────────────────────────────────────
//
// ★Shape from FastSpring's reference (developer.fastspring.com/reference/returncreated, read 2026-09-30):
//   data.return (return id) · data.original.{id, order, reference} (the ORIGINAL order) · data.type
//   ("RETURN" | "ALERT" | "CHARGEBACK") · data.items[].refundType ("Full Refund" or a partial) ·
//   data.changed (ms) / changedInSeconds. ★Not yet seen in a real payload here — the first one is kimny's
//   verification order's refund, which is exactly when this path is meant to be checked.
// ★Which original id we stored: order.completed keeps `data.order ?? data.id` as order_id, so both
//   `original.order` and `original.id` are tried against it.

export interface FastspringReturnParsed {
  returnId: string;
  /** Candidates for masterchain_purchases.order_id (original.order, original.id), de-duplicated. */
  orderIds: string[];
  kind: "full" | "partial" | "chargeback";
  refundedAt: Date | undefined;
  /** FastSpring's `data.completed` — true only for a return that has actually gone through. */
  completed: boolean;
}

export function parseFastspringReturnCreated(event: unknown): FastspringReturnParsed | null {
  const e = asObj(event);
  const data = asObj(e.data);
  const original = asObj(data.original);
  const returnId = asStr(data.return) ?? asStr(data.id) ?? asStr(e.id);
  const orderIds = [asStr(original.order), asStr(original.id)].filter((v): v is string => !!v);
  if (!returnId || orderIds.length === 0) return null;
  const type = (asStr(data.type) ?? "").toUpperCase();
  // ★Full only when every item says so. Missing refundType is treated as PARTIAL — the cautious side:
  //   a partial refund leaves the key visible; wrongly hiding a paying buyer's key is the worse error.
  const items = asArr(data.items).map((i) => asStr(asObj(i).refundType) ?? "");
  const allFull = items.length > 0 && items.every((t) => /full/i.test(t));
  const kind: FastspringReturnParsed["kind"] = type === "CHARGEBACK" ? "chargeback" : allFull ? "full" : "partial";
  const changedInSeconds = asNum(data.changedInSeconds);
  const ms = asNum(data.changed) ?? (changedInSeconds !== undefined ? changedInSeconds * 1000 : undefined) ?? asNum(e.created);
  const at = ms === undefined ? undefined : new Date(ms);
  return {
    returnId,
    orderIds: [...new Set(orderIds)],
    kind,
    refundedAt: at && !Number.isNaN(at.getTime()) ? at : undefined,
    completed: data.completed === true || data.completed === "true",
  };
}

/**
 * Record a verified, deduped, LIVE `return.created` on the purchase row. Never deletes the row.
 *   "unparseable" — no return id / original order id (the route records the event as failed)
 *   "no_purchase" — no purchase row matches (yet). ★The route records it as FAILED so FastSpring redelivers:
 *                   this store sells masterchain only, so the likely cause is the refund arriving before
 *                   order.completed wrote the row — processing it would lose the refund (CCO #1183 ②).
 *   "not_completed" — `data.completed` is not true: the row is NOT touched (the key stays visible). The route
 *                   records the event as processed with a note. (conductor 2026-10-01: a return created in
 *                   FastSpring's admin can still be cancelled before Confirm; a mark set then would stay.)
 *   "recorded"
 */
export async function handleFastspringReturnCreated(
  tx: Tx,
  event: unknown,
): Promise<"unparseable" | "no_purchase" | "not_completed" | "recorded"> {
  const parsed = parseFastspringReturnCreated(event);
  if (!parsed) return "unparseable";
  // ★Only a completed return marks the row (conductor 2026-10-01). The first live refund (kimny's verification
  //   order, return K1gkvDOBR-mZuFxzFO1LmA, received 2026-09-30T22:00:52Z) carried `completed: true` with
  //   refundType "Full Refund" — that shape is what marks. Anything else is recorded and left alone.
  if (!parsed.completed) {
    logger.warn("[fastspring] return.created that is not completed — recorded only, purchase row untouched", {
      returnId: parsed.returnId,
      kind: parsed.kind,
    });
    return "not_completed";
  }
  const refunded = parsed.kind === "full" || parsed.kind === "chargeback";
  const rows = await tx
    .update(masterchainPurchases)
    .set({
      refundReturnId: parsed.returnId,
      refundKind: parsed.kind,
      // ★A partial refund does not clear an earlier full refund, and does not set one.
      ...(refunded ? { refundedAt: parsed.refundedAt ?? new Date() } : {}),
    })
    // ★A partial return must not overwrite an earlier FULL refund / chargeback (CCO #1183 ①): partial only
    //   touches rows that are not refunded yet.
    .where(
      refunded
        ? inArray(masterchainPurchases.orderId, parsed.orderIds)
        : and(inArray(masterchainPurchases.orderId, parsed.orderIds), isNull(masterchainPurchases.refundedAt)),
    )
    .returning({ id: masterchainPurchases.id });
  if (rows.length === 0) {
    logger.warn("[fastspring] return.created for an order with no masterchain purchase row", {
      returnId: parsed.returnId,
      kind: parsed.kind,
    });
    return "no_purchase";
  }
  logger.warn("[fastspring] refund recorded on a masterchain purchase", { returnId: parsed.returnId, kind: parsed.kind });
  return "recorded";
}
