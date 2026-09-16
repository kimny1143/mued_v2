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
    // ★実 shape（2026-09-16 実受信で確定）。★旧 fixture の `account: { contact: … }` は
    // ★**実在しない shape** だった（`data.account` は string）∴ ★残さない。
    recipients: [{ recipient: { email: "Buyer@Example.com" } }],
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

  it("★sends no GA4 purchase when amount or currency is missing (no 0 / no 'usd' default)", () => {
    // freee課 検出 2026-08-04（:70 の修正で amountCents が undefined になりうるようになった先）。
    // 埋めると数字が両方向に壊れる:
    //   amountCents 欠け → value 0 = 無料で売れたように見える（過小）
    //   currency 欠け    → value は購入者通貨のまま "USD" 申告 = JPY なら約150倍（過大）
    // ★GA4 の purchase value は CAC / ROAS の分母なので、どちらも広告判断を直接 動かす。
    const base = parseFastspringOrderCompleted(sampleEvent)!;

    const noAmount = buildMasterchainPurchaseEvent({ ...base, amountCents: undefined });
    expect(noAmount).toBeNull(); // ★value 0 で送らない

    const noCurrency = buildMasterchainPurchaseEvent({ ...base, currency: undefined });
    expect(noCurrency).toBeNull(); // ★"usd" を既定値にして送らない

    // 陽性対照: 揃っていれば送る（上2つの null が「常に null」でないこと）
    const ok = buildMasterchainPurchaseEvent(base);
    expect(ok).not.toBeNull();
    expect(ok!.value).toBe(69);
    expect(ok!.currency).toBe("USD");
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
      data: {
        ...sampleEvent.data,
        recipients: [{ recipient: { email: "a@b.com", first: "Ada", last: "Lovelace" } }],
      },
    });
    expect(named?.name).toBe("Ada Lovelace");
    // No name in the payload → empty string, never undefined (the license payload field is required).
    expect(parseFastspringOrderCompleted(sampleEvent)?.name).toBe("");
  });

  it("returns null when orderId is missing", () => {
    expect(
      parseFastspringOrderCompleted({ data: { recipients: [{ recipient: { email: "a@b.com" } }] } }),
    ).toBeNull();
  });

  it("returns null when email is missing", () => {
    expect(parseFastspringOrderCompleted({ data: { order: "O-1" } })).toBeNull();
  });

  it("marketingConsent defaults false when the tag is absent", () => {
    const p = parseFastspringOrderCompleted({
      id: "e2",
      data: { order: "O-2", recipients: [{ recipient: { email: "a@b.com" } }] },
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
      data: { order: "O-3", recipients: [{ recipient: { email: "a@b.com" } }], total: 69, currency: "usd" },
    })!;
    expect(p.gaClientId).toBeUndefined();
    expect(buildMasterchainPurchaseEvent(p)).toBeNull();
  });

  // ★2026-08-04 に期待値を反転させた。旧テストは "value falls back to 0 and currency to
  // USD when absent" として ★既定値で埋める挙動を「正しい」と固定していた。
  // ★テストが在ったから安心だった、ではなく、テストがバグを仕様として保存していた。
  // freee課（CFO）の指摘で、その既定値が数字を両方向に壊すと分かったので反転させる:
  //   value 0   → 無料で売れたように見える（過小）
  //   "USD" 既定 → value は購入者通貨のまま = JPY なら約150倍（過大）
  // ★GA4 の purchase value は CAC / ROAS の分母なので、広告判断を直接 動かす。
  it("★returns null (does NOT default) when value or currency is absent", () => {
    const ev = buildMasterchainPurchaseEvent({
      orderId: "O-4",
      email: "a@b.com",
      productId: "muedsp_masterchain",
      gaClientId: "c1",
    });
    expect(ev).toBeNull();
  });
});

describe("★buyer の在り処 — 2026-09-16 実受信で確定した shape", () => {
  // ★`data.account` は string ∴ `data.account.contact` は MISSING。★旧実装はここを読んでいたので
  // ★email は `data.customer.email` の fallback が救い、★name は ★常に空だった（silent-empty）。
  const base = { order: "O-9", total: 69, currency: "usd", address: { country: "JP" } };

  it("★recipients[0].recipient から email と name を取る（canonical）", () => {
    const p = parseFastspringOrderCompleted({
      id: "e", type: "order.completed",
      data: { ...base, recipients: [{ recipient: { email: "A@B.com", first: "Ada", last: "Lovelace" } }] },
    });
    expect(p?.email).toBe("a@b.com");
    expect(p?.name).toBe("Ada Lovelace");
  });

  it("★recipients が無ければ customer を使う（二番手・実在を確認済）", () => {
    const p = parseFastspringOrderCompleted({
      id: "e", type: "order.completed",
      data: { ...base, customer: { email: "c@d.com", first: "Grace", last: "Hopper" } },
    });
    expect(p?.email).toBe("c@d.com");
    expect(p?.name).toBe("Grace Hopper");
  });

  it("★旧 account.contact は ★もう読まない（★実在しない shape を fallback として残さない）", () => {
    const p = parseFastspringOrderCompleted({
      id: "e", type: "order.completed",
      data: { ...base, account: { contact: { email: "old@x.com", first: "Old", last: "Path" } } },
    });
    expect(p).toBeNull(); // ★email が取れない ＝ 旧 path は効いていない
  });

  it("★account が string でも落ちない（★実受信はこの形）", () => {
    const p = parseFastspringOrderCompleted({
      id: "e", type: "order.completed",
      data: { ...base, account: "acct_123", recipients: [{ recipient: { email: "e@f.com" } }] },
    });
    expect(p?.email).toBe("e@f.com");
  });

  it("★name は取れなければ空文字のまま（★落とさない）", () => {
    const p = parseFastspringOrderCompleted({
      id: "e", type: "order.completed",
      data: { ...base, recipients: [{ recipient: { email: "g@h.com" } }] },
    });
    expect(p?.email).toBe("g@h.com");
    expect(p?.name).toBe("");
  });
});
