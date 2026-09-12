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
    expect(m.openCheckout()).toBe(false);
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
    const pushed: Record<string, unknown>[] = [];
    (window as unknown as { fastspring: unknown }).fastspring = {
      builder: { push: (p: Record<string, unknown>) => pushed.push(p), checkout: () => {} },
    };
    expect(document.cookie).not.toContain("_ga"); // no GA cookie in this test
    expect(m.openCheckout(true)).toBe(true);
    expect(pushed).toHaveLength(1);
    const tags = pushed[0].tags as Record<string, string>;
    expect("gaClientId" in tags).toBe(false);
    expect(tags.marketingConsent).toBe("true");
  });
});

describe("★openCheckout never throws its way out", () => {
  it("★returns false when the builder is absent rather than blowing up the click handler", async () => {
    const m = await load(CONFIGURED);
    expect(m.openCheckout()).toBe(false);
  });

  it("★returns false when the builder throws", async () => {
    const m = await load(CONFIGURED);
    (window as unknown as { fastspring: unknown }).fastspring = {
      builder: {
        push: () => {
          throw new Error("storefront rejected the session");
        },
        checkout: () => {},
      },
    };
    expect(m.openCheckout()).toBe(false);
  });
});
