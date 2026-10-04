/**
 * return.created — a FastSpring refund marks the masterchain purchase row (never deletes it) and the portal
 * stops handing out the key (conductor 2026-09-30, f). Shape: developer.fastspring.com/reference/returncreated.
 */
import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/utils/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { handleFastspringReturnCreated, parseFastspringReturnCreated } from "@/lib/masterchain/fastspring-webhook";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";
import { buildPurchaseItems } from "@/lib/plugins/portal";

const ev = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: "evt_1", type: "return.created", live: true, created: 1759300000000, data, ...extra,
});
const base = {
  return: "RET-1",
  reference: "GLASSWERKSJP261001-1-R",
  original: { id: "ORD-ID", order: "ORD-ORDER", reference: "GLASSWERKSJP261001-1" },
  type: "RETURN",
  changed: 1759310000000,
  // ★The live refund of 2026-10-01 (kimny's verification order) carried completed: true with "Full Refund".
  completed: true,
  items: [{ product: "muedsp-masterchain", refundType: "Full Refund" }],
};

describe("parseFastspringReturnCreated", () => {
  it("reads the return id, both original ids, a full refund and its time", () => {
    const p = parseFastspringReturnCreated(ev(base))!;
    expect(p.returnId).toBe("RET-1");
    expect(p.orderIds).toEqual(["ORD-ORDER", "ORD-ID"]);
    expect(p.kind).toBe("full");
    expect(p.refundedAt?.getTime()).toBe(1759310000000);
  });
  it("a chargeback counts as refunded", () => {
    expect(parseFastspringReturnCreated(ev({ ...base, type: "CHARGEBACK", items: [] }))!.kind).toBe("chargeback");
  });
  it.each([
    [[{ refundType: "Partial Refund" }]],
    [[{ refundType: "Full Refund" }, { refundType: "Partial" }]],
    [[]],
    [[{}]],
  ])("★anything not clearly full is partial (the key stays visible): %j", (items) => {
    expect(parseFastspringReturnCreated(ev({ ...base, items }))!.kind).toBe("partial");
  });
  it.each([
    [{ ...base, return: undefined, id: undefined }, { id: undefined }],
    [{ ...base, original: {} }, {}],
  ])("missing ids → null", (data, extra) => {
    expect(parseFastspringReturnCreated(ev(data as Record<string, unknown>, extra))).toBeNull();
  });
});

function fakeTx(returning: unknown[]) {
  const calls: { set?: Record<string, unknown>; where?: unknown } = {};
  const tx = {
    update: () => ({
      set: (v: Record<string, unknown>) => {
        calls.set = v;
        return { where: (w: unknown) => { calls.where = w; return { returning: async () => returning }; } };
      },
    }),
  };
  return { tx: tx as never, calls };
}

describe("handleFastspringReturnCreated", () => {
  it("full refund: marks refundedAt + return id + kind on the row, never deletes", async () => {
    const { tx, calls } = fakeTx([{ id: "row" }]);
    expect(await handleFastspringReturnCreated(tx, ev(base))).toBe("recorded");
    expect(calls.set).toEqual({ refundReturnId: "RET-1", refundKind: "full", refundedAt: new Date(1759310000000) });
  });
  it("partial refund: recorded, but refundedAt is not set (the key stays)", async () => {
    const { tx, calls } = fakeTx([{ id: "row" }]);
    await handleFastspringReturnCreated(tx, ev({ ...base, items: [{ refundType: "Partial Refund" }] }));
    expect(calls.set).toEqual({ refundReturnId: "RET-1", refundKind: "partial" });
  });
  it("★a partial return never overwrites an earlier full refund: it only touches rows not yet refunded (CCO #1183 ①)", async () => {
    const sqlOf = (w: unknown) => new PgDialect().sqlToQuery(w as SQL).sql;
    const partial = fakeTx([{ id: "row" }]);
    await handleFastspringReturnCreated(partial.tx, ev({ ...base, items: [{ refundType: "Partial Refund" }] }));
    expect(sqlOf(partial.calls.where)).toMatch(/"refunded_at" is null/);
    const full = fakeTx([{ id: "row" }]);
    await handleFastspringReturnCreated(full.tx, ev(base));
    expect(sqlOf(full.calls.where)).not.toMatch(/refunded_at/); // a full refund / chargeback always records
  });
  it.each([
    ["completed: false", { ...base, completed: false }],
    ["completed missing", (({ completed: _c, ...rest }) => rest)(base)],
    ["completed: \"false\"", { ...base, completed: "false" }],
  ])("★a full return that is not completed (%s) leaves the row alone — the key stays (conductor 10/1)", async (_label, data) => {
    const update = vi.fn();
    const tx = { update } as never;
    expect(await handleFastspringReturnCreated(tx, ev(data as Record<string, unknown>))).toBe("not_completed");
    expect(update).not.toHaveBeenCalled();
  });
  it("★the live payload shape (completed: true, Full Refund, type RETURN) marks the row", async () => {
    const { tx, calls } = fakeTx([{ id: "row" }]);
    expect(await handleFastspringReturnCreated(tx, ev({ ...base, completed: true }))).toBe("recorded");
    expect(calls.set).toMatchObject({ refundKind: "full", refundedAt: new Date(1759310000000) });
    expect(parseFastspringReturnCreated(ev({ ...base, completed: "true" }))!.completed).toBe(true);
  });
  it("no matching row → no_purchase (the route keeps it for redelivery)", async () => {
    const { tx } = fakeTx([]);
    expect(await handleFastspringReturnCreated(tx, ev(base))).toBe("no_purchase");
  });
  it("unparseable → the route records it as failed", async () => {
    const { tx } = fakeTx([]);
    expect(await handleFastspringReturnCreated(tx, ev({ ...base, original: {} }))).toBe("unparseable");
  });
});

describe("portal: a refunded purchase", () => {
  it("stays on the shelf, marked, and its key does not reach the client", () => {
    const [item] = buildPurchaseItems(
      [{ productId: "muedsp_masterchain", licenseKey: "MUEDSP-LICENSE-v2\nsig=x\n", createdAt: new Date("2026-10-01"), refundedAt: new Date("2026-10-02") }],
      () => ({ product: PAID_PRODUCTS.masterchain, downloadUrl: "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-installer.pkg", windows: null }),
    );
    expect(item.licenseKey).toBeNull();
    expect(item.refundedAt).toEqual(new Date("2026-10-02"));
  });
  it("positive control: a paid, unrefunded purchase still carries its key verbatim", () => {
    const KEY = "MUEDSP-LICENSE-v2\nsig=x\n";
    const [item] = buildPurchaseItems([{ productId: "muedsp_masterchain", licenseKey: KEY, createdAt: new Date("2026-10-01") }], () => ({ product: PAID_PRODUCTS.masterchain, downloadUrl: "https://mued.jp/downloads/x-1.0.1-installer.pkg", windows: null }));
    expect(item.licenseKey).toBe(KEY);
    expect(item.refundedAt).toBeNull();
  });
});
