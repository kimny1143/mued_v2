/**
 * Unit — trackServerPurchase (lib/analytics/ga4-server.ts).
 *
 * Locks: (1) fail-open env guard — with no measurement id / api secret it returns without any
 * network call and never throws; (2) UTM params ride on the purchase event when provided;
 * (3) a rejected fetch is swallowed (analytics must never break the caller / fulfillment).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackServerPurchase } from "@/lib/analytics/ga4-server";

const base = {
  clientId: "GA1.1.1.2",
  transactionId: "pi_1",
  value: 7.49,
  currency: "USD",
  itemName: "MUEDial Omakase Mix",
  itemId: "dial_omakase",
};

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  // ★These two lines are why the 81-day outage was invisible: this file sets whatever name the
  // module reads, so the suite stayed green regardless of which name that was — including one
  // that existed nowhere in production. Setting the variable under test is what made the test
  // blind to it. Name correctness is checked separately in tests/unit/analytics-env-names.test.ts,
  // which reads the module source instead of running it.
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
  process.env.GA4_MP_API_SECRET = "secret";
});

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("trackServerPurchase — fail-open env guard", () => {
  it("skips the network call (no throw) when GA4_MP_API_SECRET is unset", async () => {
    delete process.env.GA4_MP_API_SECRET;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(trackServerPurchase(base)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset", async () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await trackServerPurchase(base);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("trackServerPurchase — payload", () => {
  it("posts a purchase event with the core params", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    await trackServerPurchase(base);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.client_id).toBe("GA1.1.1.2");
    const ev = body.events[0];
    expect(ev.name).toBe("purchase");
    expect(ev.params.transaction_id).toBe("pi_1");
    expect(ev.params.value).toBe(7.49);
    expect(ev.params.currency).toBe("USD");
    expect(ev.params.items[0]).toMatchObject({ item_id: "dial_omakase", item_name: "MUEDial Omakase Mix", quantity: 1 });
  });

  it("attaches only the UTM params that are present", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    await trackServerPurchase({
      ...base,
      utm: { source: "threads", medium: "social", campaign: "launch_jul" },
    });
    const params = JSON.parse(fetchSpy.mock.calls[0][1].body as string).events[0].params;
    expect(params.source).toBe("threads");
    expect(params.medium).toBe("social");
    expect(params.campaign).toBe("launch_jul");
    expect(params).not.toHaveProperty("content");
    expect(params).not.toHaveProperty("term");
  });

  it("omits UTM params entirely when utm is absent", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    await trackServerPurchase(base);
    const params = JSON.parse(fetchSpy.mock.calls[0][1].body as string).events[0].params;
    expect(params).not.toHaveProperty("source");
    expect(params).not.toHaveProperty("medium");
    expect(params).not.toHaveProperty("campaign");
  });
});

describe("trackServerPurchase — swallows failures", () => {
  it("does not throw when fetch rejects (analytics never breaks the caller)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(trackServerPurchase(base)).resolves.toBeUndefined();
  });
});
