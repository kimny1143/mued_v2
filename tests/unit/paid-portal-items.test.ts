import { describe, expect, it } from "vitest";
import { buildPurchaseItems } from "@/lib/plugins/portal";
import { paidProductByProductId } from "@/lib/plugins/paid-products";

const windows = { url: "https://mued.jp/MUEDvox-1.0.0.zip", version: "1.0.0" };
const resolve = (productId: string) => {
  const product = paidProductByProductId(productId);
  return product ? { product, downloadUrl: `https://mued.jp/${product.displayName}-1.0.0-installer.pkg`, windows } : null;
};
const row = (productId: string, licenseKey: string, day: number) => ({
  productId, licenseKey, createdAt: new Date(Date.UTC(2026, 9, day)),
});

describe("paid purchase assembly", () => {
  it("resolves each product, skips unknown IDs before dedupe, sorts and preserves key bytes", () => {
    const key = "MUEDSP-LICENSE-v2\nscope=muedvox\nsig=x\r\n";
    const items = buildPurchaseItems([
      row("unknown", key, 4),
      row("muedsp_masterchain", "master\n", 1),
      row("muedsp_vox", key, 3),
      row("muedsp_vox", key, 2),
      row("muedsp_vox", " \n", 4),
      row("muedsp_vox", key.trim(), 2),
    ], resolve);
    expect(items.map((p) => p.licenseKey)).toEqual([key, key.trim(), "master\n"]);
    expect(items[0]).toMatchObject({
      productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key",
      version: "1.0.0", downloadUrl: "https://mued.jp/MUEDvox-1.0.0-installer.pkg", windows,
    });
    expect(items[2]).toMatchObject({ productKey: "masterchain", displayName: "masterchain", keyFileName: "MUEDsp-masterchain.license.key" });
  });

  it.each(["muedsp_masterchain", "muedsp_vox"])("refunds suppress key and Windows for %s", (productId) => {
    const refundedAt = new Date();
    const [item] = buildPurchaseItems([{ ...row(productId, "key\n", 1), refundedAt }], resolve);
    expect(item).toMatchObject({ licenseKey: null, windows: null, refundedAt });
  });

  it("handles absent purchases and missing or malformed download URLs", () => {
    expect(buildPurchaseItems(undefined, resolve)).toEqual([]);
    expect(buildPurchaseItems(null, resolve)).toEqual([]);
    for (const downloadUrl of ["", "bad-url", "https://mued.jp/latest.pkg"]) {
      const [item] = buildPurchaseItems([row("muedsp_vox", "key", 1)], (id) => ({ ...resolve(id)!, downloadUrl }));
      expect(item.version).toBeNull();
    }
  });
});
