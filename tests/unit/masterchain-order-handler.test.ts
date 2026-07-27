/**
 * Unit — handleFastspringOrderCompleted (lib/masterchain/fastspring-webhook.ts).
 *
 * These cover the behaviours that only exist at the handler level, where a bug costs money or trust:
 *
 *  - ★ONE key per order. FastSpring retries webhooks. `issueLicense()` embeds `issuedAt`, so signing
 *    the same order twice produces two DIFFERENT (both valid) keys — a retry would mail the buyer a
 *    second key and leave the ledger disagreeing with what they hold. The guard is a read-back of the
 *    stored keyfile, and that is what these tests pin.
 *  - ★fail-CLOSED on both halves. No signing key ⇒ throw (rolls the tx back ⇒ non-2xx ⇒ FastSpring
 *    retries) rather than recording a sale with no license. Delivery email fails ⇒ same, because the
 *    email IS the deliverable: silently "succeeding" leaves a paying buyer with nothing.
 *
 * The transaction is a stub rather than a real DB: this asserts the decision logic, not Drizzle.
 * ★A live end-to-end run was deliberately NOT done here — this repo's DATABASE_URL points at
 * production, and exercising the route would write real purchase rows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";

// vi.hoisted: vi.mock factories are hoisted above ordinary consts, so the spies they close over must
// be created in a hoisted block too — otherwise the factory runs first and hits a TDZ error.
const { sendMasterchainLicenseDelivery, trackServerPurchase, addMasterchainContact } = vi.hoisted(
  () => ({
    sendMasterchainLicenseDelivery: vi.fn(),
    trackServerPurchase: vi.fn(() => Promise.resolve()),
    addMasterchainContact: vi.fn(() => Promise.resolve(true)),
  }),
);

vi.mock("@/lib/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/db", () => ({ db: { transaction: vi.fn() } }));
vi.mock("@/db/schema", () => ({ masterchainPurchases: { orderId: "order_id", licenseKey: "license_key" } }));
vi.mock("@/lib/masterchain/audience", () => ({ addMasterchainContact }));
vi.mock("@/lib/analytics/ga4-server", () => ({ trackServerPurchase }));
vi.mock("@/lib/services/email.service", () => ({
  emailService: { sendMasterchainLicenseDelivery },
}));

import { handleFastspringOrderCompleted } from "@/lib/masterchain/fastspring-webhook";
import { verifyLicense } from "@/lib/masterchain/license";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRIV_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const event = {
  id: "evt_1",
  type: "order.completed",
  data: {
    order: "ORDER-777",
    account: { contact: { email: "Buyer@Example.com", first: "Ada", last: "Lovelace" } },
    total: 69,
    currency: "USD",
    address: { country: "US" },
    tags: {},
  },
};

/** Minimal tx stub: `select…limit` returns `existingRows`, `insert…onConflictDoNothing` records. */
function makeTx(existingRows: Array<{ licenseKey: string | null }>) {
  const inserted: Record<string, unknown>[] = [];
  const tx = {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(existingRows) }) }),
    }),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        inserted.push(v);
        return { onConflictDoNothing: () => Promise.resolve() };
      },
    }),
  };
  return { tx, inserted };
}

const originalEnv = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
beforeEach(() => {
  vi.clearAllMocks();
  sendMasterchainLicenseDelivery.mockResolvedValue({ success: true, messageId: "m1" });
  process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV_PEM;
});
afterEach(() => {
  if (originalEnv === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = originalEnv;
});

describe("handleFastspringOrderCompleted — issuance", () => {
  it("issues a verifiable license, records it, and emails it once", async () => {
    const { tx, inserted } = makeTx([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleFastspringOrderCompleted(tx as any, event);

    expect(inserted).toHaveLength(1);
    const row = inserted[0];
    expect(row.orderId).toBe("ORDER-777");
    expect(row.email).toBe("buyer@example.com");

    // ★The stored value must be a license OUR public key verifies — not an opaque string — and it
    // must be format v2 (the shape dsp's verifier reads), not something this side invented.
    const payload = verifyLicense(row.licenseKey as string, PUB_PEM);
    expect(payload).not.toBeNull();
    expect(payload!.owner).toBe("buyer@example.com");
    expect(payload!.order).toBe("ORDER-777");
    expect(payload!.scope).toBe("masterchain"); // without this, any valid key unlocks any product
    expect(row.licenseKey as string).toContain("MUEDSP-LICENSE-v2");

    expect(sendMasterchainLicenseDelivery).toHaveBeenCalledTimes(1);
    const [to, data] = sendMasterchainLicenseDelivery.mock.calls[0];
    expect(to).toEqual({ email: "buyer@example.com" });
    expect(data.licenseKey).toBe(row.licenseKey);
  });

  it("★on a FastSpring retry, reuses the stored key and does NOT email again", async () => {
    const alreadyIssued = "-----BEGIN MUEDSP LICENSE-----\nalready.issued\n-----END MUEDSP LICENSE-----";
    const { tx, inserted } = makeTx([{ licenseKey: alreadyIssued }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleFastspringOrderCompleted(tx as any, event);

    // The insert still runs (onConflictDoNothing makes it a no-op) but must carry the SAME key —
    // never a freshly signed one, which would disagree with what the buyer already holds.
    expect(inserted[0].licenseKey).toBe(alreadyIssued);
    expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
  });
});

describe("handleFastspringOrderCompleted — fail-closed", () => {
  it("★throws when no signing key is configured (never records a sale with no license)", async () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    const { tx, inserted } = makeTx([]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleFastspringOrderCompleted(tx as any, event),
    ).rejects.toThrow(/cannot issue license/);

    expect(inserted).toHaveLength(0);
    expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
  });

  it("★throws when delivery fails — the email IS the deliverable", async () => {
    sendMasterchainLicenseDelivery.mockResolvedValue({ success: false, error: "resend down" });
    const { tx } = makeTx([]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleFastspringOrderCompleted(tx as any, event),
    ).rejects.toThrow(/license delivery email failed/);
  });

  it("throws when the email service itself rejects, rather than swallowing it", async () => {
    sendMasterchainLicenseDelivery.mockRejectedValue(new Error("boom"));
    const { tx } = makeTx([]);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleFastspringOrderCompleted(tx as any, event),
    ).rejects.toThrow(/license delivery email failed/);
  });

  it("does not leak key material in the thrown message", async () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    const { tx } = makeTx([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await handleFastspringOrderCompleted(tx as any, event).catch((e: Error) => e);
    expect((err as Error).message).not.toContain("PRIVATE KEY");
    expect((err as Error).message).not.toContain("BEGIN");
  });
});
