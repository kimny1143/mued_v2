#!/usr/bin/env tsx
/**
 * masterchain license key-pair self-check.
 *
 * ## What this catches
 *
 * That the PRIVATE key configured for signing and the PUBLIC key the plugin verifies with are
 * actually the same pair. Nothing else checks this: `issueLicense()` succeeds with ANY valid Ed25519
 * private key, and the resulting keyfile looks perfectly well-formed. A mismatch only becomes visible
 * when a buyer reports that the key they paid for does not unlock the plugin — after the money moved,
 * and with no way to tell "wrong key configured" from "the buyer did it wrong".
 *
 * ★Requested by conductor (2026-07-26) precisely because "the buyer's key doesn't work" is the worst
 * possible place to discover a paste error.
 *
 * Sign a fixed payload with MASTERCHAIN_LICENSE_PRIVATE_KEY → verify with
 * MASTERCHAIN_LICENSE_PUBLIC_KEY → exit non-zero on mismatch, on an unusable key, or when either is
 * unset. Prints no key material on any path (see `fail`).
 *
 * Usage:
 *   npx tsx scripts/verify/masterchain-license-selfcheck.ts
 *   (reads .env.local locally; in CI/Vercel the vars come from the environment)
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { issueLicense, verifyLicense } from "@/lib/masterchain/license";

const priv = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
const pub = process.env.MASTERCHAIN_LICENSE_PUBLIC_KEY;

function fail(msg: string): void {
  // ★Never interpolate a key into output. A "bad key" message that echoed the key would put the
  // signing key into CI logs, which are far more readable than the env var it came from.
  console.error(`✗ masterchain license self-check FAILED — ${msg}`);
  process.exitCode = 1;
}

if (!priv || !pub) {
  fail(
    `key pair not fully configured (private: ${priv ? "set" : "MISSING"}, public: ${pub ? "set" : "MISSING"}). ` +
      `Both are required: without the public key this check cannot prove the pair matches.`,
  );
} else {
  const keyfile = issueLicense({
    owner: "selfcheck@mued.jp",
    order: "SELFCHECK",
    issuedAt: "2026-01-01T00:00:00.000Z",
  });

  if (!keyfile) {
    fail("the private key is set but unusable — issueLicense() returned null (malformed PEM?)");
  } else {
    const payload = verifyLicense(keyfile, pub.includes("\\n") ? pub.replace(/\\n/g, "\n") : pub);
    if (!payload) {
      fail(
        "signed with the private key, but the public key does NOT verify it — the two are not a pair. " +
          "A license issued with this configuration would be rejected by the plugin.",
      );
    } else if (payload.owner !== "selfcheck@mued.jp") {
      fail("verified, but the payload did not round-trip — the keyfile format is inconsistent");
    } else {
      console.log("✓ masterchain license self-check PASSED — private key signs, public key verifies");
    }
  }
}
