/**
 * Unit — masterchain Ed25519 license keyfile, format v2 (lib/masterchain/license.ts).
 *
 * The format is frozen by product課 (`_product/docs/decision-masterchain-license-authenticity-20260725.md`)
 * and read by dsp's dependency-free C++ verifier. ★These tests exist to keep this side pinned to THAT
 * format: an earlier implementation invented its own container and asserted "dsp verifies the same
 * bytes" without checking, which would have mailed buyers keyfiles their plugin cannot read.
 *
 * The assertions that matter are the negative ones — the spec's bypass list:
 *   payload byte flipped / sig byte flipped / two `sig=` lines / content after `sig=` /
 *   a different `scope` / the old 16-hex scaffold.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, createPrivateKey, createPublicKey } from "node:crypto";
import {
  issueLicense,
  verifyLicense,
  isLicenseIssuingConfigured,
  LICENSE_MAGIC,
} from "@/lib/masterchain/license";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRIV_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const ORDER = { owner: "buyer@example.com", order: "FS-TEST-0001" };

const originalEnv = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
beforeEach(() => {
  process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV_PEM;
});
afterEach(() => {
  if (originalEnv === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = originalEnv;
});

describe("masterchain license v2 — shape", () => {
  it("emits the frozen line format with sig= last", () => {
    const lines = issueLicense(ORDER)!.split("\n");
    expect(lines[0]).toBe(LICENSE_MAGIC);
    expect(lines[1]).toBe("product=MUEDsp");
    expect(lines[2]).toBe("scope=masterchain");
    expect(lines[3]).toBe("owner=buyer@example.com");
    expect(lines[4]).toBe("order=FS-TEST-0001");
    expect(lines[5]).toMatch(/^issued_at=\d{4}-\d{2}-\d{2}T/);
    expect(lines[6]).toBe("expires_at="); // always emitted; empty = perpetual
    expect(lines[7]).toMatch(/^sig=/);
    expect(lines[8]).toBe(""); // single trailing newline
  });

  it("signature decodes to exactly 64 bytes of standard base64", () => {
    const sig = issueLicense(ORDER)!.split("\n").find((l) => l.startsWith("sig="))!.slice(4);
    expect(/^[A-Za-z0-9+/]+={0,2}$/.test(sig)).toBe(true);
    expect(Buffer.from(sig, "base64").length).toBe(64);
  });

  it("round-trips every field", () => {
    const p = verifyLicense(issueLicense(ORDER)!, PUB_PEM);
    expect(p).not.toBeNull();
    expect(p!.product).toBe("MUEDsp");
    expect(p!.scope).toBe("masterchain");
    expect(p!.owner).toBe("buyer@example.com");
    expect(p!.order).toBe("FS-TEST-0001");
    expect(p!.expiresAt).toBe("");
    expect(Date.parse(p!.issuedAt)).not.toBeNaN();
  });

  it("★fails closed when no signing key is set — never returns an unsigned license", () => {
    delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
    expect(isLicenseIssuingConfigured()).toBe(false);
    expect(issueLicense(ORDER)).toBeNull();
  });

  it("treats a malformed signing key as unconfigured rather than throwing", () => {
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = "not a pem";
    expect(issueLicense(ORDER)).toBeNull();
  });

  it("accepts an escaped-newline PEM (how a key pasted into an env var arrives)", () => {
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = PRIV_PEM.replace(/\n/g, "\\n");
    expect(verifyLicense(issueLicense(ORDER)!, PUB_PEM)).not.toBeNull();
  });
});

describe("masterchain license v2 — ★the spec's bypass list", () => {
  it("rejects a flipped payload byte", () => {
    expect(verifyLicense(issueLicense(ORDER)!.replace("buyer@", "hacker"), PUB_PEM)).toBeNull();
  });

  it("rejects a flipped signature byte", () => {
    const kf = issueLicense(ORDER)!;
    const sig = kf.split("\n").find((l) => l.startsWith("sig="))!.slice(4);
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifyLicense(kf.replace(sig, flipped), PUB_PEM)).toBeNull();
  });

  it("★rejects two sig= lines (issuer signs one, a verifier could read the other)", () => {
    const kf = issueLicense(ORDER)!;
    const sigLine = kf.split("\n").find((l) => l.startsWith("sig="))!;
    expect(verifyLicense(`${kf}${sigLine}\n`, PUB_PEM)).toBeNull();
  });

  it("★rejects content appended after the sig= line (outside the signed region)", () => {
    expect(verifyLicense(`${issueLicense(ORDER)!}scope=everything\n`, PUB_PEM)).toBeNull();
  });

  it("★a different scope stays verifiable but is NOT masterchain — validity ≠ entitlement", () => {
    // Genuinely signed by us, for another product. Without checking scope, a MUEDlim key would
    // unlock MUEDsp: the signature only says "we issued this", never "this unlocks that".
    const p = verifyLicense(issueLicense({ ...ORDER, scope: "muedlim" })!, PUB_PEM);
    expect(p).not.toBeNull();
    expect(p!.scope).toBe("muedlim");
    expect(p!.scope).not.toBe("masterchain");
  });

  it("rejects the old 16-hex scaffold format", () => {
    expect(verifyLicense("MUEDSP-LICENSE-v1\nsig=0123456789abcdef\n", PUB_PEM)).toBeNull();
  });

  it("rejects a keyfile signed by a different key", () => {
    const otherPub = generateKeyPairSync("ed25519")
      .publicKey.export({ type: "spki", format: "pem" })
      .toString();
    expect(verifyLicense(issueLicense(ORDER)!, otherPub)).toBeNull();
  });

  it("rejects a url-safe (base64url) signature", () => {
    const kf = issueLicense(ORDER)!;
    const sig = kf.split("\n").find((l) => l.startsWith("sig="))!.slice(4);
    const urlSafe = Buffer.from(sig, "base64").toString("base64url");
    if (urlSafe !== sig.replace(/=+$/, "")) {
      expect(verifyLicense(kf.replace(sig, urlSafe), PUB_PEM)).toBeNull();
    }
  });

  it("rejects structurally broken input instead of throwing", () => {
    for (const bad of ["", "MUEDSP-LICENSE-v2\n", "sig=\n", "nonsense"]) {
      expect(verifyLicense(bad, PUB_PEM)).toBeNull();
    }
  });
});

describe("masterchain license v2 — tolerated variations", () => {
  it("★accepts CRLF (keyfiles travel by email and get re-saved on Windows)", () => {
    expect(verifyLicense(issueLicense(ORDER)!.replace(/\n/g, "\r\n"), PUB_PEM)).not.toBeNull();
  });

  it("accepts a missing trailing newline", () => {
    expect(verifyLicense(issueLicense(ORDER)!.replace(/\n$/, ""), PUB_PEM)).not.toBeNull();
  });

  it("★accepts whitespace inside the base64 value (mail clients wrap long lines)", () => {
    const kf = issueLicense(ORDER)!;
    const sig = kf.split("\n").find((l) => l.startsWith("sig="))!.slice(4);
    expect(verifyLicense(kf.replace(sig, `${sig.slice(0, 40)} ${sig.slice(40)}`), PUB_PEM)).not.toBeNull();
  });
});

describe("masterchain license v2 — ★golden vector (format contract with dsp)", () => {
  // ★A THROWAWAY key, DERIVED FROM A SEED rather than stored as a PEM: a scanner cannot tell a test
  // key from a real one, and getting that alert dismissed teaches everyone to wave through the next.
  // (This comment also avoids spelling out the PEM header — writing the pattern you are telling
  // people not to commit makes the scanner match your own warning.)
  // Ed25519 PKCS#8 DER = fixed 16-byte prefix + raw seed.
  const GOLDEN_SEED = "4d5545447370206d61737465726368616e20676f6c64656e2076656374307221";
  const PKCS8_ED25519_PREFIX = "302e020100300506032b657004220420";
  const goldenPriv = createPrivateKey({
    key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, "hex"), Buffer.from(GOLDEN_SEED, "hex")]),
    format: "der",
    type: "pkcs8",
  });
  const GOLDEN_PRIV = goldenPriv.export({ type: "pkcs8", format: "pem" }).toString();
  const GOLDEN_PUB = createPublicKey(goldenPriv).export({ type: "spki", format: "pem" }).toString();

  it("produces a byte-identical keyfile for a fixed key + fixed fields", () => {
    process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = GOLDEN_PRIV;
    const kf = issueLicense({
      owner: "golden@example.com",
      order: "FS-GOLDEN-0001",
      issuedAt: "2026-08-05T00:00:00.000Z", // pinned — otherwise the signature moves every run
    });
    expect(verifyLicense(kf!, GOLDEN_PUB)).not.toBeNull();

    // ★If this string changes, the format changed. Coordinate with dsp before updating it — their
    // verifier is pinned to the same bytes. Ed25519 is deterministic (RFC 8032), so this is stable
    // across machines and runs.
    expect(kf).toMatchInlineSnapshot(`
      "MUEDSP-LICENSE-v2
      product=MUEDsp
      scope=masterchain
      owner=golden@example.com
      order=FS-GOLDEN-0001
      issued_at=2026-08-05T00:00:00.000Z
      expires_at=
      sig=EhWEqNuYRaYtT5Xa+0PZWBaTmz51VqR3Q/JSuG0RWdNtUfwEev5eFV01uqbk5sIR3KiHFWHJhA2NrqRU+9RFDg==
      "
    `);
  });
});
