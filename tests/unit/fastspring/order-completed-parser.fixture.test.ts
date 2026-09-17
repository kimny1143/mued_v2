import { describe, expect, it, vi } from "vitest";

import minimalAccountIdFixture from "../../fixtures/fastspring/minimal-account-id.json";
import popupOrderLiveFixture from "../../fixtures/fastspring/popup-order-live.json";

vi.mock("@/lib/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/db", () => ({ db: { transaction: vi.fn() } }));
vi.mock("@/db/schema", () => ({ masterchainPurchases: {} }));
vi.mock("@/lib/masterchain/audience", () => ({ addMasterchainContact: vi.fn() }));
vi.mock("@/lib/analytics/ga4-server", () => ({ trackServerPurchase: vi.fn() }));

import { parseFastspringOrderCompleted } from "@/lib/masterchain/fastspring-webhook";

describe("parseFastspringOrderCompleted — official FastSpring fixtures", () => {
  it("uses recipients[0].recipient.email as the canonical buyer email", () => {
    const parsed = parseFastspringOrderCompleted(popupOrderLiveFixture.events[0]);

    expect(popupOrderLiveFixture.events[0].data.customer.email).toBe("jane.doe@company.com");
    expect(parsed?.email).toBe("john.doe@company.com");
    expect(parsed?.name).toBe("John Doe");
  });

  it("parses the popup order while its data.tags object is present", () => {
    const event = popupOrderLiveFixture.events[0];
    const parsed = parseFastspringOrderCompleted(event);

    expect(event.data.tags).toEqual({ eula_version: "v1", campaign: "x" });
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      orderId: "aBCDE12fGH3iJkL4mNOpq",
      amountCents: 6000,
      currency: "USD",
      buyerCountry: "US",
    });
  });

  it("CURRENT behavior: absent data.tags yields undefined attribution and false marketing consent", () => {
    const parsed = parseFastspringOrderCompleted(minimalAccountIdFixture.events[0]);

    expect("tags" in minimalAccountIdFixture.events[0].data).toBe(false);
    expect(parsed).toMatchObject({
      orderId: "mINImal1OrdER2iD3ValuE",
      email: "minimal.recipient@company.com",
      name: "",
      marketingConsent: false,
    });
    expect(parsed?.gaClientId).toBeUndefined();
    expect(parsed?.utmCampaign).toBeUndefined();
  });

  it("rejects the fixture when the required canonical email is removed (positive control)", () => {
    const mutated = structuredClone(minimalAccountIdFixture) as {
      events: Array<{ data: { recipients: Array<{ recipient: { email?: string } }> } }>;
    };
    delete mutated.events[0].data.recipients[0].recipient.email;

    expect(parseFastspringOrderCompleted(mutated.events[0])).toBeNull();
  });
});
