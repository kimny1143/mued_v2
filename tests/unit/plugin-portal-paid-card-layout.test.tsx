/**
 * The portal's paid card keeps its three columns (plate | text | actions) for every product.
 *
 * 2026-10-13, launch night: MUEDvox's purchase row had no plate, so its text became the first grid child and was
 * laid out in the 96px plate column — the licence key wrapped every 8 characters (kimny's confirmation purchase).
 * masterchain's row had a plate and was fine. jsdom does no layout, so this pins the two things the layout rests on:
 * the card's children are in grid order, and the stylesheet pins the columns. The widths themselves were measured
 * in a browser (PR body).
 */
import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({ default: new Proxy({}, { get: (_t, k) => String(k) }) }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
  useLocale: () => "ja",
}));

import { PluginsPortalView, type PurchaseViewItem } from "@/app/dashboard/plugins/plugins-portal-view";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";

beforeEach(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
afterEach(cleanup);

const purchase = (productKey: PurchaseViewItem["productKey"]): PurchaseViewItem => ({
  productKey, displayName: PAID_PRODUCTS[productKey].displayName, keyFileName: PAID_PRODUCTS[productKey].keyFileName,
  version: "1.0.0", downloadUrl: "https://mued.jp/downloads/x-1.0.0-installer.pkg", licenseKey: `KEY-${productKey}\n`,
  purchasedAtISO: "2026-10-13T13:55:00Z", refundedAtISO: null, windows: null,
});

describe("★every paid product's card: plate, then text, then actions", () => {
  it.each(Object.keys(PAID_PRODUCTS) as Array<PurchaseViewItem["productKey"]>)("%s", (productKey) => {
    const { container } = render(<PluginsPortalView items={[]} purchases={[purchase(productKey)]} />);
    const card = container.querySelector(".module");
    expect(card).not.toBeNull();
    const children = [...card!.children].map((c) => c.getAttribute("class") ?? "");
    expect(children).toHaveLength(3);
    expect(children[0]).toContain("faceplate"); // ★the plate column is never empty — without it the text lands in 96px
    expect(children[1]).toBe("meta");
    expect(children[2]).toBe("action");
  });

  it("MUEDvox's plate is its own screen (the cart's image); masterchain keeps its drawn plate", () => {
    const vox = render(<PluginsPortalView items={[]} purchases={[purchase("muedvox")]} />);
    const img = vox.container.querySelector('[data-testid="paid-plate-muedvox"]');
    expect(img?.tagName).toBe("IMG");
    expect(img?.getAttribute("src")).toContain("MUEDvox-1.0.2-harmony.webp");
    expect(img?.getAttribute("alt")).toBe(""); // decorative: the product name is the heading beside it
    cleanup();
    const mc = render(<PluginsPortalView items={[]} purchases={[purchase("masterchain")]} />);
    expect(mc.container.querySelector(".module > svg.faceplate, .module > .faceplate")?.tagName.toLowerCase()).toBe("svg");
  });
});

describe("★the stylesheet pins the columns, so a card that loses its plate cannot pour its text into the plate column", () => {
  const css = readFileSync("app/dashboard/plugins/plugins-portal.module.css", "utf8");
  it("three columns; text in the 2nd, actions in the 3rd; one column on a phone", () => {
    expect(css).toMatch(/\.module \{[^}]*grid-template-columns: 96px 1fr auto;/);
    expect(css).toMatch(/\.meta \{[^}]*grid-column: 2;/);
    expect(css).toMatch(/\.action \{[^}]*grid-column: 3;/);
    const phone = css.slice(css.indexOf("@media (max-width: 620px)"));
    expect(phone).toMatch(/\.module \{ grid-template-columns: 1fr;/);
    expect(phone).toMatch(/\.meta, \.action \{ grid-column: auto; \}/);
  });
});
