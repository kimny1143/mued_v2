//
// masterchain ($69) license keyfile — Ed25519 issuance + verification, format v2.
//
// ★ THIS IS THE LICENSE SIGNATURE. It is NOT the FastSpring webhook HMAC.
//   Two different signatures live in this feature and they are easy to confuse:
//     - lib/masterchain/fastspring-signature.ts  = HMAC-SHA256, SYMMETRIC, shared secret with
//       FastSpring. Answers "did FastSpring send this webhook?". Secret: FASTSPRING_WEBHOOK_SECRET.
//     - this file                                = Ed25519, ASYMMETRIC. Answers "did WE issue this
//       license?". Private key: MASTERCHAIN_LICENSE_PRIVATE_KEY (signing, server-side only).
//       The matching PUBLIC key is compiled into the plugin binary (dsp), which verifies OFFLINE.
//   Do not describe the license as "HMAC" anywhere.
//
// ## ★The format is NOT ours to choose — it is frozen by product課
//
// Canonical: `_product/docs/decision-masterchain-license-authenticity-20260725.md`.
// ★A previous version of this file invented a different container (BEGIN/END armour + base64url JSON)
// and its header claimed "frozen; dsp verifies the same bytes". That claim was false — dsp's verifier
// reads the line format below. Shipping it would have mailed buyers a keyfile their plugin cannot
// read, i.e. exactly the failure product課 designed the prefix rule to prevent: "a legitimate key is
// rejected", visible only to purchasers and hard to reproduce.
//
// The line format wins for a reason worth keeping: ★the CONSTRAINED side decides. The plugin's
// verifier is a dependency-free single header — iPlug2 ships no JSON parser and no base64 decoder —
// so a JSON container would mean vendoring both INTO THE SHIPPED BINARY on top of Ed25519. Line
// format costs the C++ side one line scan plus one base64 decode. On this side any format is a few
// lines either way.
//
// ## Format v2
//
//   MUEDSP-LICENSE-v2
//   product=MUEDsp
//   scope=masterchain
//   owner=<buyer email>
//   order=<FastSpring order id>
//   issued_at=<ISO8601>
//   expires_at=                     ← always emitted; empty means perpetual
//   sig=<base64(64-byte Ed25519 signature)>
//
// ★Signing rule (the "prefix rule"): the signature covers EVERYTHING BEFORE the `sig=` line, as the
// exact bytes written. Nothing is re-serialised or normalised on either side — which is the whole
// point: a "normalise then sign" rule makes issuer and verifier each implement normalisation, and
// they drift. Field order, blank lines and whitespace are therefore NOT specified; whatever the
// issuer wrote is what gets verified.
//
// ★`scope` is load-bearing: without it a signature is merely "we issued this", so a MUEDlim key would
// open MUEDsp. Validity and entitlement are different questions.
import { sign, verify, createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";

export const LICENSE_MAGIC = "MUEDSP-LICENSE-v2";
export const LICENSE_VERSION = 2;

export interface LicensePayload {
  product: string;
  /** Which product this unlocks. Without it, any valid signature would unlock everything. */
  scope: string;
  /** Buyer email — the identity the license is bound to (lowercased by the caller). */
  owner: string;
  /** FastSpring order id — ties a keyfile to exactly one purchase (support + re-issue). */
  order: string;
  issuedAt: string;
  /** Empty string = perpetual. The line is always emitted so the field set stays stable. */
  expiresAt: string;
}

/**
 * Read the signing key from the environment. Read at CALL time, never at module init — the same
 * reason fastspring-signature.ts does it: a module-level read freezes the build-time value and makes
 * "I set the secret" silently ineffective.
 *
 * Returns null when unset. Callers MUST treat null as "cannot issue" — ★never as "issue unsigned".
 * (lib/plugins/unsubscribe-token.ts deliberately stays self-consistent with an empty key because it
 * only needs to match itself. Correct there, CATASTROPHIC here: an empty-key signature is forgeable
 * by anyone who reads this repository.)
 */
function privateKey(): KeyObject | null {
  const pem = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  if (!pem) return null;
  try {
    return createPrivateKey(pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem);
  } catch {
    // Do NOT log the value or the underlying error: a malformed-key error can echo the input.
    return null;
  }
}

/** True when a signing key is present and usable — the "is this wired?" probe for callers/CI. */
export function isLicenseIssuingConfigured(): boolean {
  return privateKey() !== null;
}

/**
 * Issue a signed keyfile (format v2). Returns null when no signing key is configured (fail-CLOSED).
 *
 * ★NOT IDEMPOTENT BY ITSELF: `issued_at` differs per call, so issuing twice for one order yields two
 * different (both valid) keyfiles. The caller must issue once per order and persist the result — see
 * handleFastspringOrderCompleted, which reads the stored keyfile back first. FastSpring retries
 * webhooks; without that check one retry mails the buyer a second, different key.
 */
export function issueLicense(
  input: { owner: string; order: string; scope?: string; issuedAt?: string; expiresAt?: string },
): string | null {
  const key = privateKey();
  if (!key) return null;

  // LF only — the CRLF fold on the verifying side exists for keyfiles that pass through a Windows
  // editor, not as licence for us to emit CRLF.
  const prefix =
    `${LICENSE_MAGIC}\n` +
    `product=MUEDsp\n` +
    `scope=${input.scope ?? "masterchain"}\n` +
    `owner=${input.owner}\n` +
    `order=${input.order}\n` +
    `issued_at=${input.issuedAt ?? new Date().toISOString()}\n` +
    `expires_at=${input.expiresAt ?? ""}\n`;

  // Standard base64 WITH padding: it is the default of Buffer.toString("base64"), Python's
  // b64encode and `openssl base64`, so no side needs special handling. (Length/padding are described,
  // not enforced — see verifyLicense.)
  const signature = sign(null, Buffer.from(prefix, "utf8"), key).toString("base64");
  return `${prefix}sig=${signature}\n`;
}

/**
 * Verify a keyfile and return its fields, or null if anything is wrong. Pure — no env, no I/O; the
 * public key is passed in so tests can use a throwaway pair and CI can check the REAL pair.
 *
 * Kept beside the issuer so the golden vector is executable on this side rather than described.
 */
export function verifyLicense(keyfile: string, publicKeyPem: string): LicensePayload | null {
  try {
    // CRLF → LF before anything else: keyfiles travel by email and get opened in Windows editors.
    const text = keyfile.replace(/\r\n/g, "\n");

    // ★Exactly one `sig=` line, and it must be last. Multiple sig lines are a classic bypass (the
    // issuer signs one, the verifier reads the other), and content after it would let an attacker
    // append whatever they like outside the signed region.
    const sigLineStarts = [...text.matchAll(/^sig=/gm)].map((m) => m.index ?? -1);
    if (sigLineStarts.length !== 1) return null;
    const sigStart = sigLineStarts[0];

    const prefix = text.slice(0, sigStart);
    const rest = text.slice(sigStart);
    const newlineInRest = rest.indexOf("\n");
    // Nothing after the sig line except at most one trailing newline.
    if (newlineInRest !== -1 && rest.slice(newlineInRest + 1).length > 0) return null;

    const sigValue = (newlineInRest === -1 ? rest : rest.slice(0, newlineInRest)).slice("sig=".length);

    // ★The ONLY condition on the signature encoding: strip internal ASCII whitespace, decode, and
    // require exactly 64 bytes. Length and padding counts are deliberately NOT asserted — product課
    // got the padding count wrong in the spec once, and a verifier that enforced "88 chars, one ="
    // would have rejected correct keys. Fewer stated conditions is stronger than more accurate ones.
    const compact = sigValue.replace(/[ \t\r\n]/g, "");
    if (/[-_]/.test(compact)) return null; // URL-safe alphabet is not accepted
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
    const signature = Buffer.from(compact, "base64");
    if (signature.length !== 64) return null;

    if (!verify(null, Buffer.from(prefix, "utf8"), createPublicKey(publicKeyPem), signature)) {
      return null;
    }

    // Signature is good — now read the fields. Parsing happens AFTER verification so a malformed
    // payload can never be interpreted on the strength of an unchecked signature.
    const lines = prefix.split("\n");
    if (lines[0] !== LICENSE_MAGIC) return null;
    const field = (name: string): string | null => {
      const line = lines.find((l) => l.startsWith(`${name}=`));
      return line === undefined ? null : line.slice(name.length + 1);
    };

    const product = field("product");
    const scope = field("scope");
    const owner = field("owner");
    const order = field("order");
    const issuedAt = field("issued_at");
    const expiresAt = field("expires_at");
    if (product === null || scope === null || owner === null || order === null || issuedAt === null) {
      return null;
    }

    return { product, scope, owner, order, issuedAt, expiresAt: expiresAt ?? "" };
  } catch {
    return null;
  }
}
