import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ select: vi.fn(), from: vi.fn(), where: vi.fn(), limit: vi.fn() }));
vi.mock("drizzle-orm", () => ({
  inArray: (column: unknown, values: string[]) => ({ inArray: [column, values] }),
  eq: (column: unknown, value: string) => ({ eq: [column, value] }),
  and: (...conditions: unknown[]) => ({ and: conditions }),
  isNull: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: m.select } }));
vi.mock("@/db/schema", () => ({
  pluginEntitlements: {}, masterchainPurchases: {},
  masterchainTrials: { email: "email", clerkUserId: "clerkUserId", licenseKey: "licenseKey", expiresAt: "expiresAt" },
}));

import { getTrialItemForUser } from "@/lib/plugins/portal-data";

const verified = (emailAddress: string) => ({ emailAddress, verification: { status: "verified" } });
beforeEach(() => {
  m.select.mockReturnValue({ from: m.from });
  m.from.mockReturnValue({ where: m.where });
  m.where.mockReturnValue({ limit: m.limit });
  m.limit.mockResolvedValue([]);
});

describe("trial ownership", () => {
  it.each([null, undefined, {}, { id: "user" }, {
    id: "user", emailAddresses: [{ emailAddress: "victim@example.com", verification: { status: "unverified" } }],
  }, { emailAddresses: [verified("me@example.com")] }])("fails closed without verified email and user ID: %j", async (user) => {
    expect(await getTrialItemForUser(user)).toBeNull();
    expect(m.select).not.toHaveBeenCalled();
  });

  it("requires verified emails AND the same Clerk ID in the query", async () => {
    const row = { licenseKey: "signed key\n", expiresAt: new Date("2026-10-01Z") };
    m.limit.mockResolvedValue([row]);
    expect(await getTrialItemForUser({ id: "user_123", emailAddresses: [
      verified(" ME@example.com "), verified("other@Example.com"),
      { emailAddress: "victim@example.com", verification: { status: "unverified" } },
    ] })).toEqual(row);
    expect(m.where).toHaveBeenCalledWith({ and: [
      { inArray: ["email", ["me@example.com", "other@example.com"]] },
      { eq: ["clerkUserId", "user_123"] },
    ] });
    expect(m.select).toHaveBeenCalledWith({ licenseKey: "licenseKey", expiresAt: "expiresAt" });
    expect(m.limit).toHaveBeenCalledWith(1);
  });

  it("returns null when no owned row matches", async () => {
    expect(await getTrialItemForUser({ id: "user", emailAddresses: [verified("me@example.com")] })).toBeNull();
  });
});
