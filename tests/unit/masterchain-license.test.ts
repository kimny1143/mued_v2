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
import { generateKeyPairSync, sign } from "node:crypto";
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

  it("★rejects a duplicated known field — an injected expires_at must not grant perpetuity", () => {
    // ★Privilege escalation, not a missed rejection (dsp measured it): `expires_at` comes AFTER
    // `owner`, and `owner` is buyer-supplied. A newline in it injects an EMPTY `expires_at=` that
    // lands BEFORE the real one, so first-match reads a lapsed key as perpetual. The signature is
    // genuine — the injected line is inside the signed region — so only a structural rule catches it.
    // Rejecting duplicates is order-independent; "take the last match" would break the day someone
    // reorders the template.
    const prefix =
      `${LICENSE_MAGIC}\nproduct=MUEDsp\nscope=masterchain\n` +
      `owner=buyer@example.com\nexpires_at=\n` + // injected, wins under first-match
      `order=TEST-0001\nissued_at=2026-07-26T00:00:00Z\nexpires_at=2020-01-01T00:00:00Z\n`;
    const sig = sign(null, Buffer.from(prefix, "utf8"), privateKey).toString("base64");
    const forged = `${prefix}sig=${sig}\n`;

    // The signature really is ours — that is the whole problem.
    expect(sign(null, Buffer.from(prefix, "utf8"), privateKey).length).toBe(64);
    expect(verifyLicense(forged, PUB_PEM)).toBeNull();
  });

  it("★refuses to ISSUE when a value contains a newline (field injection)", () => {
    // The one class a signature cannot catch: a `\n` in an input injects a line, and then WE sign it,
    // so the result is perfectly authentic. Field lookup takes the FIRST match, so a line injected
    // ahead of the real one wins. Inputs are external (buyer email, FastSpring order id), so this is
    // closed at the issuer — there is nowhere downstream that could tell the difference.
    expect(issueLicense({ ...ORDER, owner: "a@b.com\nscope=everything" })).toBeNull();
    expect(issueLicense({ ...ORDER, order: "X\nissued_at=1999-01-01T00:00:00Z" })).toBeNull();
    expect(issueLicense({ ...ORDER, scope: "masterchain\nproduct=MUEDsp" })).toBeNull();
    expect(issueLicense({ ...ORDER, owner: "a@b.com\r\nx=1" })).toBeNull();
    // …and the ordinary case still issues.
    expect(issueLicense(ORDER)).not.toBeNull();
  });
});

describe("masterchain license v2 — tolerated variations", () => {
  it("★accepts CRLF (keyfiles travel by email and get re-saved on Windows)", () => {
    expect(verifyLicense(issueLicense(ORDER)!.replace(/\n/g, "\r\n"), PUB_PEM)).not.toBeNull();
  });

  it("★accepts a leading UTF-8 BOM (Notepad adds one when the buyer saves the .key)", () => {
    // Without the BOM strip the magic line no longer matches and a legitimately purchased key is
    // rejected — a failure that happens only to buyers, and so is the hardest kind to reproduce.
    expect(verifyLicense("﻿" + issueLicense(ORDER)!, PUB_PEM)).not.toBeNull();
  });

  it("accepts BOM and CRLF together (the actual Notepad round-trip)", () => {
    const kf = "﻿" + issueLicense(ORDER)!.replace(/\n/g, "\r\n");
    expect(verifyLicense(kf, PUB_PEM)).not.toBeNull();
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

// ★The golden vector lives in tests/unit/masterchain-license-vectors.test.ts, against the SHARED
// set vendored from dsp (#232) — not here. A second, self-made vector for the same contract is
// the same as a second specification: each side passes its own and the drift stays invisible.
// This file covers behaviour; that one covers the bytes both implementations must agree on.
