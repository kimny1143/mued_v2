import { describe, it, expect } from "vitest";
import { PAID_PRODUCTS, paidProductByFastspringPath } from "@/lib/plugins/paid-products";

describe("PAID_PRODUCTS (C9)", () => {
  it("masterchain keeps every value it had before the table existed", () => {
    // ★Measured: every live order's data.items[0].product (webhook_events, 2026-10-04).
    expect(PAID_PRODUCTS.masterchain.fastspringPath).toBe("muedsp-masterchain");
    // ★Unchanged from the old hard-coded webhook: product_id, license scope, GA4 item name.
    expect(PAID_PRODUCTS.masterchain.productId).toBe("muedsp_masterchain");
    expect(PAID_PRODUCTS.masterchain.scope).toBe("masterchain");
    expect(PAID_PRODUCTS.masterchain.itemName).toBe("MUEDsp masterchain");
  });

  it("finds a product only by its exact FastSpring path", () => {
    expect(paidProductByFastspringPath("muedsp-masterchain")?.key).toBe("masterchain");
    expect(paidProductByFastspringPath("example-product")).toBeNull();
    expect(paidProductByFastspringPath("MUEDSP-MASTERCHAIN")).toBeNull();
    expect(paidProductByFastspringPath(undefined)).toBeNull();
    expect(paidProductByFastspringPath("")).toBeNull();
  });

  it("no two products share a path, a product_id or a scope (a key must open exactly one product)", () => {
    const all = Object.values(PAID_PRODUCTS);
    for (const field of ["fastspringPath", "productId", "scope"] as const) {
      expect(new Set(all.map((p) => p[field])).size).toBe(all.length);
    }
  });
});
