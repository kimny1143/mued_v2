/**
 * Unit — masterchain Ed25519 license keyfile (lib/masterchain/license.ts).
 *
 * The interesting assertions here are the ones about what must NOT happen:
 *  - no signing key → NO keyfile (fail-closed). An "unsigned license" would be forgeable by anyone.
 *  - a tampered payload must not verify, including the case where the payload is edited but the
 *    signature is left alone — that is what an attacker actually does.
 *  - the GOLDEN VECTOR: a fixed key + fixed payload must produce one exact byte string. This is the
 *    executable half of the format contract with dsp's C++ verifier; if either side drifts (base64
 *    vs base64url, signing raw JSON vs the encoded segment, field order) this test fails here rather
 *    than showing up as "the key I bought doesn't work" after launch.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, createPrivateKey, createPublicKey } from "node:crypto";
import {
  issueLicense,
  verifyLicense,
  isLicenseIssuingConfigured,
  LICENSE_VERSION,
} from "@/lib/masterchain/license";

// A throwaway pair generated once for this suite — NOT the production key.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRIV_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const ORDER = {
  name: "Test Buyer",
  email: "buyer@example.com",
  product: "muedsp_masterchain",
  orderId: "FS-TEST-0001",
};

const originalEnv = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
beforeEach(() => {
  process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV_PEM;
});
afterEach(() => {
  if (originalEnv === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = originalEnv;
});

describe("masterchain license — issue / verify", () => {
  it("issues a keyfile that verifies and round-trips the payload", () => {
    const keyfile = issueLicense(ORDER);
    expect(keyfile).not.toBeNull();
    expect(keyfile).toContain("-----BEGIN MUEDSP LICENSE-----");
    expect(keyfile).toContain("-----END MUEDSP LICENSE-----");

    const payload = verifyLicense(keyfile!, PUB_PEM);
    expect(payload).not.toBeNull();
    expect(payload!.email).toBe("buyer@example.com");
    expect(payload!.orderId).toBe("FS-TEST-0001");
    expect(payload!.product).toBe("muedsp_masterchain");
    expect(payload!.v).toBe(LICENSE_VERSION);
    expect(Date.parse(payload!.issuedAt)).not.toBeNaN();
  });

  it("★fails closed when no signing key is set — never returns an unsigned license", () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    expect(isLicenseIssuingConfigured()).toBe(false);
    expect(issueLicense(ORDER)).toBeNull();
  });

  it("treats a malformed signing key as unconfigured rather than throwing", () => {
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = "not a pem";
    expect(isLicenseIssuingConfigured()).toBe(false);
    expect(issueLicense(ORDER)).toBeNull();
  });

  it("accepts an escaped-newline PEM (how a key pasted into an env var usually arrives)", () => {
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV_PEM.replace(/\n/g, "\\n");
    const keyfile = issueLicense(ORDER);
    expect(keyfile).not.toBeNull();
    expect(verifyLicense(keyfile!, PUB_PEM)).not.toBeNull();
  });
});

describe("masterchain license — rejection", () => {
  it("★rejects a payload edited after signing (signature left intact)", () => {
    const keyfile = issueLicense(ORDER)!;
    const body = keyfile.split("\n")[1];
    const [encoded, signature] = body.split(".");

    const tampered = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    tampered.email = "attacker@example.com";
    const reEncoded = Buffer.from(JSON.stringify(tampered), "utf8").toString("base64url");

    const forged = `-----BEGIN MUEDSP LICENSE-----\n${reEncoded}.${signature}\n-----END MUEDSP LICENSE-----`;
    expect(verifyLicense(forged, PUB_PEM)).toBeNull();
  });

  it("rejects a keyfile signed by a different key", () => {
    const other = generateKeyPairSync("ed25519");
    const otherPub = other.publicKey.export({ type: "spki", format: "pem" }).toString();
    const keyfile = issueLicense(ORDER)!;
    expect(verifyLicense(keyfile, otherPub)).toBeNull();
  });

  it("rejects structurally broken input instead of throwing", () => {
    for (const bad of [
      "",
      "-----BEGIN MUEDSP LICENSE-----\n-----END MUEDSP LICENSE-----",
      "-----BEGIN MUEDSP LICENSE-----\nnodot\n-----END MUEDSP LICENSE-----",
      "-----BEGIN MUEDSP LICENSE-----\n.sig\n-----END MUEDSP LICENSE-----",
      "-----BEGIN MUEDSP LICENSE-----\npayload.\n-----END MUEDSP LICENSE-----",
      "-----BEGIN MUEDSP LICENSE-----\nnot!base64.also!bad\n-----END MUEDSP LICENSE-----",
    ]) {
      expect(verifyLicense(bad, PUB_PEM)).toBeNull();
    }
  });
});

describe("masterchain license — ★golden vector (format contract with dsp)", () => {
  // Fixed key + fixed payload ⇒ one exact string. Ed25519 signatures are deterministic (RFC 8032),
  // so this is stable across machines and runs — unlike ECDSA, which would need a fixed nonce.
  // ★A THROWAWAY key, DERIVED FROM A SEED rather than stored as a PEM.
  //
  // The obvious way to pin a vector is to paste a PEM private-key block here. Don't: GitGuardian
  // flags it (correctly — a scanner cannot tell a test key from a real one), and getting that alert
  // dismissed teaches everyone to wave through the next one. So the repo holds 32 bytes of seed and
  // rebuilds the key at run time. Same determinism, no key-shaped text in git history.
  // ★Note this comment avoids spelling out the PEM header too: writing the pattern you are telling
  // people not to commit makes the scanner match your own warning (same trap as putting a grep's
  // search string inside the file that grep checks).
  //
  // Ed25519 PKCS#8 DER is a fixed 16-byte prefix followed by the raw seed.
  // ★This key must NEVER be the production signer — a keyfile signed with it must not unlock a
  // shipped plugin. It is published precisely so dsp can run the identical vector.
  const GOLDEN_SEED = "4d5545447370206d61737465726368616e20676f6c64656e2076656374307221";
  const PKCS8_ED25519_PREFIX = "302e020100300506032b657004220420";
  const goldenPrivKey = createPrivateKey({
    key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, "hex"), Buffer.from(GOLDEN_SEED, "hex")]),
    format: "der",
    type: "pkcs8",
  });
  const GOLDEN_PRIV = goldenPrivKey.export({ type: "pkcs8", format: "pem" }).toString();
  const GOLDEN_PUB = createPublicKey(goldenPrivKey).export({ type: "spki", format: "pem" }).toString();

  it("produces a byte-identical keyfile for a fixed key + fixed payload", () => {
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = GOLDEN_PRIV;
    const keyfile = issueLicense({
      name: "Golden Vector",
      email: "golden@example.com",
      product: "muedsp_masterchain",
      orderId: "FS-GOLDEN-0001",
      issuedAt: "2026-08-05T00:00:00.000Z", // pinned — otherwise the signature moves every run
    });
    expect(keyfile).not.toBeNull();

    // Round-trips under the matching public key…
    const payload = verifyLicense(keyfile!, GOLDEN_PUB);
    expect(payload).not.toBeNull();
    expect(payload!.email).toBe("golden@example.com");

    // …and is byte-stable. If this string changes, the format changed — coordinate with dsp before
    // updating it, because their verifier is pinned to the same bytes.
    expect(keyfile).toMatchInlineSnapshot(`
      "-----BEGIN MUEDSP LICENSE-----
      eyJuYW1lIjoiR29sZGVuIFZlY3RvciIsImVtYWlsIjoiZ29sZGVuQGV4YW1wbGUuY29tIiwicHJvZHVjdCI6Im11ZWRzcF9tYXN0ZXJjaGFpbiIsIm9yZGVySWQiOiJGUy1HT0xERU4tMDAwMSIsImlzc3VlZEF0IjoiMjAyNi0wOC0wNVQwMDowMDowMC4wMDBaIiwidiI6MX0.44UC7HIuuBav4mE1pErH7sq06bqV0kU8tuX7L3XRQkK2gC1mryUosHSrjV_7Fxh_uEUdcCN8aBzdH9KM6XRYCw
      -----END MUEDSP LICENSE-----"
    `);
  });
});
