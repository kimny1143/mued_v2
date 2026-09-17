import { describe, expect, it, vi } from "vitest";

import {
  fetchFastspringOrderIds,
  reconcileOrderIds,
  runReconciliation,
  type DatabaseOrderState,
} from "@/scripts/ops/reconcile-fastspring-orders";

const credentials = { username: "api-user", password: "api-password" };

describe("fetchFastspringOrderIds", () => {
  it("requests completed live product orders and follows FastSpring pagination", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: "success",
        page: 1,
        limit: 50,
        nextPage: 2,
        total: 3,
        orders: ["ORDER-1", "ORDER-2"],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: "success",
        page: 2,
        limit: 50,
        nextPage: null,
        total: 3,
        orders: ["ORDER-3"],
      }), { status: 200 }));

    await expect(fetchFastspringOrderIds({
      days: 8,
      credentials,
      fetchImpl,
    })).resolves.toEqual(["ORDER-1", "ORDER-2", "ORDER-3"]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = fetchImpl.mock.calls[0];
    const url = new URL(String(firstUrl));
    expect(url.origin + url.pathname).toBe("https://api.fastspring.com/orders");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      days: "8",
      products: "muedsp-masterchain",
      status: "completed",
      scope: "live",
      limit: "50",
      page: "1",
    });
    expect(new Headers(firstInit?.headers).get("authorization")).toBe(
      `Basic ${Buffer.from("api-user:api-password").toString("base64")}`,
    );
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get("page")).toBe("2");
  });

  it("rejects an unsuccessful or malformed response", async () => {
    const unauthorized = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 401 }));
    await expect(fetchFastspringOrderIds({ days: 8, credentials, fetchImpl: unauthorized }))
      .rejects.toThrow("FastSpring Orders API returned 401");

    const malformed = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: "success", orders: ["ORDER-1", 42] }), { status: 200 }),
    );
    await expect(fetchFastspringOrderIds({ days: 8, credentials, fetchImpl: malformed }))
      .rejects.toThrow("invalid orders payload");
  });
});

describe("reconcileOrderIds", () => {
  const databaseOrders: DatabaseOrderState[] = [
    { orderId: "MATCHED", webhookEventId: "evt-1", webhookStatus: "processed", hasLicense: true },
    { orderId: "NO-WEBHOOK", webhookEventId: null, webhookStatus: null, hasLicense: true },
    { orderId: "NO-LICENSE", webhookEventId: "evt-3", webhookStatus: "processed", hasLicense: false },
    { orderId: "DB-ONLY", webhookEventId: "evt-4", webhookStatus: "processed", hasLicense: true },
  ];

  it("reports matched, incomplete database state, and reverse-only orders", () => {
    expect(reconcileOrderIds(
      ["MATCHED", "NO-WEBHOOK", "NO-LICENSE", "API-ONLY"],
      databaseOrders,
    )).toEqual({
      matched: ["MATCHED"],
      missingInDb: [
        { orderId: "API-ONLY", missingWebhook: true, missingLicense: true },
        { orderId: "NO-LICENSE", missingWebhook: false, missingLicense: true },
        { orderId: "NO-WEBHOOK", missingWebhook: true, missingLicense: false },
      ],
      presentInDbButNotInFastspring: ["DB-ONLY"],
    });
  });

  it("deduplicates order IDs returned on overlapping pages", () => {
    expect(reconcileOrderIds(["MATCHED", "MATCHED"], databaseOrders).matched).toEqual(["MATCHED"]);
  });
});

describe("runReconciliation", () => {
  it("uses injected network and database functions and returns a failing exit code for missing orders", async () => {
    const fetchOrders = vi.fn().mockResolvedValue(["MATCHED", "MISSING"]);
    const queryOrders = vi.fn().mockResolvedValue([
      { orderId: "MATCHED", webhookEventId: "evt-1", webhookStatus: "processed", hasLicense: true },
    ] satisfies DatabaseOrderState[]);

    const result = await runReconciliation({ days: 8, fetchOrders, queryOrders });

    expect(fetchOrders).toHaveBeenCalledWith(8);
    expect(queryOrders).toHaveBeenCalledWith(expect.objectContaining({ days: 8 }));
    expect(result.exitCode).toBe(1);
    expect(result.report.missingInDb).toEqual([
      { orderId: "MISSING", missingWebhook: true, missingLicense: true },
    ]);
  });

  it("returns zero when every FastSpring order has a webhook and an issued license", async () => {
    const result = await runReconciliation({
      days: 8,
      fetchOrders: async () => ["MATCHED"],
      queryOrders: async () => [
        { orderId: "MATCHED", webhookEventId: "evt-1", webhookStatus: "processed", hasLicense: true },
      ],
    });
    expect(result.exitCode).toBe(0);
  });
});
