"use client";

/**
 * masterchain — the SEND side of the FastSpring purchase flow.
 *
 * ## What this closes, and what it does not
 *
 * Until 2026-09-13 the Buy button was `disabled` and the note beside it said the gap "cannot be
 * closed by code today". ★That sentence was too strong (conductor, 2026-09-13, kimny-approved): the
 * two unknowns are *identifiers*, so they can be taken from config and everything around them built
 * now. What remains is a decision plus a setting, not an implementation.
 *
 *   NEXT_PUBLIC_FASTSPRING_STOREFRONT  ← FastSpring account setting (kimny; reply due ~2026-09-16)
 *   NEXT_PUBLIC_FASTSPRING_PRODUCT_PATH ← ★SKU / product path is still UNDECIDED and is a kimny call
 *                                          (docs/paid-line/c1-…spec.md:25 and :101)
 *
 * ★So this is two values, not one. The receive side does not care which SKU FastSpring uses — it
 * hardcodes `productId: "muedsp_masterchain"` (fastspring-webhook.ts:96) and never reads the
 * payload's product — but the SEND side must name a path to check out.
 *
 * ## ★What nobody can verify today, stated rather than implied
 *
 * There is no storefront, so ★nothing here proves a popup actually opens. The FastSpring builder API
 * calls below are written from its documented shape and are ★UNVERIFIED against a live storefront.
 * What IS verified, and what the tests cover, is the other direction: ★with the env unset, this
 * module loads no script, builds no session, and the button stays exactly as it was. The first real
 * `.test.` order is what will confirm the calls — see TODO(C1) in fastspring-webhook.ts for the
 * receive-side twins of the same "confirm against a real order" work.
 */

import { readGaClientId } from "@/lib/dial/first-touch-client";
import { EULA_VERSION } from "@/lib/legal/eula";
import { PAID_PRODUCTS, type PaidProductKey } from "@/lib/plugins/paid-products";

const STOREFRONT = process.env.NEXT_PUBLIC_FASTSPRING_STOREFRONT ?? "";
const PRODUCT_PATH = process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_PATH ?? "";

/**
 * ★Both halves, not either. A storefront with no product path cannot check out, and a product path
 * with no storefront has nothing to check out against — enabling on one would give a button that
 * looks live and does nothing, which is worse than the disabled button it replaced.
 */
export const MASTERCHAIN_CHECKOUT_ENABLED = STOREFRONT !== "" && PRODUCT_PATH !== "";

/**
 * The FastSpring path the Buy button checks out, per product (C9 PR-C: one env path → the product table).
 * ★masterchain keeps reading the env, exactly as before — its live checkout does not move in this change.
 * ★Any other product takes its path from PAID_PRODUCTS, and only while its row is enabled: a disabled row
 *   has no path here, so its button cannot check out an order the webhook would answer with no key.
 */
export function checkoutPath(product: PaidProductKey = "masterchain"): string {
  if (product === "masterchain") return PRODUCT_PATH;
  const row = PAID_PRODUCTS[product];
  return row.enabled ? row.fastspringPath : "";
}

export function checkoutEnabled(product: PaidProductKey = "masterchain"): boolean {
  return STOREFRONT !== "" && checkoutPath(product) !== "";
}

/**
 * The cart for one product: that product × 1, and every OTHER product we sell set to 0.
 * ★Why the zeros: the FastSpring session outlives a page, so a visitor who opened one product's cart and then
 *   another's would hold both — and the webhook fulfils only an order of exactly one known item (C9 §3.2), so
 *   that buyer would pay and get no key. ★With one product on sale the list is that product alone, i.e. the
 *   payload masterchain has always sent.
 */
export function cartProducts(product: PaidProductKey = "masterchain"): { path: string; quantity: number }[] {
  const path = checkoutPath(product);
  const others = (Object.keys(PAID_PRODUCTS) as PaidProductKey[])
    .filter((key) => key !== product)
    .map((key) => checkoutPath(key))
    .filter((other) => other !== "" && other !== path);
  return [{ path, quantity: 1 }, ...others.map((other) => ({ path: other, quantity: 0 }))];
}

/**
 * ★THE TAG CONTRACT, now in code.
 *
 * It used to live as prose beside the Buy button, kept honest by a test that compared that prose
 * against the parser. ★That test also carried a guard asserting the send side did not exist, whose
 * own comment said: "the day a popup is wired … the contract should move into code (where it can be
 * typed and tested) rather than staying prose." ★This is that move.
 *
 * ★Why it matters that these exactly match the parser: FastSpring carries only what the popup
 * session was given. A tag not set here is gone by the time the webhook runs, and the order is
 * unattributable FOREVER — an order cannot be re-bought with better instrumentation.
 */
export const CHECKOUT_TAG_NAMES = [
  "gaClientId",
  "eula_version",
  "marketingConsent",
  "utmCampaign",
  "utmContent",
  "utmMedium",
  "utmSource",
  "utmTerm",
] as const;

export type CheckoutTagName = (typeof CHECKOUT_TAG_NAMES)[number];
export type CheckoutTags = Partial<Record<CheckoutTagName, string>>;

export type CheckoutAttribution = {
  gaClientId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  marketingConsent?: boolean;
};

/**
 * Pure: attribution → the tag bag FastSpring will carry. Exported so the contract can be tested
 * without a DOM, a cookie, or a storefront.
 *
 * ★Empty values are omitted rather than sent as "". The parser runs `asStr()` over each tag, so ""
 * and absent are already equivalent downstream — but sending "" would make an unattributed order
 * indistinguishable from one where capture genuinely failed.
 *
 * ★`marketingConsent` is serialised as the string "true"/"false" because the parser accepts both a
 * real boolean and the string (fastspring-webhook.ts:106), and FastSpring tag values are strings.
 */
export function buildCheckoutTags(input: CheckoutAttribution): CheckoutTags {
  const tags: CheckoutTags = {};
  const put = (k: CheckoutTagName, v: string | undefined) => {
    if (v !== undefined && v !== "") tags[k] = v;
  };

  put("gaClientId", input.gaClientId);
  put("utmSource", input.utmSource);
  put("utmMedium", input.utmMedium);
  put("utmCampaign", input.utmCampaign);
  put("utmContent", input.utmContent);
  put("utmTerm", input.utmTerm);
  // ★Always sent, including `false`. A purchase is NOT an opt-in: the audience add is gated on this
  //   tag, so an absent tag and an explicit "false" must not be the same thing to whoever reads it.
  tags.marketingConsent = input.marketingConsent === true ? "true" : "false";
  // The popup can only be opened after the EULA checkbox is checked. Pin the exact version accepted
  // into the order so webhook retries and later EULA revisions cannot rewrite that fact.
  tags.eula_version = EULA_VERSION;
  return tags;
}

/** Read attribution from the page the buyer is actually on. Best-effort; never throws. */
export function readAttribution(marketingConsent?: boolean): CheckoutAttribution {
  const out: CheckoutAttribution = { marketingConsent };
  try {
    // ★gaClientId may legitimately be missing (consent tooling, ad blockers, a first visit before
    //   gtag writes the cookie). ★It must NOT block the purchase — the note beside the button says
    //   "without it the purchase event is skipped", i.e. we lose the measurement, not the sale.
    out.gaClientId = readGaClientId();
    const q = new URLSearchParams(window.location.search);
    out.utmSource = q.get("utm_source") ?? undefined;
    out.utmMedium = q.get("utm_medium") ?? undefined;
    out.utmCampaign = q.get("utm_campaign") ?? undefined;
    out.utmContent = q.get("utm_content") ?? undefined;
    out.utmTerm = q.get("utm_term") ?? undefined;
  } catch {
    // ignore — attribution is never worth a failed checkout
  }
  return out;
}

const SCRIPT_ID = "fsc-api";
export const BUILDER_SRC = "https://d1f8f9xcsvx3ha.cloudfront.net/sbl/1.0.1/fastspring-builder.min.js";

type FastSpringBuilder = {
  push: (payload: Record<string, unknown>) => void;
  tag: (tags: Record<string, string>) => void;
  checkout: () => void;
};

/**
 * ★After payment (conductor 2026-10-01): FastSpring calls the function named in the script tag's
 * `data-popup-closed` when the popup closes — with the order reference when an order COMPLETED, and null
 * when the buyer closed it without paying (developer.fastspring.com/docs/redirect-after-checkout).
 * We turn only the completed case into a DOM event the Buy control listens for; a closed-without-paying
 * popup shows nothing.
 */
export const POPUP_CLOSED_CALLBACK = "__muedspFsPopupClosed";
export const ORDER_COMPLETED_EVENT = "muedsp:fastspring-order-completed";

export function handlePopupClosed(orderReference: unknown): boolean {
  const ref = orderReference && typeof orderReference === "object" ? (orderReference as Record<string, unknown>) : null;
  const completed = !!ref && (typeof ref.id === "string" && ref.id !== "" || typeof ref.reference === "string" && ref.reference !== "");
  if (completed && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ORDER_COMPLETED_EVENT));
  return completed;
}

/**
 * ★The price in the buyer's own currency, tax included, from FastSpring itself (kimny 10/1: 「ドルだけしかも税
 * 計算なしだと違和感がすごい」). The builder script calls the function named in `data-data-callback` with the
 * session's order data after every change. Measured against the live store (2026-10-01, product in the cart):
 *   JP → total "¥12,364", tax "¥1,124", taxRate "10%", taxType "JCT", taxPriceType "included"
 *   DE → "€74.90" incl. VAT 19% / GB → "£64.78" incl. VAT 20%
 *   US → "$69.00", taxPriceType "added", tax "$0.00" (sales tax needs the address, on the next screen)
 * ★With an empty cart every total is "¥0" — the product has to be in the session first (requestQuote).
 * ★This is the same session the popup opens on, so the figure cannot disagree with the next screen —
 * which was the reason the modal used to show only "$69".
 */
export type CheckoutQuote = {
  /** Formatted, in the session's currency — what the popup shows as the total ("¥12,364", "$69.00"). */
  total: string;
  currency: string;
  /** "included": the total already has the tax in it (JP, EU, UK…). "added": tax comes on top (US). */
  taxPriceType: "included" | "added";
  tax: string;
  taxRate: string;
  taxType: string;
};

export const DATA_CALLBACK = "__muedspFsData";
export const QUOTE_EVENT = "muedsp:fastspring-quote";
const lastQuotes = new Map<PaidProductKey, CheckoutQuote>();
// The product whose cart is on screen (set by requestQuote / openCheckout). Session data is read for this one.
let activeProduct: PaidProductKey = "masterchain";

/**
 * Pure: FastSpring session data → the quote for masterchain, or null. ★Null unless the cart holds exactly
 * masterchain × 1 and nothing else: the order-level total would otherwise not be masterchain's price.
 */
export function readQuote(data: unknown, productPath: string = PRODUCT_PATH): CheckoutQuote | null {
  if (!data || typeof data !== "object" || !productPath) return null;
  const d = data as Record<string, unknown>;
  const items = (Array.isArray(d.groups) ? d.groups : []).flatMap((g) =>
    g && typeof g === "object" && Array.isArray((g as Record<string, unknown>).items) ? ((g as Record<string, unknown>).items as unknown[]) : [],
  ) as Record<string, unknown>[];
  const inCart = items.filter((i) => i && i.selected === true);
  if (inCart.length !== 1 || inCart[0].path !== productPath || inCart[0].quantity !== 1) return null;
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const total = str("totalWithTax");
  const type = str("taxPriceType");
  if (!total || typeof d.totalWithTaxValue !== "number" || d.totalWithTaxValue <= 0) return null;
  if (type !== "included" && type !== "added") return null;
  return { total, currency: str("currency"), taxPriceType: type, tax: str("tax"), taxRate: str("taxRate"), taxType: str("taxType") };
}

export function handleSessionData(data: unknown): CheckoutQuote | null {
  const quote = readQuote(data, checkoutPath(activeProduct));
  if (quote) {
    lastQuotes.set(activeProduct, quote);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(QUOTE_EVENT, { detail: quote }));
  }
  return quote;
}

/** The latest quote this page has seen (a modal opened a second time shows it at once). */
export function currentQuote(product: PaidProductKey = "masterchain"): CheckoutQuote | null {
  return lastQuotes.get(product) ?? null;
}

/**
 * Put masterchain × 1 in the session so FastSpring prices it (the answer arrives through DATA_CALLBACK).
 * ★Session only — nothing is charged and no popup opens; openCheckout pushes the same line again.
 */
export function requestQuote(product: PaidProductKey = "masterchain"): boolean {
  if (!checkoutEnabled(product) || typeof window === "undefined") return false;
  const b = builder();
  if (!b) return false;
  try {
    activeProduct = product;
    b.push({ products: cartProducts(product) });
    return true;
  } catch {
    return false;
  }
}

function builder(): FastSpringBuilder | undefined {
  const fs = (window as unknown as { fastspring?: { builder?: FastSpringBuilder } }).fastspring;
  return fs?.builder;
}

/**
 * Load the FastSpring builder script once, and report when the builder is actually usable.
 *
 * ★Resolves `false` when checkout is not configured, when the script fails to load, or when the
 * script loads but exposes no builder. ★The caller only enables the button on `true` — otherwise a
 * click would be a no-op, which is a worse button than the disabled one it replaced.
 */
export function loadCheckoutScript(product: PaidProductKey = "masterchain"): Promise<boolean> {
  if (!checkoutEnabled(product)) return Promise.resolve(false);
  if (typeof document === "undefined") return Promise.resolve(false);
  if (builder()) return Promise.resolve(true);

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

  // ★A script element that has ALREADY finished will never fire `load` or `error` again, so
  //   subscribing to it would leave the promise pending forever (CCO, review of #1025). ★Reachable:
  //   first load returns 200 with the wrong body → no builder → a client-side remount subscribes to
  //   the settled element. ★The failure is fail-closed (the button stays disabled) but it is still a
  //   promise that never settles, so it is recorded in state rather than left to the event.
  if (existing?.dataset.fsSettled === "1") return Promise.resolve(builder() !== undefined);

  const el = existing ?? document.createElement("script");
  return new Promise((resolve) => {
    const settle = () => {
      el.dataset.fsSettled = "1";
      // ★`load` does not mean the builder exists — a 200 that returns the wrong body still fires it.
      //   Check for the object rather than trusting the event.
      resolve(builder() !== undefined);
    };
    el.addEventListener("load", settle, { once: true });
    el.addEventListener("error", () => {
      el.dataset.fsSettled = "1";
      resolve(false);
    }, { once: true });

    if (!existing) {
      // The callback must exist (and be named on the tag) before the builder script reads its attributes.
      (window as unknown as Record<string, unknown>)[POPUP_CLOSED_CALLBACK] = handlePopupClosed;
      el.setAttribute("data-popup-closed", POPUP_CLOSED_CALLBACK);
      (window as unknown as Record<string, unknown>)[DATA_CALLBACK] = handleSessionData;
      el.setAttribute("data-data-callback", DATA_CALLBACK);
      el.id = SCRIPT_ID;
      el.src = BUILDER_SRC;
      el.async = true;
      el.setAttribute("data-storefront", STOREFRONT);
      document.head.appendChild(el);
    }
  });
}

/**
 * Open the popup. ★Returns false when it did not open, for any reason — env unset, script not yet
 * loaded, builder absent. ★The caller renders a disabled button in that case, so a false here is a
 * state that should never be reachable from the UI rather than an error to surface.
 *
 * ★UNVERIFIED against a live storefront (there isn't one). The `push`/`checkout` shape is the
 * documented one; the first `.test.` order confirms or corrects it.
 */
export function openCheckout({
  eulaAccepted,
  marketingConsent,
  product = "masterchain",
}: {
  eulaAccepted: boolean;
  marketingConsent?: boolean;
  product?: PaidProductKey;
}): boolean {
  if (!eulaAccepted) return false;
  if (!checkoutEnabled(product)) return false;
  const b = builder();
  if (!b) return false;
  try {
    activeProduct = product;
    b.push({
      products: cartProducts(product),
    });
    // FastSpring's documented order-level metadata API. Calling tag() before checkout makes the
    // accepted EULA version part of the order and therefore available to order.completed webhooks.
    b.tag(buildCheckoutTags(readAttribution(marketingConsent)));
    b.checkout();
    return true;
  } catch {
    return false;
  }
}
