/**
 * Unit — markPortalRegistered (lib/plugins/portal-data.ts), North Star §③ registration signal.
 *
 * The write reuses the SAME authorization boundary as getPortalItemsForUser: it may only touch rows
 * scoped to the caller's VERIFIED emails, writes only rows still NULL (idempotent), and is FAIL-OPEN
 * (a DB error must never break the portal render). These are asserted against a mocked db.update chain.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let capturedEmails: string[] | null = null;
let isNullCol: unknown = null;
vi.mock("drizzle-orm", () => ({
  and: (...conds: unknown[]) => ({ __and: conds }),
  inArray: (_col: unknown, vals: string[]) => {
    capturedEmails = vals;
    return { __inArray: vals };
  },
  isNull: (col: unknown) => {
    isNullCol = col;
    return { __isNull: col };
  },
}));

const mockWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
vi.mock("@/db", () => ({ db: { update: (...a: unknown[]) => mockUpdate(...a) } }));

vi.mock("@/db/schema", () => ({
  pluginEntitlements: { email: "email_col", portalRegisteredAt: "pra_col" },
}));

vi.mock("@/lib/plugins/registry", () => ({ PLUGIN_DIST: {} }));

import { markPortalRegistered } from "@/lib/plugins/portal-data";

const verified = (email: string) => ({ emailAddress: email, verification: { status: "verified" } });
const unverified = (email: string) => ({ emailAddress: email, verification: { status: "unverified" } });

beforeEach(() => {
  vi.clearAllMocks();
  capturedEmails = null;
  isNullCol = null;
  mockWhere.mockResolvedValue(undefined);
});

describe("markPortalRegistered — scoped, idempotent, fail-open", () => {
  it("updates ONLY the caller's verified emails (lower-cased), with the IS NULL guard", async () => {
    await markPortalRegistered({ emailAddresses: [verified("Me@Studio.JP"), verified("b@x.co")] });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(capturedEmails).toEqual(["me@studio.jp", "b@x.co"]); // scoping = verified emails only
    expect(isNullCol).toBe("pra_col");                          // idempotent: first view wins
    const setArg = mockSet.mock.calls[0][0] as { portalRegisteredAt: Date };
    expect(setArg.portalRegisteredAt).toBeInstanceOf(Date);     // writes only the timestamp
    expect(setArg).not.toHaveProperty("email");                 // never rewrites the ownership key
  });

  it("an UNVERIFIED address never reaches the write (cross-user takeover blocked)", async () => {
    await markPortalRegistered({
      emailAddresses: [verified("me@studio.jp"), unverified("victim@someoneelse.com")],
    });
    expect(capturedEmails).toEqual(["me@studio.jp"]);
    expect(capturedEmails).not.toContain("victim@someoneelse.com");
  });

  it("FAIL-CLOSED: no verified email → NO write is run", async () => {
    await markPortalRegistered({ emailAddresses: [unverified("x@y.co")] });
    expect(mockUpdate).not.toHaveBeenCalled();
    await markPortalRegistered(null);
    await markPortalRegistered({});
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("FAIL-OPEN: a DB error is swallowed (never breaks the portal render)", async () => {
    mockWhere.mockRejectedValue(new Error("db down"));
    await expect(
      markPortalRegistered({ emailAddresses: [verified("a@b.co")] }),
    ).resolves.toBeUndefined();
  });
});
