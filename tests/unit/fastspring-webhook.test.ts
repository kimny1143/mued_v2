/**
 * Unit — parseFastspringOrderCompleted + buildMasterchainPurchaseEvent (lib/masterchain/fastspring-webhook.ts).
 *
 * Locks the C+ attribution mapping: extract orderId/email/license/amount/country + the popup custom
 * tags (gaClientId + utm*) from a FastSpring order.completed payload, and build the GA4 purchase
 * (reusing #664's shape) with the skip-when-no-client-id guard. Payload SHAPE is placeholder until C1;
 * these tests pin the current parse so a C1 shape change is a deliberate, visible edit.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/db", () => ({ db: { transaction: vi.fn() } }));
vi.mock("@/db/schema", () => ({ masterchainPurchases: {} }));
vi.mock("@/lib/masterchain/audience", () => ({ addMasterchainContact: vi.fn() }));
vi.mock("@/lib/analytics/ga4-server", () => ({ trackServerPurchase: vi.fn() }));

import {
  parseFastspringOrderCompleted,
  buildMasterchainPurchaseEvent,
} from "@/lib/masterchain/fastspring-webhook";

const sampleEvent = {
  id: "evt_1",
  type: "order.completed",
  data: {
    order: "ORDER-123",
    account: { contact: { email: "Buyer@Example.com" } },
    total: 69,
    currency: "USD",
    address: { country: "US" },
    // ★A FastSpring-generated key may still sit here; we deliberately do NOT read it (see below).
    items: [{ fulfillments: { license: [{ license: "LICENSE-KEY-XYZ" }] } }],
    tags: { gaClientId: "GA1.1.1.2", utmSource: "threads", utmCampaign: "launch_jul", marketingConsent: "true" },
  },
};

describe("parseFastspringOrderCompleted", () => {
  it("extracts order / buyer / name / amount / country / tags", () => {
    const p = parseFastspringOrderCompleted(sampleEvent);
    expect(p).toMatchObject({
      orderId: "ORDER-123",
      email: "buyer@example.com", // lowercased
      productId: "muedsp_masterchain",
      amountCents: 6900, // 69 * 100
      currency: "USD",
      buyerCountry: "US",
      gaClientId: "GA1.1.1.2",
      utmSource: "threads",
      utmCampaign: "launch_jul",
      marketingConsent: true,
    });
  });

  it("★does NOT fall back to the payout-currency total (currency/amount would disagree)", () => {
    // freee課 検出 2026-08-04: `data.total` は購入者通貨、`totalInPayoutCurrencyValue` は
    // 支払通貨 (USD)。`currency` は常に購入者通貨を入れるので、fallback が発火した行は
    // 「通貨欄 JPY・金額欄 USD」になり、$69 と ¥12,856 で桁が約150倍ずれる。
    // ★金額は、欠けているより間違っている方が高くつく。欠けたら undefined のままにし、
    // FastSpring の Line Item Detail Export から後で補う。
    const jpyBuyerMissingTotal = {
      ...sampleEvent,
      data: {
        ...sampleEvent.data,
        total: undefined,
        totalInPayoutCurrencyValue: 69, // USD
        currency: "JPY",
      },
    };
    const p = parseFastspringOrderCompleted(jpyBuyerMissingTotal);
    expect(p).not.toBeNull();
    // ★USD の 69 を JPY 建ての 6900 として記録しない
    expect(p!.amountCents).toBeUndefined();
    expect(p!.currency).toBe("JPY");
  });

  it("★does NOT read a FastSpring-generated license key out of the payload", () => {
    // The issuer changed (2026-07-25): we mint the keyfile with Ed25519 ourselves, because FastSpring
    // cannot sign with our private key and the plugin verifies offline against our baked-in public
    // key. Reading a key back from the payload would silently reintroduce a serial the plugin rejects.
    const p = parseFastspringOrderCompleted(sampleEvent) as Record<string, unknown>;
    expect(p.licenseKey).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain("LICENSE-KEY-XYZ");
  });

  it("derives the buyer name for the license payload, and tolerates its absence", () => {
    const named = parseFastspringOrderCompleted({
      ...sampleEvent,
      data: { ...sampleEvent.data, account: { contact: { email: "a@b.com", first: "Ada", last: "Lovelace" } } },
    });
    expect(named?.name).toBe("Ada Lovelace");
    // No name in the payload → empty string, never undefined (the license payload field is required).
    expect(parseFastspringOrderCompleted(sampleEvent)?.name).toBe("");
  });

  it("returns null when orderId is missing", () => {
    expect(parseFastspringOrderCompleted({ data: { account: { contact: { email: "a@b.com" } } } })).toBeNull();
  });

  it("returns null when email is missing", () => {
    expect(parseFastspringOrderCompleted({ data: { order: "O-1" } })).toBeNull();
  });

  it("marketingConsent defaults false when the tag is absent", () => {
    const p = parseFastspringOrderCompleted({
      id: "e2",
      data: { order: "O-2", account: { contact: { email: "a@b.com" } } },
    });
    expect(p?.marketingConsent).toBe(false);
  });
});

describe("buildMasterchainPurchaseEvent", () => {
  it("builds the GA4 purchase (order id = transaction id, value = amount/100, UTM ride-along)", () => {
    const p = parseFastspringOrderCompleted(sampleEvent)!;
    const ev = buildMasterchainPurchaseEvent(p);
    expect(ev).toEqual({
      clientId: "GA1.1.1.2",
      transactionId: "ORDER-123",
      value: 69,
      currency: "USD",
      itemName: "MUEDsp masterchain",
      itemId: "muedsp_masterchain",
      utm: { source: "threads", medium: undefined, campaign: "launch_jul", content: undefined, term: undefined },
    });
  });

  it("returns null when there is no GA client_id (GA4 MP requires one)", () => {
    const p = parseFastspringOrderCompleted({
      id: "e3",
      data: { order: "O-3", account: { contact: { email: "a@b.com" } }, total: 69, currency: "usd" },
    })!;
    expect(p.gaClientId).toBeUndefined();
    expect(buildMasterchainPurchaseEvent(p)).toBeNull();
  });

  it("value falls back to 0 and currency to USD when absent", () => {
    const ev = buildMasterchainPurchaseEvent({
      orderId: "O-4",
      email: "a@b.com",
      productId: "muedsp_masterchain",
      gaClientId: "c1",
    });
    expect(ev?.value).toBe(0);
    expect(ev?.currency).toBe("USD");
    expect(ev?.utm).toBeUndefined();
  });
});
