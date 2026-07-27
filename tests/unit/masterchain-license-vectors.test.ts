/**
 * Unit — the SHARED golden vectors (tests/fixtures/license-vectors/, vendored from dsp #234/#235).
 *
 * ## Why this file exists, and why it is not "another" vector set
 *
 * The issuer (TypeScript, here) and the verifier (C++, in the plugin) are written in different
 * languages. Golden vectors are how both are held to the same bytes. ★That only works if there is
 * ONE set: this repo briefly pinned its own v2 vector alongside dsp's, which is the same as having
 * two specifications — each side passes its own and the drift is invisible. dsp's set is canonical
 * (14 cases + MANIFEST.tsv with expected verdicts and sha256); this file consumes it.
 *
 * ## ★The sha256 check is the point of the copy
 *
 * A vendored copy that silently goes stale turns "two sets" into "one set that is quietly wrong",
 * which is worse. Every case is hashed against MANIFEST.tsv before it is used, so an out-of-date copy
 * fails loudly here instead of passing against yesterday's bytes.
 *
 * ★If one of those hash assertions fails, read `../fixtures/license-vectors/PROVENANCE.md` first.
 * A mismatch means either "our copy is stale" (re-vendor) or "upstream changed" (the expected
 * VERDICTS may have moved, so read the diff before copying) — and the sha256 alone cannot tell you
 * which. The recorded `repo@commit` + MANIFEST blob is what separates them.
 *
 * ## ★★Hashes cannot see a case that is not here — that is what the version stamp is for
 *
 * Every check above compares the copy against the copy's OWN manifest. A copy that is one generation
 * behind is internally consistent, so it stays green no matter how many cases upstream has added:
 * ★what is missing is not a changed byte but an absent case, and there is nothing to hash.
 * This is not hypothetical — the first vendoring here took dsp's 13-case set eleven minutes before
 * the 14th (`injected_field`) landed on their trunk, and the suite was green the whole time while
 * the one vector that pins the duplicate-field escalation was simply not present.
 *
 * So the manifest carries `# vector-set-version` and this file pins it. Bumping EXPECTED_SET_VERSION
 * is meant to be a deliberate act: upstream bumps it when the SET changes, which is exactly when
 * someone has to read the diff rather than copy bytes over.
 *
 * ## ★Verdicts come from evaluateLicense, not verifyLicense
 *
 * `verifyLicense` answers "did we issue this?" only. `wrong_scope` is a REAL signature of ours whose
 * expected verdict is `reject` — running the vectors through verifyLicense alone would report "all as
 * expected" while disagreeing with the plugin. The runner must use the same final decision the
 * plugin makes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash, createPublicKey } from "node:crypto";
import path from "node:path";
import { evaluateLicense, type LicenseVerdict } from "@/lib/masterchain/license";

const DIR = path.resolve(__dirname, "../fixtures/license-vectors");

// The test key, from the MANIFEST header. Raw Ed25519 public keys are 32 bytes; SPKI DER is a fixed
// 12-byte prefix plus those bytes. ★TEST KEY — a keyfile signed with its private half must never
// unlock a shipped plugin.
const TEST_PUBLIC_HEX = "ab817a34aab0393676de5fb459cad1b89063813c1a2a1ebff8c278421e8266e0";
const SPKI_ED25519_PREFIX = "302a300506032b6570032100";
const TEST_PUB_PEM = createPublicKey({
  key: Buffer.concat([Buffer.from(SPKI_ED25519_PREFIX, "hex"), Buffer.from(TEST_PUBLIC_HEX, "hex")]),
  format: "der",
  type: "spki",
})
  .export({ type: "spki", format: "pem" })
  .toString();

interface Vector {
  name: string;
  verdict: LicenseVerdict;
  sha256: string;
  bytes: number;
  why: string;
}

const MANIFEST = readFileSync(path.join(DIR, "MANIFEST.tsv"), "utf8");

// ★Pinned deliberately. Upstream bumps this when the SET changes (a case added or removed), which
// per-case hashes cannot detect — see the header. A failure here is not "re-copy the files": read
// dsp's diff first, because a new case may encode a decision this repo has not made yet.
const EXPECTED_SET_VERSION = 2;
const setVersion = Number(MANIFEST.match(/^# vector-set-version:\s*(\d+)$/m)?.[1] ?? NaN);

const vectors: Vector[] = MANIFEST
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("#"))
  .map((l) => {
    const [name, verdict, sha256, bytes, why] = l.split("\t");
    return { name, verdict: verdict as LicenseVerdict, sha256, bytes: Number(bytes), why };
  });

// `expired` is evaluated against a fixed "now" so the suite does not start failing when a
// future-dated vector eventually goes stale — and so `valid_future_expiry` stays in the future.
const NOW = new Date("2026-08-05T00:00:00Z");
const EXPECTED = { product: "MUEDsp", scope: "masterchain" };

describe("masterchain license — shared golden vectors (dsp #234/#235)", () => {
  it("the manifest was found and lists every case", () => {
    // A zero-length parse would make every assertion below vacuously pass.
    expect(vectors.length).toBeGreaterThan(0);
    const files = readdirSync(path.join(DIR, "cases")).filter((f) => f.endsWith(".key"));
    expect(files.length).toBe(vectors.length);
  });

  it("the vendored set is the generation this repo was checked against", () => {
    // ★The only assertion here that can fail on a copy that is internally consistent. Everything
    // else compares the copy to its own manifest and cannot notice a case that never arrived.
    expect(
      setVersion,
      "vector-set-version missing or moved — re-vendor from dsp per PROVENANCE.md, and read the diff: a set bump means cases were added or removed, not just edited",
    ).toBe(EXPECTED_SET_VERSION);
  });

  it.each(vectors.map((v) => [v.name, v] as const))(
    "%s — bytes and sha256 match the manifest (detects a stale copy)",
    (_n, v) => {
      const data = readFileSync(path.join(DIR, "cases", `${v.name}.key`));
      expect(data.length, `${v.name}: size drifted from the manifest`).toBe(v.bytes);
      expect(
        createHash("sha256").update(data).digest("hex"),
        `${v.name}: content drifted from dsp's vector — re-vendor per PROVENANCE.md, do not edit in place`,
      ).toBe(v.sha256);
    },
  );

  it.each(vectors.map((v) => [`${v.name} → ${v.verdict}`, v] as const))(
    "%s (%o)",
    (_label, v) => {
      const keyfile = readFileSync(path.join(DIR, "cases", `${v.name}.key`), "utf8");
      const { verdict } = evaluateLicense(keyfile, TEST_PUB_PEM, EXPECTED, NOW);
      expect(verdict, `${v.name}: ${v.why}`).toBe(v.verdict);
    },
  );
});
