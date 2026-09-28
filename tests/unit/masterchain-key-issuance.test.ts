import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DISPOSABLE_EMAIL_DOMAINS_TXT } from "@/lib/masterchain/data/disposable-email-domains";
import { canonicalEmail, disposableEmailDomainCount, isDisposableEmail, trialExpiry, issueKey, KeyIssuanceError } from "@/lib/masterchain/key-issuance";
import { verifyLicense } from "@/lib/masterchain/license";

afterEach(() => vi.unstubAllEnvs());

describe("shared key issuance", () => {
  it.each([
    [" A.B+C@GMAIL.COM ", "ab@gmail.com"],
    ["a.b+trial@googlemail.com", "ab@gmail.com"],
    [" A.B+tag@Example.COM ", "a.b@example.com"], // +tag folded for every domain; dots kept
    [" A.B+tag@Yahoo.co.jp ", "a.b@yahoo.co.jp"],
  ])("canonicalizes %s", (input, expected) => expect(canonicalEmail(input)).toBe(expected));

  it.each(["mailinator.com", "a.b.mailinator.com"])("blocks %s and parent domains", (domain) => {
    expect(isDisposableEmail(` TEST@${domain.toUpperCase()} `)).toBe(true);
  });
  it.each(["gmail.com", "outlook.com", "icloud.com", "yahoo.co.jp", "mailinator.com.example.org"])("allows %s", (domain) => {
    expect(isDisposableEmail(`test@${domain}`)).toBe(false);
  });
  it("reads the complete, unmodified vendored list", () => {
    expect(disposableEmailDomainCount()).toBeGreaterThan(9000);
    const bytes = readFileSync("lib/masterchain/data/disposable-email-domains.txt");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("b5493ea48624f28e09b2a25977c9319b78a6b59d59a017ff73b2aa6e5938e510");
    // ★The bundled module must be byte-identical to the vendored .txt (it is generated from it).
    expect(DISPOSABLE_EMAIL_DOMAINS_TXT).toBe(bytes.toString("utf8"));
  });
  it("expires after 15 UTC days with exactly six fields", () => {
    const now = new Date("2026-09-28T12:34:56.789Z");
    const expiry = trialExpiry(now, 15);
    expect(expiry).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(expiry).toBe("2026-10-13T12:34:56Z");
    expect(now.toISOString()).toBe("2026-09-28T12:34:56.789Z");
  });
  it("signs a verifiable v2 trial key with the exact expiry", () => {
    const pair = generateKeyPairSync("ed25519");
    vi.stubEnv("MASTERCHAIN_LICENSE_PRIVATE_KEY", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    const expiresAt = trialExpiry(new Date("2026-09-28T00:00:00Z"), 15);
    const key = issueKey({ owner: "buyer@gmail.com", order: "trial:test-uuid", expiresAt });
    expect(key).toContain(`expires_at=${expiresAt}\n`);
    expect(key).toContain("order=trial:");
    expect(verifyLicense(key, pair.publicKey.export({ type: "spki", format: "pem" }).toString()))
      .toMatchObject({ owner: "buyer@gmail.com", order: "trial:test-uuid", expiresAt });
  });
  it.each(["", "not-a-key"])("fails closed for missing/invalid signing configuration", (pem) => {
    vi.stubEnv("MASTERCHAIN_LICENSE_PRIVATE_KEY", pem);
    expect(() => issueKey({ owner: "buyer@gmail.com", order: "trial:test" })).toThrow(KeyIssuanceError);
  });
  it("rejects a valid private key of the wrong algorithm", () => {
    const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    vi.stubEnv("MASTERCHAIN_LICENSE_PRIVATE_KEY", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    expect(() => issueKey({ owner: "buyer@gmail.com", order: "trial:test" })).toThrow(KeyIssuanceError);
  });
  it("wraps issuer refusal in a typed error", () => {
    const pair = generateKeyPairSync("ed25519");
    vi.stubEnv("MASTERCHAIN_LICENSE_PRIVATE_KEY", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    expect(() => issueKey({ owner: "buyer@gmail.com\norder=bad", order: "trial:test" })).toThrow(KeyIssuanceError);
  });
});
