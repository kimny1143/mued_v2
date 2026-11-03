/**
 * Our own masterchain orders are recognised by order id so that counts of orders / sales can leave them out
 * (conductor 2026-10-01). The rows are not changed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { INTERNAL_ORDERS, INTERNAL_ORDER_IDS, LAST_INTERNAL_ORDER_AT } from "@/lib/masterchain/internal-orders";

it("lists kimny's confirmation purchase by the ids FastSpring gave it", () => {
  expect(INTERNAL_ORDER_IDS).toContain("jrdPficIRayr15KZEyz0gg");
  const o = INTERNAL_ORDERS.find((x) => x.orderId === "jrdPficIRayr15KZEyz0gg")!;
  expect(o.reference).toBe("GLASSWERKSJP260930-7382-30122");
  expect(o.note).toContain("全額返金を確定");
  expect(new Set(INTERNAL_ORDER_IDS).size).toBe(INTERNAL_ORDER_IDS.length);
});

it("lists the MUEDvox test purchase of 10/13 (kimny 2026-11-03 via conductor), with its product", () => {
  expect(INTERNAL_ORDER_IDS).toContain("k6D9k0AHQ6GhSBNat7KvFg");
  const o = INTERNAL_ORDERS.find((x) => x.orderId === "k6D9k0AHQ6GhSBNat7KvFg")!;
  expect(o.productId).toBe("muedsp_vox");
  expect(o.orderedAt).toBe("2026-10-13T13:56:41Z");
  expect(o.note).toContain("全額返金");
  // ★Every order names its product, so a per-product count can pick its own.
  for (const x of INTERNAL_ORDERS) expect(["muedsp_masterchain", "muedsp_vox"]).toContain(x.productId);
});

it("★LAST_INTERNAL_ORDER_AT is the last MASTERCHAIN internal order — the vox test order does not move it", () => {
  // Positive control: the vox order is later than the masterchain one, so an all-products max would differ.
  const vox = INTERNAL_ORDERS.find((x) => x.productId === "muedsp_vox")!;
  expect(Date.parse(vox.orderedAt)).toBeGreaterThan(Date.parse(LAST_INTERNAL_ORDER_AT));
  expect(LAST_INTERNAL_ORDER_AT).toBe("2026-09-30T20:01:23Z");
});

it("★today no count under lib/funnel reads masterchain purchases — one that does must leave the internal orders out (CCO #1195)", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk("lib/funnel");
  // Positive control: the walk reaches the files (launch.ts is there).
  expect(files.some((f) => f.endsWith("launch.ts"))).toBe(true);
  const readsPurchases = files.filter((f) => /masterchain_purchases|masterchainPurchases/.test(readFileSync(f, "utf8")));
  // ★Zero today, stated as such (the loop below alone would pass on an empty list and check nothing). The day a
  //   count of orders or sales from masterchain_purchases is added here, this fails: update the expected list AND
  //   make that file leave INTERNAL_ORDER_IDS out (the loop then checks it). The reconcile script
  //   (scripts/ops/reconcile-fastspring-orders.ts) matches fulfilment, not sales, so it rightly keeps every order.
  expect(readsPurchases).toEqual([]);
  for (const f of readsPurchases) expect(readFileSync(f, "utf8"), f).toMatch(/INTERNAL_ORDER_IDS|LAST_INTERNAL_ORDER_AT/);
});
