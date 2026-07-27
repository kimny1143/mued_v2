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

  // ★Refuse to sign a value containing a newline. The format is line-based, so a `\n` inside owner /
  // order / scope INJECTS A LINE — and because we then sign the result, the injected line is
  // perfectly authentic. Signature verification cannot catch this; it is the one class of attack a
  // signature is structurally blind to, because we are the ones signing it. Field lookup returns the
  // FIRST match, so an injected line placed before the real one wins.
  // Inputs are external (buyer email, FastSpring order id), so this is closed at the issuer —
  // fail-CLOSED, consistent with every other refusal in this file. (product課, 2026-07-26.)
  for (const value of [input.owner, input.order, input.scope ?? "", input.issuedAt ?? "", input.expiresAt ?? ""]) {
    if (/[\r\n]/.test(value)) return null;
  }

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
    // ★Strip a leading UTF-8 BOM, then fold CRLF → LF. Both exist for the same real path: the buyer
    // saves the emailed .key with Notepad, which adds a BOM and CRLF line endings. Without the BOM
    // strip the magic line no longer matches and a legitimately purchased key is rejected — a failure
    // that happens only to buyers and is therefore the hardest kind to reproduce.
    const text = keyfile.replace(/^﻿/, "").replace(/\r\n/g, "\n");

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

    // ★A known field appearing twice makes the keyfile INVALID — we do not pick a winner.
    //
    // This is not tidiness. `expires_at` comes after `owner`, and `owner` is a value the buyer
    // supplies: a newline in it injects an EMPTY `expires_at=` line that lands BEFORE the real one,
    // and first-match reads it as perpetual. dsp measured a lapsed key verifying as `Licensed`.
    // ★The signature cannot catch it — the injected line is inside the signed region, so it is
    // genuinely ours. Reproduced here before fixing.
    //
    // ★Deliberately NOT "take the last match": any rule that depends on field ORDER breaks the day
    // someone reorders the template. Rejecting duplicates is order-independent — the same reason
    // `sig=` must appear exactly once rather than "use the last one".
    //
    // ★And this belongs here even though the issuer now refuses newlines. A verifier must not assume
    // the issuer behaved: the plugin runs on machines we do not control, against keyfiles produced by
    // code we may not know about. `verifyLicense` is also the judge for the self-check and the golden
    // vectors, so if it tolerated duplicates the `injected_field` vector would false-pass.
    const KNOWN_FIELDS = ["product", "scope", "owner", "order", "issued_at", "expires_at"] as const;
    for (const name of KNOWN_FIELDS) {
      if (lines.filter((l) => l.startsWith(`${name}=`)).length > 1) return null;
    }

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

/**
 * ★The FINAL decision — the one the plugin makes, reproduced here so both sides can be checked
 * against the same golden vectors.
 *
 * `verifyLicense` deliberately answers only "did we issue this?" and does NOT check entitlement. That
 * separation is right, but it means verifyLicense alone ACCEPTS a genuinely-signed key for another
 * product: `wrong_scope` in dsp's vector set is a real signature of ours whose expected verdict is
 * `reject`. Running the vectors through verifyLicense would report "all as expected" while silently
 * disagreeing with the plugin. The vector runner must go through this function.
 *
 * Three verdicts, matching dsp's MANIFEST:
 *   accept      — licensed.
 *   reject      — it looks like one of our keyfiles but is not valid for this product (forged,
 *                 tampered, structurally illegal, or issued for a different scope).
 *   unlicensed  — there is no usable licence here at all (absent, unreadable, or expired). ★The
 *                 plugin must run normally in this state; it is NOT an error. Expiry lands here on
 *                 purpose: a lapsed licence means "not unlocked", not "you are a pirate".
 */
export type LicenseVerdict = "accept" | "reject" | "unlicensed";

/**
 * Does this verified payload entitle the holder to `expected`? Pure, and separate from authenticity
 * on purpose: "we issued this" and "this unlocks that product" are different questions, and
 * conflating them is what lets a genuine key for one product open another.
 *
 * Frozen name — the golden-vector runner and the plugin must reach the same conclusion by the same
 * rule, so the rule has to be callable rather than re-derived at each call site.
 */
export function isEntitled(
  payload: LicensePayload,
  expected: { product: string; scope: string },
  now: Date = new Date(),
): boolean {
  if (payload.product !== expected.product || payload.scope !== expected.scope) return false;
  if (payload.expiresAt === "") return true; // empty = perpetual
  const expiry = Date.parse(payload.expiresAt);
  // An unreadable expiry counts as expired: the safe reading of "we cannot tell when this ends" is
  // "it has ended" (and that lands in the non-punitive `unlicensed` state, not `reject`).
  return !Number.isNaN(expiry) && expiry > now.getTime();
}

export function evaluateLicense(
  keyfile: string,
  publicKeyPem: string,
  expected: { product: string; scope: string },
  now: Date = new Date(),
): { verdict: LicenseVerdict; payload: LicensePayload | null } {
  const payload = verifyLicense(keyfile, publicKeyPem);

  if (!payload) {
    // Distinguish "not a licence file" from "a licence file that failed". Anything carrying our magic
    // was meant to be a licence, so a failure there is a rejection; random bytes or an empty file are
    // simply the unlicensed state.
    const looksLikeOurs = /^﻿?MUEDSP-LICENSE-/.test(keyfile.replace(/\r\n/g, "\n"));
    return { verdict: looksLikeOurs ? "reject" : "unlicensed", payload: null };
  }

  // Wrong product/scope and expiry are BOTH "not entitled", but they are not the same verdict:
  // a key for another product is a rejection (cross-product replay), while a lapsed key is simply
  // not unlocked — the plugin must keep running. Both go through isEntitled so the rule exists once.
  if (payload.product !== expected.product || payload.scope !== expected.scope) {
    return { verdict: "reject", payload };
  }

  return { verdict: isEntitled(payload, expected, now) ? "accept" : "unlicensed", payload };
}
