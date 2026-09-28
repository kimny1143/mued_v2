import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { EULA_VERSION } from "@/lib/legal/eula";

const m = vi.hoisted(() => ({
  live: true, user: vi.fn(), rate: vi.fn(), issue: vi.fn(), signer: vi.fn(), mail: vi.fn(), log: vi.fn(),
  select: vi.fn(), transaction: vi.fn(), purchaseWhere: vi.fn(), purchaseLimit: vi.fn(),
  trialWhere: vi.fn(), lock: vi.fn(), insert: vi.fn(), values: vi.fn(), returning: vi.fn(), committed: false,
}));
vi.mock("@/lib/masterchain/config", () => ({ get MASTERCHAIN_TRIAL_LIVE() { return m.live; }, MASTERCHAIN_TRIAL_DAYS: 15 }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.user }));
vi.mock("@/lib/middleware/rate-limit", () => ({ checkRateLimit: m.rate }));
vi.mock("@/lib/masterchain/license", () => ({ issueLicense: m.issue, licenseSigningPublicKeyHex: m.signer, LICENSE_VERSION: 2 }));
vi.mock("@/lib/services/email.service", () => ({ emailService: { sendMasterchainTrialDelivery: m.mail } }));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: m.log } }));
vi.mock("@/db", () => ({ db: { select: m.select, transaction: m.transaction } }));

import { handleMasterchainTrial } from "@/lib/masterchain/trial-handler";
import { POST } from "@/app/api/masterchain/trial/route";
import { NextRequest } from "next/server";

const address = (emailAddress: string, id = "primary", status = "verified") => ({ id, emailAddress, verification: { status } });
const user = (addresses = [address("buyer@gmail.com")]) => ({ id: "user_1", primaryEmailAddressId: "primary", emailAddresses: addresses });
const saved = (overrides = {}) => ({ id: "trial-1", email: "buyer@gmail.com", emailCanonical: "buyer@gmail.com", clerkUserId: "user_1", licenseKey: "stored-key", expiresAt: new Date("2026-10-13T12:00:00Z"), ...overrides });
const body = { eulaAccepted: true, eulaVersion: EULA_VERSION };
const request = (data: unknown = body) => new NextRequest("http://localhost/api/masterchain/trial", {
  method: "POST", body: JSON.stringify(data), headers: { "accept-language": "ja,en;q=0.8" },
});
const tx = { select: () => ({ from: () => ({ where: m.trialWhere }) }), insert: m.insert };
const sqlParams = (mock: typeof m.trialWhere) => new PgDialect().sqlToQuery(mock.mock.calls[0][0]).params;

beforeEach(() => {
  m.live = true;
  m.committed = false;
  m.user.mockResolvedValue(user());
  m.rate.mockResolvedValue(null);
  m.issue.mockReturnValue("new-key");
  m.signer.mockReturnValue("throwaway-public-key");
  m.mail.mockImplementation(async () => { expect(m.committed).toBe(true); return { success: true }; });
  m.select.mockReturnValue({ from: () => ({ where: m.purchaseWhere }) });
  m.purchaseWhere.mockReturnValue({ limit: m.purchaseLimit });
  m.purchaseLimit.mockResolvedValue([]);
  m.trialWhere.mockReturnValue({ for: m.lock });
  m.lock.mockResolvedValue([]);
  m.insert.mockReturnValue({ values: m.values });
  m.values.mockReturnValue({ returning: m.returning });
  m.returning.mockImplementation(async () => [saved(m.values.mock.calls.at(-1)![0])]);
  m.transaction.mockImplementation(async (fn) => { const result = await fn(tx); m.committed = true; return result; });
});

describe("masterchain trial handler", () => {
  it("is inert behind the code flag, including the POST route", async () => {
    m.live = false;
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_available" });
    expect(m.user).not.toHaveBeenCalled();
    expect(m.select).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    m.user.mockResolvedValue(null);
    expect((await handleMasterchainTrial(request())).status).toBe(401);
  });
  it("requires verified email", async () => {
    m.user.mockResolvedValue(user([address("buyer@gmail.com", "primary", "unverified")]));
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "no_verified_email" });
  });
  it.each([{}, { ...body, eulaAccepted: false }, { ...body, eulaVersion: "old" }, null])("requires current EULA consent: %j", async (data) => {
    const response = await handleMasterchainTrial(request(data));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "eula_required" });
    expect(m.rate).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const response = await handleMasterchainTrial(new Request("http://localhost", { method: "POST", body: "{" }));
    expect(await response.json()).toEqual({ error: "eula_required" });
  });
  it("validates marketingOptIn", async () => {
    expect((await handleMasterchainTrial(request({ ...body, marketingOptIn: "true" }))).status).toBe(400);
  });
  it.each([[], null, "x"])("★a malformed firstTouch degrades to nothing, never a 400: %j", async (firstTouch) => {
    const response = await handleMasterchainTrial(request({ ...body, firstTouch }));
    expect(response.status).toBe(200);
    expect(m.values.mock.calls[0][0].firstTouch).toBeUndefined();
  });
  it("★firstTouch keeps only allowlisted keys, each clipped (same shape as dialSessions)", async () => {
    await handleMasterchainTrial(request({ ...body, firstTouch: { utmSource: "s".repeat(1000), evil: "payload" } }));
    const stored = m.values.mock.calls[0][0].firstTouch;
    expect(stored.utmSource).toHaveLength(255);
    expect(stored).not.toHaveProperty("evil");
  });
  it("rate limits by Clerk identity", async () => {
    m.rate.mockResolvedValue({ success: false });
    expect((await handleMasterchainTrial(request())).status).toBe(429);
    expect(m.rate).toHaveBeenCalledWith("masterchain-trial", "user_1");
    expect(m.select).not.toHaveBeenCalled();
  });
  it("rejects disposable addresses", async () => {
    m.user.mockResolvedValue(user([address("buyer@a.mailinator.com")]));
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "disposable_email" });
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("checks purchases across all verified addresses only", async () => {
    m.user.mockResolvedValue(user([address("primary@gmail.com"), address("paid@outlook.com", "second"), address("unverified@icloud.com", "third", "unverified")]));
    m.purchaseLimit.mockResolvedValue([{ id: "purchase" }]);
    const response = await handleMasterchainTrial(request({ ...body, email: "attacker@example.com" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "already_purchased" });
    expect(sqlParams(m.purchaseWhere)).toEqual(["primary@gmail.com", "paid@outlook.com"]);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("returns the stored key and expiry without reissuing or emailing, even if expired", async () => {
    m.lock.mockResolvedValue([saved({ expiresAt: new Date("2020-01-01T00:00:00Z") })]);
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "existing", licenseKey: "stored-key", expiresAt: "2020-01-01T00:00:00Z" });
    expect(m.lock).toHaveBeenCalledWith("update");
    expect(m.issue).not.toHaveBeenCalled();
    expect(m.mail).not.toHaveBeenCalled();
  });
  it.each([
    { clerkUserId: "other_user" },
    { email: "removed@gmail.com" },
  ])("never discloses keys without current ownership: %j", async (override) => {
    m.lock.mockResolvedValue([saved(override)]);
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "trial_used" });
    expect(m.issue).not.toHaveBeenCalled();
  });
  it("★a mixed match (own row AND another user's row) is refused without issuing (CCO #1145)", async () => {
    m.lock.mockResolvedValue([saved(), saved({ id: "trial-2", clerkUserId: "other_user", emailCanonical: "x@gmail.com" })]);
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "trial_used" });
    expect(m.issue).not.toHaveBeenCalled();
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("issues once, stores consent, and sends once after commit", async () => {
    const response = await handleMasterchainTrial(request({ ...body, marketingOptIn: true, firstTouch: { utmSource: "test" }, email: "evil@example.com" }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.status).toBe("issued");
    expect(payload.licenseKey).toBe("new-key");
    expect(m.issue).toHaveBeenCalledTimes(1);
    const row = m.values.mock.calls[0][0];
    expect(m.issue).toHaveBeenCalledWith({ owner: "buyer@gmail.com", order: `trial:${row.id}`, expiresAt: payload.expiresAt });
    expect(row).toMatchObject({ clerkUserId: "user_1", email: "buyer@gmail.com", emailCanonical: "buyer@gmail.com", licenseVersion: 2, eulaVersion: EULA_VERSION, marketingOptIn: true, firstTouch: { utmSource: "test" } });
    expect(row.eulaAcceptedAt).toEqual(row.issuedAt);
    expect(row.expiresAt.getTime() - row.issuedAt.getTime()).toBeGreaterThan(15 * 86400000 - 1000);
    expect(sqlParams(m.trialWhere)).toEqual(["user_1", "buyer@gmail.com"]);
    expect(m.mail).toHaveBeenCalledExactlyOnceWith({ email: "buyer@gmail.com" }, { locale: "ja", licenseKey: "new-key", expiresAt: payload.expiresAt });
  });
  it.each([true, false])("chooses verified primary, else first verified (primary verified=%s)", async (verified) => {
    m.user.mockResolvedValue(user([address("fallback@outlook.com", "second"), address(" A.B+tag@GMAIL.COM ", "primary", verified ? "verified" : "unverified")]));
    await handleMasterchainTrial(request());
    expect(m.values.mock.calls[0][0]).toMatchObject({ email: verified ? "a.b+tag@gmail.com" : "fallback@outlook.com", emailCanonical: verified ? "ab@gmail.com" : "fallback@outlook.com", marketingOptIn: false });
  });
  it.each([false, true])("email failure does not undo issuance (throws=%s)", async (throws) => {
    if (throws) m.mail.mockRejectedValue(new Error("sensitive provider payload"));
    else m.mail.mockResolvedValue({ success: false, error: "sensitive provider payload" });
    expect((await handleMasterchainTrial(request())).status).toBe(200);
    expect(m.committed).toBe(true);
    expect(m.log).toHaveBeenCalled();
    expect(JSON.stringify(m.log.mock.calls)).not.toContain("sensitive provider payload");
  });
  it.each([false, true])("re-reads unique-conflict winner after rollback (other user=%s)", async (other) => {
    m.returning.mockRejectedValue({ cause: { code: "23505" } });
    m.lock.mockResolvedValueOnce([]).mockResolvedValueOnce([saved(other ? { clerkUserId: "other" } : {})]);
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(other ? 409 : 200);
    expect(await response.json()).toEqual(other ? { error: "trial_used" } : { status: "existing", licenseKey: "stored-key", expiresAt: "2026-10-13T12:00:00Z" });
    expect(m.transaction).toHaveBeenCalledTimes(2);
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("fails closed when issuer returns null", async () => {
    m.issue.mockReturnValue(null);
    const response = await handleMasterchainTrial(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "signing_unavailable" });
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.mail).not.toHaveBeenCalled();
    expect(m.committed).toBe(false);
  });
  it("does not email if the transaction cannot commit or expose query parameters", async () => {
    m.transaction.mockRejectedValue(new Error("query includes secret-key"));
    expect((await handleMasterchainTrial(request())).status).toBe(500);
    expect(m.mail).not.toHaveBeenCalled();
    expect(JSON.stringify(m.log.mock.calls)).not.toContain("secret-key");
  });
});
