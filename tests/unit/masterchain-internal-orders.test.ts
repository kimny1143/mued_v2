/**
 * Our own masterchain orders are recognised by order id so that counts of orders / sales can leave them out
 * (conductor 2026-10-01). The rows are not changed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { INTERNAL_ORDERS, INTERNAL_ORDER_IDS } from "@/lib/masterchain/internal-orders";

it("lists kimny's confirmation purchase by the ids FastSpring gave it", () => {
  expect(INTERNAL_ORDER_IDS).toContain("jrdPficIRayr15KZEyz0gg");
  const o = INTERNAL_ORDERS.find((x) => x.orderId === "jrdPficIRayr15KZEyz0gg")!;
  expect(o.reference).toBe("GLASSWERKSJP260930-7382-30122");
  expect(o.note).toContain("全額返金を確定");
  expect(new Set(INTERNAL_ORDER_IDS).size).toBe(INTERNAL_ORDER_IDS.length);
});

it("★any count under lib/funnel that reads masterchain purchases must leave the internal orders out", () => {
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
  for (const f of readsPurchases) expect(readFileSync(f, "utf8"), f).toMatch(/INTERNAL_ORDER_IDS|LAST_INTERNAL_ORDER_AT/);
});
