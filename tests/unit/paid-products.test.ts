import { describe, it, expect } from "vitest";
import { PAID_PRODUCTS, paidProductByFastspringPath, paidProductByProductId } from "@/lib/plugins/paid-products";

describe("PAID_PRODUCTS (C9)", () => {
  it("masterchain keeps every value it had before the table existed", () => {
    // ★Measured: every live order's data.items[0].product (webhook_events, 2026-10-04).
    expect(PAID_PRODUCTS.masterchain).toMatchObject({ enabled: true, displayName: "masterchain", keyFileName: "MUEDsp-masterchain.license.key" });
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
    for (const field of ["fastspringPath", "productId", "scope", "keyFileName"] as const) {
      expect(new Set(all.map((p) => p[field])).size).toBe(all.length);
    }
  });
});

it("MUEDvox is registered but cannot be fulfilled until launch", () => {
  expect(PAID_PRODUCTS.muedvox).toEqual({
    key: "muedvox", fastspringPath: "muedsp-vox", productId: "muedsp_vox",
    scope: "muedvox", itemName: "MUEDvox", displayName: "MUEDvox",
    keyFileName: "MUEDvox.license.key", enabled: false,
  });
  expect(paidProductByFastspringPath("muedsp-vox")).toBeNull();
  expect(paidProductByProductId("muedsp_vox")).toBe(PAID_PRODUCTS.muedvox);
  expect(paidProductByProductId("muedsp_masterchain")).toBe(PAID_PRODUCTS.masterchain);
  expect(paidProductByProductId("unknown")).toBeNull();
});
