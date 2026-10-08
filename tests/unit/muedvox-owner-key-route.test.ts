/**
 * kimny's own MUEDvox key (Tier 3, conductor's design OK 2026-10-07): GET /api/admin/license/owner-muedvox.
 * Conductor's test list: admin gets a key that verifies as scope=muedvox / not admin and signed out get 404 /
 * the key is rejected by the masterchain check (the same shape as dsp's wrong_scope vector) / the key never reaches a log.
 * A throwaway Ed25519 pair stands in for K1 — the real key is never in a test.
 */
import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getUser, isAdmin, log, trusted } = vi.hoisted(() => ({
  auth: vi.fn(),
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  trusted: { list: [] as string[] },
}));
// The trusted set is K1/K2 in production; the tests stand a throwaway key in for it (and pin the real values below).
vi.mock("@/lib/muedvox/trusted-keys", () => ({
  get TRUSTED_PLUGIN_PUBLIC_KEYS_HEX() {
    return trusted.list;
  },
}));
vi.mock("@clerk/nextjs/server", () => ({ auth, clerkClient: async () => ({ users: { getUser } }) }));
vi.mock("@/lib/middleware/admin", () => ({ isAdmin }));
vi.mock("@/lib/utils/logger", () => ({ logger: log }));

import { GET } from "@/app/api/admin/license/owner-muedvox/route";
import { evaluateLicense } from "@/lib/masterchain/license";
import { OWNER_KEY_ISSUED_AT, OWNER_KEY_ORDER } from "@/lib/muedvox/owner-key";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRIV = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const RAW = (publicKey.export({ type: "spki", format: "der" }) as Buffer).subarray(12).toString("hex");
const ENV = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV;
  trusted.list = [RAW];
  auth.mockResolvedValue({ userId: "user_38Ke5H6xPB9tm7M2J2fxP082fP5" }); // kimny (one of the two allowed ids)
  isAdmin.mockResolvedValue(true);
  getUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: "Owner@Example.com" } });
});
afterEach(() => {
  if (ENV === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = ENV;
});

describe("admin → the keyfile", () => {
  it("★200, a file download, no-store — and the key verifies as MUEDsp / scope=muedvox for the admin's primary email", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="MUEDvox.license.key"');
    const key = await res.text();
    const { verdict, payload } = evaluateLicense(key, PUB, { product: "MUEDsp", scope: "muedvox" });
    expect(verdict).toBe("accept");
    expect(payload).toMatchObject({ product: "MUEDsp", scope: "muedvox", owner: "owner@example.com", order: OWNER_KEY_ORDER, issuedAt: OWNER_KEY_ISSUED_AT, expiresAt: "" });
  });

  it("★the same key is REJECTED by the masterchain check (dsp's wrong_scope shape) — one product's key does not open another", async () => {
    const key = await (await GET()).text();
    expect(evaluateLicense(key, PUB, { product: "MUEDsp", scope: "masterchain" }).verdict).toBe("reject");
  });

  it("deterministic: opening the URL twice gives the same file, not a second key", async () => {
    const a = await (await GET()).text();
    const b = await (await GET()).text();
    expect(a).toBe(b);
  });

  it("★the keyfile, its signature and the owner's address never reach a log line", async () => {
    const key = await (await GET()).text();
    const sig = key.split("\n").find((l) => l.startsWith("sig="))!;
    const logged = JSON.stringify([log.error.mock.calls, log.warn.mock.calls, log.info.mock.calls, log.debug.mock.calls]);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("issued"), { order: OWNER_KEY_ORDER }); // the one proof the route ran
    expect(logged).not.toContain(sig.slice(4, 24));
    expect(logged).not.toContain("MUEDSP-LICENSE");
    expect(logged.toLowerCase()).not.toContain("owner@example.com");
  });
});

describe("★everyone else → 404 (the route does not admit it exists)", () => {
  it("signed out → 404, no-store, nothing issued", async () => {
    auth.mockResolvedValueOnce({ userId: null });
    const res = await GET();
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).not.toContain("MUEDSP-LICENSE");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("★another ADMIN (not kimny) → 404, nothing issued (conductor 10/7: kimny only)", async () => {
    auth.mockResolvedValueOnce({ userId: "user_someone_else_admin" });
    isAdmin.mockResolvedValueOnce(true);
    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("MUEDSP-LICENSE");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("kimny's other id (the second Clerk instance) is allowed too", async () => {
    auth.mockResolvedValueOnce({ userId: "user_33EiZv982KTQ6s6AfTCkbaYqkpR" });
    expect((await GET()).status).toBe(200);
  });

  it("kimny's id WITHOUT the admin role → 404", async () => {
    isAdmin.mockResolvedValueOnce(false);
    expect((await GET()).status).toBe(404);
  });

  it("signed in but not admin → 404 (not 401/403), nothing issued", async () => {
    isAdmin.mockResolvedValueOnce(false);
    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("MUEDSP-LICENSE");
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("★a key that cannot be issued or does not verify is not handed over → 500", () => {
  it("no signing key configured", async () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("MUEDSP-LICENSE");
  });

  it("a non-Ed25519 key (cannot derive the public key to self-verify)", async () => {
    const { privateKey: rsa } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = rsa.export({ type: "pkcs8", format: "pem" }).toString();
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("★signed by a key the plugins do NOT trust → 500, no key (conductor 10/7: verifying against itself proves nothing)", async () => {
    const { privateKey: other } = generateKeyPairSync("ed25519");
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = other.export({ type: "pkcs8", format: "pem" }).toString();
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("MUEDSP-LICENSE");
  });

  it("admin without a primary email", async () => {
    getUser.mockResolvedValueOnce({ primaryEmailAddress: null });
    expect((await GET()).status).toBe(500);
  });
});

describe("the trusted set is the plugins' K1/K2 — pinned", () => {
  it("equals dsp LicenseVerifier TrustedKeys() (mued-dsp 2c992786) = MUEDvox's copy = the published PEMs", async () => {
    const real = await vi.importActual<typeof import("@/lib/muedvox/trusted-keys")>("@/lib/muedvox/trusted-keys");
    expect(real.TRUSTED_PLUGIN_PUBLIC_KEYS_HEX).toEqual([
      "54a6246f7103387e4e72adf44b4c2c5f5607c82e4db198416088e5a7be1d1d41",
      "fea9d3b3d56bd42721ec0ae75840acf38fefab43fe89f1c1eeb1b05a6b81f69a",
    ]);
  });
});
