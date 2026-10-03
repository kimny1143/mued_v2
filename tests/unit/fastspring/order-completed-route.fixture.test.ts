import { beforeEach, describe, expect, it, vi } from "vitest";

import minimalAccountIdFixture from "../../fixtures/fastspring/minimal-account-id.json";
import popupOrderLiveFixture from "../../fixtures/fastspring/popup-order-live.json";
import popupOrderTestFixture from "../../fixtures/fastspring/popup-order-test.json";

const {
  mockHandleOrder,
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
}));

import { POST, SKIPPED_TEST_MARKER } from "@/app/api/webhooks/fastspring/route";

const request = (body: unknown) =>
  ({ text: async () => JSON.stringify(body) }) as never;

const payloadFrom = (fixture: { events: unknown[] }) => ({ events: fixture.events });

beforeEach(() => {
  vi.clearAllMocks();
  txInserts.length = 0;
  txUpdates.length = 0;
  mockHeaderGet.mockReturnValue("fixture-signature");
  mockSelectLimit.mockResolvedValue([]);
  mockHandleOrder.mockResolvedValue("ok");
});

describe("FastSpring route — official envelope fixtures", () => {
  it("does not fulfill the live=false order because of the live guard", async () => {
    const response = await POST(request(payloadFrom(popupOrderTestFixture)));

    expect(response.status).toBe(200);
    expect(mockHandleOrder).not.toHaveBeenCalled();
    expect(txInserts).toHaveLength(1);
    expect(txUpdates.at(-1)).toMatchObject({
      errorMessage: SKIPPED_TEST_MARKER,
      completedAt: expect.any(Date),
    });
    expect(txUpdates.at(-1)).not.toHaveProperty("status");
  });

  it("iterates every event in a multi-event FastSpring envelope", async () => {
    const response = await POST(
      request({
        events: [
          structuredClone(popupOrderLiveFixture.events[0]),
          structuredClone(minimalAccountIdFixture.events[0]),
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockHandleOrder).toHaveBeenCalledTimes(2);
    expect(mockHandleOrder.mock.calls.map((call) => call[1])).toEqual([
      popupOrderLiveFixture.events[0],
      minimalAccountIdFixture.events[0],
    ]);
  });

  it("★C9: an order for a product we do not sell is recorded as FAILED and answered non-2xx, so FastSpring redelivers", async () => {
    mockHandleOrder.mockResolvedValue("unknown_product");
    const response = await POST(request(payloadFrom(popupOrderLiveFixture)));

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(txInserts).toHaveLength(1); // the row with the payload stays — redelivery can still land
    expect(txUpdates.at(-1)).toMatchObject({
      status: "failed",
      errorMessage: expect.stringContaining("not in PAID_PRODUCTS"),
      completedAt: expect.any(Date),
    });
  });
});
