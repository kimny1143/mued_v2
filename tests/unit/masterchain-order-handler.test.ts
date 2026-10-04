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
 *    buyer must receive instructions for accessing the license in the portal.
 *
 * The transaction is a stub rather than a real DB: this asserts the decision logic, not Drizzle.
 * ★A live end-to-end run was deliberately NOT done here — this repo's DATABASE_URL points at
 * production, and exercising the route would write real purchase rows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";

// vi.hoisted: vi.mock factories are hoisted above ordinary consts, so the spies they close over must
// be created in a hoisted block too — otherwise the factory runs first and hits a TDZ error.
const { sendMuedvoxLicenseDelivery, sendMasterchainLicenseDelivery, trackServerPurchase, addMasterchainContact, sendAdminAlert } = vi.hoisted(
  () => ({
    sendMasterchainLicenseDelivery: vi.fn(),
    sendMuedvoxLicenseDelivery: vi.fn(),
    sendAdminAlert: vi.fn(() => Promise.resolve({ success: true })),
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
  emailService: { sendMuedvoxLicenseDelivery, sendMasterchainLicenseDelivery, sendAdminAlert, isConfigured: () => true },
}));

import { handleFastspringOrderCompleted, licenseEmailLocale } from "@/lib/masterchain/fastspring-webhook";
import * as paidProducts from "@/lib/plugins/paid-products";
import { verifyLicense } from "@/lib/masterchain/license";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRIV_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const event = {
  id: "evt_1",
  type: "order.completed",
  data: {
    order: "ORDER-777",
    // ★実 shape（2026-09-16 実受信で確定）。★旧 `account: { contact: … }` は
    // ★**実在しない shape**（`data.account` は string）∴ ★fixture を実物に合わせる。
    recipients: [{ recipient: { email: "Buyer@Example.com", first: "Ada", last: "Lovelace" } }],
    // ★The real shape (measured on every live order, 2026-10-04): one item, the FastSpring product path.
    items: [{ product: "muedsp-masterchain", quantity: 1 }],
    total: 69,
    changed: Date.parse("2026-09-17T01:02:03.000Z"),
    currency: "USD",
    address: { country: "US" },
    tags: { eula_version: "2026-09-17-v1" },
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
  sendMuedvoxLicenseDelivery.mockResolvedValue({ success: true });
  sendMasterchainLicenseDelivery.mockResolvedValue({ success: true, messageId: "m1" });
  process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV_PEM;
});
afterEach(() => {
  if (originalEnv === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = originalEnv;
});

describe("handleFastspringOrderCompleted — issuance", () => {
  it("issues a verifiable license, records it, and emails portal instructions once", async () => {
    const { tx, inserted } = makeTx([]);
    await handleFastspringOrderCompleted(tx as any, event);

    expect(inserted).toHaveLength(1);
    const row = inserted[0];
    expect(row.orderId).toBe("ORDER-777");
    expect(row.email).toBe("buyer@example.com");
    expect(row.eulaVersion).toBe("2026-09-17-v1");
    expect(row.eulaAcceptedAt).toEqual(new Date("2026-09-17T01:02:03.000Z"));

    // ★The stored value must be a license OUR public key verifies — not an opaque string — and it
    // must be format v2 (the shape dsp's verifier reads), not something this side invented.
    const payload = verifyLicense(row.licenseKey as string, PUB_PEM);
    expect(payload).not.toBeNull();
    expect(payload!.owner).toBe("buyer@example.com");
    expect(payload!.order).toBe("ORDER-777");
    expect(payload!.scope).toBe("masterchain"); // without this, any valid key unlocks any product
    expect(row.licenseKey as string).toContain("MUEDSP-LICENSE-v2");

    expect(sendMasterchainLicenseDelivery).toHaveBeenCalledTimes(1);
    expect(sendMuedvoxLicenseDelivery).not.toHaveBeenCalled();
    const [to, data] = sendMasterchainLicenseDelivery.mock.calls[0];
    expect(to).toEqual({ email: "buyer@example.com" });
    expect(data).toEqual({ locale: "en" });
    expect(data).not.toHaveProperty("licenseKey");
  });

  it("★the email is in the order's language — data.language \"ja\" gets Japanese (kimny 10/1 「言語に合わせる」)", async () => {
    // The live order of 2026-10-01 (ja page, JP) carried language "ja" and was sent the English email.
    const ja = { ...event, data: { ...event.data, order: "ORDER-JA", language: "ja", address: { country: "JP" } } };
    await handleFastspringOrderCompleted(makeTx([]).tx as any, ja);
    expect(sendMasterchainLicenseDelivery.mock.calls[0][1]).toEqual({ locale: "ja" });
  });

  it("no language → English, and a JP country alone does not make it Japanese (the country is not a reading language)", async () => {
    const jp = { ...event, data: { ...event.data, order: "ORDER-JP", address: { country: "JP" } } };
    await handleFastspringOrderCompleted(makeTx([]).tx as any, jp);
    expect(sendMasterchainLicenseDelivery.mock.calls[0][1]).toEqual({ locale: "en" });
  });

  it("★on a FastSpring retry, reuses the stored key and does NOT email again", async () => {
    const alreadyIssued = "-----BEGIN MUEDSP LICENSE-----\nalready.issued\n-----END MUEDSP LICENSE-----";
    const { tx, inserted } = makeTx([{ licenseKey: alreadyIssued }]);
    await handleFastspringOrderCompleted(tx as any, event);

    // The insert still runs (onConflictDoNothing makes it a no-op) but must carry the SAME key —
    // never a freshly signed one, which would disagree with what the buyer already holds.
    expect(inserted[0].licenseKey).toBe(alreadyIssued);
    expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
    expect(sendMuedvoxLicenseDelivery).not.toHaveBeenCalled();
  });

  it("★leaves EULA columns unset when the checkout tag is absent", async () => {
    const { tx, inserted } = makeTx([]);
    const withoutEula = { ...event, data: { ...event.data, tags: {} } };
    await handleFastspringOrderCompleted(tx as any, withoutEula);

    expect(inserted[0].eulaVersion).toBeUndefined();
    expect(inserted[0].eulaAcceptedAt).toBeUndefined();
  });
});

describe("handleFastspringOrderCompleted — fail-closed", () => {
  it("★throws when no signing key is configured (never records a sale with no license)", async () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    const { tx, inserted } = makeTx([]);
    await expect(
      handleFastspringOrderCompleted(tx as any, event),
    ).rejects.toThrow(/cannot issue license/);

    expect(inserted).toHaveLength(0);
    expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
    expect(sendMuedvoxLicenseDelivery).not.toHaveBeenCalled();
  });

  it("★throws when delivery fails — portal instructions remain fail-closed", async () => {
    sendMasterchainLicenseDelivery.mockResolvedValue({ success: false, error: "resend down" });
    const { tx } = makeTx([]);
    await expect(
      handleFastspringOrderCompleted(tx as any, event),
    ).rejects.toThrow(/license delivery email failed/);
  });

  it("throws when the email service itself rejects, rather than swallowing it", async () => {
    sendMasterchainLicenseDelivery.mockRejectedValue(new Error("boom"));
    const { tx } = makeTx([]);
    await expect(
      handleFastspringOrderCompleted(tx as any, event),
    ).rejects.toThrow(/license delivery email failed/);
  });

  it("★parse できない order.completed は throw せず unparseable を返す（★tx の中で throw すると行が消える）", async () => {
    // ★2026-09-16（CCO レビュー #1038 で見つかった class の2件目）。
    // ★以前は `logger.error` して ★`return` していた。★route は続けて `status: "processed"` を書き、
    // ★冒頭の冪等 guard が再配達を弾く ∴ ★課金済なのに ★ライセンス無し・retry 無し・行は緑。
    // ★`type` が読めない時に route が 500 を返すのと ★同じ扱いに揃える。
    const { tx, inserted } = makeTx([]);
    // ★#1039 では throw していた。★CCO レビューで「tx の中の throw は payload を持つ行まで
    // rollback する」と指摘され、★route 側で `failed` に確定してから tx の外で throw する形へ変えた。
    // ∴ ★handler は ★判別可能な戻り値を返すだけ。
    const r = await handleFastspringOrderCompleted(tx as never, {
      id: "e1", type: "order.completed", live: true, data: {},
    });
    expect(r).toBe("unparseable");
    expect(inserted).toHaveLength(0); // ★売上行を作らない
    expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
    expect(sendMuedvoxLicenseDelivery).not.toHaveBeenCalled(); // ★メールも出さない
  });

  it("does not leak key material in the thrown message", async () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    const { tx } = makeTx([]);
    const err = await handleFastspringOrderCompleted(tx as any, event).catch((e: Error) => e);
    expect((err as Error).message).not.toContain("PRIVATE KEY");
    expect((err as Error).message).not.toContain("BEGIN");
  });
});

describe("licenseEmailLocale", () => {
  it("ja / ja-JP / JA → ja; en, de, empty, undefined → en; 'jam' is not ja", () => {
    for (const v of ["ja", "ja-JP", "ja_JP", "JA", " ja "]) expect(licenseEmailLocale(v), v).toBe("ja");
    for (const v of ["en", "de", "", undefined, "jam"]) expect(licenseEmailLocale(v), String(v)).toBe("en");
  });
});

/**
 * ★C9 (docs/paid-line/c9-multi-product-paid-line-design.md · kimny 2026-10-04「鍵を出さず通知」).
 * Before C9 every order was stamped masterchain. An order we cannot map to exactly ONE product we sell
 * must get NOTHING — no key (unrevocable), no purchase row, no email — and the operator is alerted.
 */
describe("handleFastspringOrderCompleted — only products we sell (C9)", () => {
  const withItems = (items: unknown) => ({ ...event, data: { ...event.data, items } });
  const refused: Array<[string, unknown]> = [
    ["FastSpring's sample product (seen in webhook_events as a test notification)", [{ product: "example-product", quantity: 1 }]],
    ["a product path not in PAID_PRODUCTS (e.g. MUEDvox before it is added)", [{ product: "muedsp-muedvox", quantity: 1 }]],
    ["disabled MUEDvox", [{ product: "muedsp-vox", quantity: 1 }]],
    ["no items at all", []],
    ["an item with no product", [{ quantity: 1 }]],
    ["two items", [{ product: "muedsp-masterchain", quantity: 1 }, { product: "muedsp-masterchain", quantity: 1 }]],
    ["quantity 2", [{ product: "muedsp-masterchain", quantity: 2 }]],
  ];

  it.each(refused)("%s → unknown_product: no key, no row, no email, operator alerted", async (_label, items) => {
    process.env.OPERATOR_ALERT_EMAIL = "ops@example.com";
    const { tx, inserted } = makeTx([]);
    const result = await handleFastspringOrderCompleted(tx as any, withItems(items));
    expect(result).toBe("unknown_product");
    expect(inserted).toHaveLength(0);
    expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
    expect(sendMuedvoxLicenseDelivery).not.toHaveBeenCalled();
    expect(trackServerPurchase).not.toHaveBeenCalled();
    expect(addMasterchainContact).not.toHaveBeenCalled();
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
    expect(String((sendAdminAlert.mock.calls[0] as unknown[])[1])).toContain("ORDER-777");
    delete process.env.OPERATOR_ALERT_EMAIL;
  });

  it("the masterchain order (the measured live shape) is fulfilled exactly as before — scope, product_id, GA4 item", async () => {
    const { tx, inserted } = makeTx([]);
    const result = await handleFastspringOrderCompleted(tx as any, withItems([{ product: "muedsp-masterchain", quantity: 1 }]));
    expect(result).toBe("ok");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].productId).toBe("muedsp_masterchain");
    expect(verifyLicense(inserted[0].licenseKey as string, PUB_PEM)!.scope).toBe("masterchain");
    expect(sendMasterchainLicenseDelivery).toHaveBeenCalledTimes(1);
    expect(sendMuedvoxLicenseDelivery).not.toHaveBeenCalled();
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });
});

it("enabled MUEDvox issues only its scoped key and product delivery", async () => {
  vi.spyOn(paidProducts, "paidProductByFastspringPath").mockImplementation((path) =>
    path === "muedsp-vox" ? { ...paidProducts.PAID_PRODUCTS.muedvox, enabled: true } : null);
  const { tx, inserted } = makeTx([]);
  expect(await handleFastspringOrderCompleted(tx as never, {
    ...event, data: { ...event.data, items: [{ product: "muedsp-vox", quantity: 1 }] },
  })).toBe("ok");
  expect(inserted).toHaveLength(1);
  expect(inserted[0].productId).toBe("muedsp_vox");
  expect(verifyLicense(inserted[0].licenseKey as string, PUB_PEM)).toMatchObject({ scope: "muedvox", product: "MUEDsp" });
  expect(sendMuedvoxLicenseDelivery).toHaveBeenCalledExactlyOnceWith({ email: "buyer@example.com" }, { locale: "en" });
  expect(sendMasterchainLicenseDelivery).not.toHaveBeenCalled();
});
