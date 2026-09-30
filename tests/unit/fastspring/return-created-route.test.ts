import { beforeEach, describe, expect, it, vi } from "vitest";


const {
  mockHandleOrder,
  mockHandleReturn,
  mockHeaderGet,
  mockSelectLimit,
  mockTransaction,
  txInserts,
  txUpdates,
} = vi.hoisted(() => {
  const txInserts: unknown[] = [];
  const txUpdates: unknown[] = [];
  const tx = {
    insert: () => ({
      values: (value: unknown) => {
        txInserts.push(value);
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (value: unknown) => ({
        where: () => {
          txUpdates.push(value);
          return Promise.resolve();
        },
      }),
    }),
  };

  return {
    mockHandleOrder: vi.fn(() => Promise.resolve("ok")),
    mockHandleReturn: vi.fn(() => Promise.resolve("recorded")),
    mockHeaderGet: vi.fn(() => "fixture-signature"),
    mockSelectLimit: vi.fn(() => Promise.resolve([])),
    mockTransaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) =>
      callback(tx),
    ),
    txInserts,
    txUpdates,
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
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
vi.mock("drizzle-orm", () => ({ eq: vi.fn((left, right) => ({ left, right })) }));
vi.mock("@/lib/masterchain/fastspring-signature", () => ({
  verifyFastspringSignature: vi.fn(() => true),
  FASTSPRING_SIGNATURE_HEADER: "x-fs-signature",
}));
vi.mock("@/lib/masterchain/fastspring-webhook", () => ({
  handleFastspringOrderCompleted: mockHandleOrder,
  handleFastspringReturnCreated: mockHandleReturn,
}));

import { POST, SKIPPED_TEST_MARKER } from "@/app/api/webhooks/fastspring/route";

const request = (body: unknown) =>
  ({ text: async () => JSON.stringify(body) }) as never;


beforeEach(() => {
  vi.clearAllMocks();
  txInserts.length = 0;
  txUpdates.length = 0;
  mockHeaderGet.mockReturnValue("fixture-signature");
  mockSelectLimit.mockResolvedValue([]);
  mockHandleOrder.mockResolvedValue("ok");
  mockHandleReturn.mockResolvedValue("recorded");
});

const ret = (live: unknown) => ({
  id: "evt_ret_1", type: "return.created", live, created: 1759300000000,
  data: { return: "RET-1", original: { id: "ORD-ID", order: "ORD-ORDER" }, type: "RETURN", items: [{ refundType: "Full Refund" }] },
});

describe("FastSpring route — return.created (conductor 2026-09-30, f)", () => {
  it("a live refund reaches the return handler and the event is processed", async () => {
    const response = await POST(request({ events: [ret(true)] }));
    expect(response.status).toBe(200);
    expect(mockHandleReturn).toHaveBeenCalledTimes(1);
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });
  it.each([false, undefined])("★a test refund (live=%s) never touches a purchase row", async (live) => {
    const response = await POST(request({ events: [ret(live)] }));
    expect(response.status).toBe(200);
    expect(mockHandleReturn).not.toHaveBeenCalled();
    expect(txUpdates.at(-1)).toMatchObject({ errorMessage: SKIPPED_TEST_MARKER });
  });
  it("an unparseable refund is kept as failed (row + payload stay) and answered 500", async () => {
    mockHandleReturn.mockResolvedValue("unparseable");
    const response = await POST(request({ events: [ret(true)] }));
    expect(response.status).toBe(500);
    expect(txUpdates.at(-1)).toMatchObject({ status: "failed" });
    expect(String((txUpdates.at(-1) as { errorMessage: string }).errorMessage)).toMatch(/return\.created/);
  });
  it("a refund for an order that is not ours is still processed (no redelivery loop)", async () => {
    mockHandleReturn.mockResolvedValue("no_purchase");
    const response = await POST(request({ events: [ret(true)] }));
    expect(response.status).toBe(200);
    expect(txUpdates.at(-1)).toMatchObject({ status: "processed" });
  });
});
