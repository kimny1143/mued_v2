/**
 * Unit — buildDialPurchaseEvent (lib/dial/purchase-analytics.ts).
 *
 * Locks the attribution mapping for the MUEDial per-use (都度払い) GA4 purchase event:
 * client_id + UTM inherited from the session's first-touch, value from the REAL charge
 * (amount_total), item naming, and the skip-when-no-client-id guard.
 */
import { describe, it, expect } from "vitest";
import {
  buildDialPurchaseEvent,
  type DialFirstTouchAttribution,
} from "@/lib/dial/purchase-analytics";

const fullFirstTouch: DialFirstTouchAttribution = {
  gaClientId: "GA1.1.123.456",
  utmSource: "threads",
  utmMedium: "social",
  utmCampaign: "launch_jul",
  utmContent: "bio_link",
  utmTerm: "mix",
};

describe("buildDialPurchaseEvent — skip guard", () => {
  it("returns null when firstTouch is null", () => {
    expect(
      buildDialPurchaseEvent({
        firstTouch: null,
        amountTotalCents: 749,
        currency: "usd",
        transactionId: "pi_1",
        purchaseLabel: "omakase",
      }),
    ).toBeNull();
  });

  it("returns null when firstTouch is undefined", () => {
    expect(
      buildDialPurchaseEvent({
        firstTouch: undefined,
        amountTotalCents: 749,
        currency: "usd",
        transactionId: "pi_1",
        purchaseLabel: "omakase",
      }),
    ).toBeNull();
  });

  it("returns null when gaClientId is missing (GA4 MP requires a client_id)", () => {
    expect(
      buildDialPurchaseEvent({
        firstTouch: { utmSource: "threads" },
        amountTotalCents: 749,
        currency: "usd",
        transactionId: "pi_1",
        purchaseLabel: "omakase",
      }),
    ).toBeNull();
  });

  it("returns null when gaClientId is whitespace-only", () => {
    expect(
      buildDialPurchaseEvent({
        firstTouch: { gaClientId: "   " },
        amountTotalCents: 749,
        currency: "usd",
        transactionId: "pi_1",
        purchaseLabel: "omakase",
      }),
    ).toBeNull();
  });
});

describe("buildDialPurchaseEvent — mapping", () => {
  it("builds a full event with UTM, real charge value, and mapped item name", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: fullFirstTouch,
      amountTotalCents: 1399,
      currency: "usd",
      transactionId: "pi_abc",
      purchaseLabel: "dialogue",
    });
    expect(ev).toEqual({
      clientId: "GA1.1.123.456",
      transactionId: "pi_abc",
      value: 13.99,
      currency: "USD",
      itemName: "MUEDial Dialogue Mix",
      itemId: "dial_dialogue",
      utm: {
        source: "threads",
        medium: "social",
        campaign: "launch_jul",
        content: "bio_link",
        term: "mix",
      },
    });
  });

  it("value = amount_total/100 (real charged amount, discount-safe)", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: { gaClientId: "c1" },
      amountTotalCents: 599,
      currency: "usd",
      transactionId: "pi_m",
      purchaseLabel: "mastering",
    });
    expect(ev?.value).toBe(5.99);
    expect(ev?.itemName).toBe("MUEDial Mastering");
    expect(ev?.itemId).toBe("dial_mastering");
  });

  it("omits utm when no utm fields are present", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: { gaClientId: "c1" },
      amountTotalCents: 749,
      currency: "usd",
      transactionId: "pi_o",
      purchaseLabel: "omakase",
    });
    expect(ev?.utm).toBeUndefined();
  });

  it("additional_cycle label maps to its item name", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: { gaClientId: "c1" },
      amountTotalCents: 999,
      currency: "usd",
      transactionId: "pi_add",
      purchaseLabel: "additional_cycle",
    });
    expect(ev?.itemName).toBe("MUEDial Additional Retake Cycle");
    expect(ev?.itemId).toBe("dial_additional_cycle");
  });

  it("unknown label falls back to a generic prefixed name + dial_ id", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: { gaClientId: "c1" },
      amountTotalCents: 100,
      currency: "usd",
      transactionId: "pi_x",
      purchaseLabel: "mystery",
    });
    expect(ev?.itemName).toBe("MUEDial mystery");
    expect(ev?.itemId).toBe("dial_mystery");
  });

  it("null amount → value 0; null currency → USD; empty label → purchase", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: { gaClientId: "c1" },
      amountTotalCents: null,
      currency: null,
      transactionId: "pi_z",
      purchaseLabel: "",
    });
    expect(ev?.value).toBe(0);
    expect(ev?.currency).toBe("USD");
    expect(ev?.itemName).toBe("MUEDial purchase");
    expect(ev?.itemId).toBe("dial_purchase");
  });

  it("trims gaClientId", () => {
    const ev = buildDialPurchaseEvent({
      firstTouch: { gaClientId: "  c1  " },
      amountTotalCents: 749,
      currency: "usd",
      transactionId: "pi_t",
      purchaseLabel: "omakase",
    });
    expect(ev?.clientId).toBe("c1");
  });
});
