/**
 * Unit — /api/webhooks/fastspring route (the envelope layer).
 *
 * ## Why this file exists
 *
 * ★Until this file, `route.ts` was the only part of the paid-line chain with no test at all:
 * `lib/masterchain/*` had 85 tests across 6 files, and the route had 0. That is backwards, because
 * the route holds the one thing in the chain that has ★never been checked against reality — the
 * FastSpring envelope (`events: [...]`, `event.id`, `event.type`). `TODO(C1)` in the route and
 * `docs/paid-line/c1-fastspring-product-and-fulfillment-spec.md` both say so plainly: the parse was
 * written from documentation and has not been compared with a `.test.` storefront delivery.
 *
 * So the untested function was the one carrying the unconfirmed assumption. These tests pin the
 * envelope handling so that when the real payload finally arrives, the diff is visible instead of
 * silent.
 *
 * ## ★The behaviour this file exists to lock down: an unreadable event must not return 2xx
 *
 * The route previously did `logger.error(...); return;` when `event.id` could not be read, and then
 * fell through to `{ received: true }`. FastSpring reads a 2xx as delivered and ★does not redeliver.
 * So a shape mismatch produced: charge taken, no license issued, no `webhook_events` row, and
 * nothing red anywhere — the most expensive possible way to be wrong.
 *
 * ★A 500 is the honest answer: the assumption that broke is ours, and a 5xx keeps a retry window
 * open so the order survives long enough for us to fix the parse. A 4xx would blame the sender and
 * lose the order for good.
 *
 * ## ★What these tests do NOT establish
 *
 * They pin OUR reading of the envelope. They cannot tell us whether that reading is ★correct —
 * only a real `.test.` storefront delivery can, and that is still blocked on activation. ★If the
 * real envelope turns out to differ, these tests will need to change with it: they are a record of
 * the current assumption, not evidence for it.
 *
 * The DB is a stub, deliberately: this repo's `DATABASE_URL` points at production, so exercising
 * the route for real would write purchase rows (the same reason `masterchain-order-handler.test.ts`
 * gives for stubbing its transaction).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockHeaderGet,
  mockVerify,
  mockHandleOrder,
  mockSelectLimit,
  txInserts,
  txUpdates,
  mockTransaction,
} = vi.hoisted(() => {
  const txInserts: unknown[] = [];
  const txUpdates: unknown[] = [];
  const tx = {
    insert: () => ({
      values: (v: unknown) => {
        txInserts.push(v);
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (v: unknown) => ({
        where: () => {
          txUpdates.push(v);
          return Promise.resolve();
        },
      }),
    }),
  };
  return {
    mockHeaderGet: vi.fn(() => "sig"),
    mockVerify: vi.fn(() => true),
    mockHandleOrder: vi.fn(() => Promise.resolve()),
    mockSelectLimit: vi.fn(() => Promise.resolve([])),
    txInserts,
    txUpdates,
    mockTransaction: vi.fn((cb: (t: typeof tx) => Promise<void>) => cb(tx)),
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: mockHeaderGet }) }));
vi.mock("@/lib/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }),
    transaction: mockTransaction,
  },
}));
vi.mock("@/db/schema", () => ({ webhookEvents: { eventId: "event_id" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn((a, b) => ({ a, b })) }));
vi.mock("@/lib/masterchain/fastspring-signature", () => ({
  verifyFastspringSignature: mockVerify,
  FASTSPRING_SIGNATURE_HEADER: "x-fs-signature",
}));
vi.mock("@/lib/masterchain/fastspring-webhook", () => ({
  handleFastspringOrderCompleted: mockHandleOrder,
}));

import { GET, POST } from "@/app/api/webhooks/fastspring/route";

/** Minimal Request stand-in — the route only calls `request.text()`. */
const req = (body: unknown) =>
  ({ text: async () => (typeof body === "string" ? body : JSON.stringify(body)) }) as never;

const order = (id: string) => ({ id, type: "order.completed", data: { order: id } });

beforeEach(() => {
  vi.clearAllMocks();
  txInserts.length = 0;
  txUpdates.length = 0;
  mockHeaderGet.mockReturnValue("sig");
  mockVerify.mockReturnValue(true);
  mockSelectLimit.mockResolvedValue([]);
});

describe("GET — liveness", () => {
  it("answers ok without touching the DB", async () => {
    const res = await GET();
    expect(res).toMatchObject({ status: 200, body: { status: "ok" } });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("POST — the gate", () => {
  it("★rejects a bad signature with 401 and never reaches the DB", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("★fail-closed on a missing signature header (not just a wrong one)", async () => {
    mockHeaderGet.mockReturnValue(null);
    mockVerify.mockReturnValue(false);
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(401);
  });

  it("rejects a body that is not JSON with 400, after the signature passed", async () => {
    const res = await POST(req("not json"));
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("POST — the envelope (★our assumption, not a confirmed shape)", () => {
  it("processes every event in a batch", async () => {
    const res = await POST(req({ events: [order("e1"), order("e2")] }));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockHandleOrder).toHaveBeenCalledTimes(2);
  });

  it("falls back to treating the whole body as one event when there is no `events` array", async () => {
    const res = await POST(req(order("solo")));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(txInserts[0]).toMatchObject({ eventId: "solo", type: "order.completed" });
  });

  it("records the event under source 'fastspring' before handing off", async () => {
    await POST(req({ events: [order("e1")] }));
    expect(txInserts[0]).toMatchObject({ eventId: "e1", source: "fastspring", status: "processing" });
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });
});

describe("POST — ★an unreadable event must not be reported as success", () => {
  it("★returns 500, NOT 200, when the event has no readable id", async () => {
    // ★The regression this file was written for. Before the fix this returned 200 and FastSpring,
    // reading that as delivered, would never redeliver the order.
    const res = await POST(req({ events: [{ type: "order.completed" }] }));
    expect(res.status).toBe(500);
    expect(res.status).not.toBe(200);
    expect(res.body).toMatchObject({ error: "processing failed" });
  });

  it("★does not issue a license, and does not record the event, for an unreadable one", async () => {
    await POST(req({ events: [{ type: "order.completed" }] }));
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txInserts).toHaveLength(0);
  });

  it("★treats a non-string id the same as a missing one", async () => {
    const res = await POST(req({ events: [{ id: 12345, type: "order.completed" }] }));
    expect(res.status).toBe(500);
  });

  it("★fails the whole batch when one event is unreadable — the readable ones are covered by the idempotency guard on redelivery", async () => {
    const res = await POST(req({ events: [order("good"), { type: "order.completed" }] }));
    expect(res.status).toBe(500);
    // The first event was already committed before the throw; on FastSpring's retry it is skipped.
    expect(txInserts).toHaveLength(1);
    expect(txInserts[0]).toMatchObject({ eventId: "good" });
  });

  it("★a handler failure is also a 500 — never a 2xx with the sale unrecorded", async () => {
    mockHandleOrder.mockRejectedValueOnce(new Error("no signing key"));
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(500);
  });
});

describe("POST — idempotency and routing", () => {
  it("skips an event already marked processed, without re-issuing", async () => {
    mockSelectLimit.mockResolvedValue([{ eventId: "e1", status: "processed" }]);
    const res = await POST(req({ events: [order("e1")] }));
    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockHandleOrder).not.toHaveBeenCalled();
  });

  it("retries an event left in 'processing' rather than inserting a duplicate", async () => {
    mockSelectLimit.mockResolvedValue([{ eventId: "e1", status: "processing" }]);
    await POST(req({ events: [order("e1")] }));
    expect(txInserts).toHaveLength(0);
    expect(txUpdates[0]).toMatchObject({ status: "processing", errorMessage: null });
  });

  it("★records a non-order event but does not issue a license (routine skip, not an error)", async () => {
    const res = await POST(req({ events: [{ id: "e9", type: "subscription.charge.completed" }] }));
    expect(res.status).toBe(200);
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txInserts[0]).toMatchObject({ eventId: "e9", type: "subscription.charge.completed" });
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });

  it("★an event whose type is unreadable is still recorded, under type 'unknown'", async () => {
    // ★Deliberately NOT a throw: unlike a missing id, this leaves a row someone can find. Whether
    // that is the right call is a separate question from the 2xx bug and is flagged for review —
    // this test pins today's behaviour so a future change to it is deliberate.
    const res = await POST(req({ events: [{ id: "e10" }] }));
    expect(res.status).toBe(200);
    expect(txInserts[0]).toMatchObject({ eventId: "e10", type: "unknown" });
  });
});
