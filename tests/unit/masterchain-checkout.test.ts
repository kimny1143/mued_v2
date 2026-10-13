/**
 * Unit — the masterchain checkout must be completely inert until BOTH identifiers are configured.
 *
 * ## What can and cannot be tested here
 *
 * ★There is no FastSpring storefront yet, so nothing can prove a popup opens. ★What these tests hold
 * is the other direction, which is the direction that can hurt a customer today: with the env unset,
 * no script is fetched, no session is built, and the button stays exactly as it was. ★The negative
 * controls are the deliverable — the positive path is confirmed by the first `.test.` order.
 *
 * ★NEXT_PUBLIC_* is inlined at build time by Next, but read from `process.env` at runtime under
 * vitest. That difference is why the module reads them into module-scope constants: these tests
 * exercise the same constants production gets, just populated by a different mechanism.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const STOREFRONT = "NEXT_PUBLIC_FASTSPRING_STOREFRONT";
const PRODUCT = "NEXT_PUBLIC_FASTSPRING_PRODUCT_PATH";

async function load(env: Partial<Record<string, string>>) {
  vi.resetModules();
  for (const k of [STOREFRONT, PRODUCT]) delete process.env[k];
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  return import("@/lib/masterchain/fastspring-checkout");
}

const CONFIGURED = { [STOREFRONT]: "mued.test.onfastspring.com", [PRODUCT]: "muedsp-masterchain" };

function checkoutBuilder() {
  const pushed: Record<string, unknown>[] = [];
  const tagged: Record<string, string>[] = [];
  const checkout = vi.fn();
  (window as unknown as { fastspring: unknown }).fastspring = {
    builder: {
      push: (p: Record<string, unknown>) => pushed.push(p),
      tag: (tags: Record<string, string>) => tagged.push(tags),
      checkout,
    },
  };
  return { pushed, tagged, checkout };
}

beforeEach(() => {
  document.head.innerHTML = "";
  document.cookie = "";
  delete (window as unknown as { fastspring?: unknown }).fastspring;
});
afterEach(() => {
  for (const k of [STOREFRONT, PRODUCT]) delete process.env[k];
});

describe("★env unset — the page must behave exactly as it did before this feature", () => {
  it("★★is not enabled, loads no script, and opens nothing", async () => {
    const m = await load({});
    expect(m.MASTERCHAIN_CHECKOUT_ENABLED).toBe(false);
    await expect(m.loadCheckoutScript()).resolves.toBe(false);
    // ★The load-bearing assertion: nothing was appended to the document. A customer with no
    //   storefront configured must not even fetch a third-party script.
    expect(document.getElementById("fsc-api")).toBeNull();
    expect(document.head.querySelectorAll("script").length).toBe(0);
    expect(m.openCheckout({ eulaAccepted: true })).toBe(false);
  });

  it("★★one identifier is not enough — half-configured stays disabled", async () => {
    // ★A storefront with no product path would render an ENABLED button that cannot check out,
    //   which is worse than the disabled one it replaced.
    for (const half of [{ [STOREFRONT]: "x.test.onfastspring.com" }, { [PRODUCT]: "muedsp-masterchain" }]) {
      const m = await load(half);
      expect(m.MASTERCHAIN_CHECKOUT_ENABLED, JSON.stringify(half)).toBe(false);
      await expect(m.loadCheckoutScript()).resolves.toBe(false);
      expect(document.getElementById("fsc-api")).toBeNull();
    }
  });

  it("★positive control — with both set it IS enabled and does append the script", async () => {
    // ★Without this, every assertion above would also hold for a module that is permanently dead.
    const m = await load(CONFIGURED);
    expect(m.MASTERCHAIN_CHECKOUT_ENABLED).toBe(true);
    void m.loadCheckoutScript();
    const el = document.getElementById("fsc-api");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-storefront")).toBe(CONFIGURED[STOREFRONT]);
    // ★The popup-closed callback is named on the tag and exists before the builder reads it.
    expect(el?.getAttribute("data-popup-closed")).toBe("__muedspFsPopupClosed");
    expect(typeof (window as unknown as Record<string, unknown>).__muedspFsPopupClosed).toBe("function");
    // ★The session-data callback too — it is how the modal gets the price in the buyer's currency.
    expect(el?.getAttribute("data-data-callback")).toBe("__muedspFsData");
    expect(typeof (window as unknown as Record<string, unknown>).__muedspFsData).toBe("function");
  });
});

describe("★tags — a purchase is not an opt-in", () => {
  it("★★marketingConsent is sent as \"false\" rather than omitted", async () => {
    const m = await load(CONFIGURED);
    // ★Absent and false must not be the same thing downstream: the audience add is gated on this
    //   tag, so "we never asked" and "they declined" have to be distinguishable.
    expect(m.buildCheckoutTags({}).marketingConsent).toBe("false");
    expect(m.buildCheckoutTags({ marketingConsent: false }).marketingConsent).toBe("false");
    expect(m.buildCheckoutTags({ marketingConsent: true }).marketingConsent).toBe("true");
  });

  it("★empty attribution is omitted, not sent as an empty string", async () => {
    const m = await load(CONFIGURED);
    const tags = m.buildCheckoutTags({ utmSource: "", utmMedium: undefined, utmCampaign: "launch" });
    expect("utmSource" in tags).toBe(false);
    expect("utmMedium" in tags).toBe(false);
    expect(tags.utmCampaign).toBe("launch");
  });

  it("★★a missing gaClientId does NOT block the purchase", async () => {
    // ★The note at the Buy slot says "without it the purchase event is skipped" — we lose the
    //   measurement, never the sale. ★This is the assertion that keeps that true.
    const m = await load(CONFIGURED);
    const { pushed, tagged } = checkoutBuilder();
    expect(document.cookie).not.toContain("_ga"); // no GA cookie in this test
    expect(m.openCheckout({ eulaAccepted: true, marketingConsent: true })).toBe(true);
    expect(pushed).toHaveLength(1);
    expect(tagged).toHaveLength(1);
    const tags = tagged[0];
    expect("gaClientId" in tags).toBe(false);
    expect(tags.marketingConsent).toBe("true");
  });

  it("★★fails closed before consent and writes the accepted EULA version with builder.tag()", async () => {
    const m = await load(CONFIGURED);
    const { EULA_VERSION } = await import("@/lib/legal/eula");
    const { pushed, tagged, checkout } = checkoutBuilder();

    expect(m.openCheckout({ eulaAccepted: false })).toBe(false);
    expect(pushed).toHaveLength(0);
    expect(tagged).toHaveLength(0);
    expect(checkout).not.toHaveBeenCalled();

    expect(m.openCheckout({ eulaAccepted: true })).toBe(true);
    expect(pushed).toHaveLength(1);
    expect(tagged).toEqual([expect.objectContaining({ eula_version: EULA_VERSION })]);
    expect(checkout).toHaveBeenCalledTimes(1);
  });
});

describe("★loadCheckoutScript always settles", () => {
  it("★★resolves when the script element already finished loading (does not hang)", async () => {
    // ★CCO, review of #1025: a script that has already fired `load` will never fire it again, so
    //   subscribing to it leaves the promise pending forever. ★Reachable after a first load that
    //   returned 200 with the wrong body (no builder) followed by a client-side remount.
    // ★The race is the assertion: without the fix this resolves to "hung" instead of a boolean.
    const m = await load(CONFIGURED);
    const el = document.createElement("script");
    el.id = "fsc-api";
    el.dataset.fsSettled = "1";
    document.head.appendChild(el);

    const result = await Promise.race([
      m.loadCheckoutScript(),
      new Promise((r) => setTimeout(() => r("hung"), 150)),
    ]);
    expect(result).not.toBe("hung");
    expect(result).toBe(false); // settled, and no builder was exposed
  });
});

describe("★openCheckout never throws its way out", () => {
  it("★returns false when the builder is absent rather than blowing up the click handler", async () => {
    const m = await load(CONFIGURED);
    expect(m.openCheckout({ eulaAccepted: true })).toBe(false);
  });

  it("★returns false when the builder throws", async () => {
    const m = await load(CONFIGURED);
    (window as unknown as { fastspring: unknown }).fastspring = {
      builder: {
        push: () => {
          throw new Error("storefront rejected the session");
        },
        tag: () => {},
        checkout: () => {},
      },
    };
    expect(m.openCheckout({ eulaAccepted: true })).toBe(false);
  });
});

describe("popup closed → completed order only (conductor 2026-10-01)", () => {
  it("dispatches the event only when FastSpring passes an order reference", async () => {
    const { handlePopupClosed, ORDER_COMPLETED_EVENT } = await import("@/lib/masterchain/fastspring-checkout");
    const seen = vi.fn();
    window.addEventListener(ORDER_COMPLETED_EVENT, seen);
    expect(handlePopupClosed(null)).toBe(false); // closed without paying
    expect(handlePopupClosed({ id: null, reference: null })).toBe(false);
    expect(handlePopupClosed({})).toBe(false);
    expect(seen).not.toHaveBeenCalled();
    expect(handlePopupClosed({ id: "ORD-1", reference: "GLASSWERKSJP261001-1" })).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
    window.removeEventListener(ORDER_COMPLETED_EVENT, seen);
  });
});

/** Session data as the live store returned it (2026-10-01, abridged to the fields read). */
function session(over: Record<string, unknown>, items: Record<string, unknown>[] = [{ path: "muedsp-masterchain", selected: true, quantity: 1 }]) {
  return { groups: [{ items }], ...over };
}
const JP = { country: "JP", currency: "JPY", total: "¥12,364", totalWithTax: "¥12,364", totalWithTaxValue: 12364, tax: "¥1,124", taxRate: "10%", taxType: "JCT", taxPriceType: "included" };
const US = { country: "US", currency: "USD", total: "$69.00", totalWithTax: "$69.00", totalWithTaxValue: 69, tax: "$0.00", taxRate: "0%", taxType: "US", taxPriceType: "added" };

describe("★the price in the buyer's currency, from FastSpring's own session (kimny 10/1)", () => {
  it("reads JP (tax included) and US (tax added) as the store returned them", async () => {
    const { readQuote } = await load(CONFIGURED);
    expect(readQuote(session(JP))).toEqual({ total: "¥12,364", currency: "JPY", taxPriceType: "included", tax: "¥1,124", taxRate: "10%", taxType: "JCT" });
    expect(readQuote(session(US))).toMatchObject({ total: "$69.00", taxPriceType: "added" });
  });

  it("★no figure unless the cart is exactly masterchain × 1 — an empty cart totals ¥0 on the live store", async () => {
    const { readQuote } = await load(CONFIGURED);
    expect(readQuote(session({ ...JP, totalWithTax: "¥0", totalWithTaxValue: 0 }, []))).toBeNull(); // before requestQuote
    expect(readQuote(session(JP, [{ path: "muedsp-masterchain", selected: false, quantity: 1 }]))).toBeNull();
    expect(readQuote(session(JP, [{ path: "muedsp-masterchain", selected: true, quantity: 2 }]))).toBeNull();
    expect(readQuote(session(JP, [{ path: "muedsp-masterchain", selected: true, quantity: 1 }, { path: "other", selected: true, quantity: 1 }]))).toBeNull();
    expect(readQuote(session({ ...JP, taxPriceType: "unknown" }))).toBeNull();
    expect(readQuote(null)).toBeNull();
  });

  it("handleSessionData announces a quote and remembers it; requestQuote puts masterchain × 1 in the session", async () => {
    const m = await load(CONFIGURED);
    const seen = vi.fn();
    window.addEventListener(m.QUOTE_EVENT, seen);
    expect(m.currentQuote()).toBeNull();
    m.handleSessionData(session({ ...JP, totalWithTaxValue: 0 }, [])); // empty cart: nothing announced
    expect(seen).not.toHaveBeenCalled();
    m.handleSessionData(session(JP));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(m.currentQuote()?.total).toBe("¥12,364");
    window.removeEventListener(m.QUOTE_EVENT, seen);

    const { pushed, checkout } = checkoutBuilder();
    expect(m.requestQuote()).toBe(true);
    // MUEDvox is on sale too (2026-10-13), so the cart names it × 0: never the two together.
    expect(pushed).toEqual([{ products: [{ path: "muedsp-masterchain", quantity: 1 }, { path: "muedsp-vox", quantity: 0 }] }]);
    expect(checkout).not.toHaveBeenCalled(); // pricing only — no popup
  });

  it("requestQuote does nothing while checkout is not configured", async () => {
    const m = await load({});
    const { pushed } = checkoutBuilder();
    expect(m.requestQuote()).toBe(false);
    expect(pushed).toEqual([]);
  });
});

describe("★one path per product (C9 PR-C) — masterchain's checkout does not move, a disabled product cannot check out", () => {
  const TWO = { enabled: true };
  /** The product table as it will be on MUEDvox's launch day: both rows enabled. */
  async function loadWithBothOnSale() {
    vi.resetModules();
    for (const [k, v] of Object.entries(CONFIGURED)) process.env[k] = v;
    vi.doMock("@/lib/plugins/paid-products", async (original) => {
      const actual = await original<typeof import("@/lib/plugins/paid-products")>();
      return { ...actual, PAID_PRODUCTS: { ...actual.PAID_PRODUCTS, muedvox: { ...actual.PAID_PRODUCTS.muedvox, ...TWO } } };
    });
    return import("@/lib/masterchain/fastspring-checkout");
  }
  afterEach(() => vi.doUnmock("@/lib/plugins/paid-products"));

  /** The table with MUEDvox's row off — the state before 2026-10-13, and what closing its sale looks like. */
  async function loadWithMuedvoxOff() {
    vi.resetModules();
    for (const [k, v] of Object.entries(CONFIGURED)) process.env[k] = v;
    vi.doMock("@/lib/plugins/paid-products", async (original) => {
      const actual = await original<typeof import("@/lib/plugins/paid-products")>();
      return { ...actual, PAID_PRODUCTS: { ...actual.PAID_PRODUCTS, muedvox: { ...actual.PAID_PRODUCTS.muedvox, enabled: false } } };
    });
    return import("@/lib/masterchain/fastspring-checkout");
  }

  it("★★MUEDvox's row disabled (a fixture since launch): masterchain sends exactly the payload it always sent, and MUEDvox opens nothing", async () => {
    const m = await loadWithMuedvoxOff();
    expect(m.cartProducts("masterchain")).toEqual([{ path: "muedsp-masterchain", quantity: 1 }]);
    expect(m.checkoutPath("muedvox")).toBe("");
    expect(m.checkoutEnabled("muedvox")).toBe(false);
    await expect(m.loadCheckoutScript("muedvox")).resolves.toBe(false);
    expect(document.getElementById("fsc-api")).toBeNull();
    const { pushed, checkout } = checkoutBuilder();
    expect(m.requestQuote("muedvox")).toBe(false);
    expect(m.openCheckout({ eulaAccepted: true, product: "muedvox" })).toBe(false);
    expect(pushed).toEqual([]);
    expect(checkout).not.toHaveBeenCalled();

    expect(m.openCheckout({ eulaAccepted: true })).toBe(true);
    expect(pushed).toEqual([{ products: [{ path: "muedsp-masterchain", quantity: 1 }] }]);
  });

  it("★★today's real table (both on sale since 2026-10-13): each cart is its own product × 1 and the other × 0", async () => {
    const m = await load(CONFIGURED);
    expect(m.checkoutEnabled("muedvox")).toBe(true);
    expect(m.cartProducts("masterchain")).toEqual([{ path: "muedsp-masterchain", quantity: 1 }, { path: "muedsp-vox", quantity: 0 }]);
    expect(m.cartProducts("muedvox")).toEqual([{ path: "muedsp-vox", quantity: 1 }, { path: "muedsp-masterchain", quantity: 0 }]);
  });

  it("★★both on sale: each cart holds its own product × 1 and sets the other to 0 — never the two together", async () => {
    // ★The webhook fulfils only an order of exactly one known item; a session carrying both would be paid and get no key.
    const m = await loadWithBothOnSale();
    const { pushed, checkout } = checkoutBuilder();
    expect(m.checkoutPath("muedvox")).toBe("muedsp-vox"); // from the table, not from the env
    expect(m.requestQuote("masterchain")).toBe(true);
    expect(m.openCheckout({ eulaAccepted: true, product: "muedvox" })).toBe(true);
    expect(pushed).toEqual([
      { products: [{ path: "muedsp-masterchain", quantity: 1 }, { path: "muedsp-vox", quantity: 0 }] },
      { products: [{ path: "muedsp-vox", quantity: 1 }, { path: "muedsp-masterchain", quantity: 0 }] },
    ]);
    expect(checkout).toHaveBeenCalledTimes(1);
  });

  it("★a figure belongs to the product whose cart asked for it — masterchain's price never shows in MUEDvox's cart", async () => {
    const m = await loadWithBothOnSale();
    checkoutBuilder();
    const vox = session(JP, [{ path: "muedsp-vox", selected: true, quantity: 1 }]);
    m.requestQuote("masterchain");
    expect(m.handleSessionData(vox)).toBeNull(); // the session still holds the other product: no figure
    m.handleSessionData(session(JP));
    expect(m.currentQuote("masterchain")?.total).toBe("¥12,364");
    expect(m.currentQuote("muedvox")).toBeNull();
    m.requestQuote("muedvox");
    expect(m.handleSessionData(session(JP))).toBeNull();
    expect(m.handleSessionData(vox)?.total).toBe("¥12,364");
    expect(m.currentQuote("muedvox")?.total).toBe("¥12,364");
  });

  it("★masterchain's path is the env's, not the table's — this change does not move the live checkout (CCO #1263 C)", async () => {
    const m = await load({ ...CONFIGURED, [PRODUCT]: "a-path-only-the-env-has" });
    expect(m.checkoutPath("masterchain")).toBe("a-path-only-the-env-has");
    expect(m.cartProducts("masterchain")[0]).toEqual({ path: "a-path-only-the-env-has", quantity: 1 });
  });

  it("★opening a product's checkout makes it the one session data is read for, without a quote request first (CCO #1263 G)", async () => {
    const m = await loadWithBothOnSale();
    checkoutBuilder();
    expect(m.openCheckout({ eulaAccepted: true, product: "muedvox" })).toBe(true);
    expect(m.handleSessionData(session(JP, [{ path: "muedsp-vox", selected: true, quantity: 1 }]))?.total).toBe("¥12,364");
    expect(m.currentQuote("muedvox")?.total).toBe("¥12,364");
    expect(m.currentQuote("masterchain")).toBeNull();
  });
});
