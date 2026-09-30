/**
 * Unit — the .pkg sitting behind each public download URL is still the build we pinned.
 *
 * Why this exists: `lib/muedlim/config.ts:28` carried the instruction
 *   "Verify after any swap: shasum -a 256 public/downloads/MUEDlim-0.1.0-alpha-installer.pkg"
 * — a runbook step with no executor. Nobody had run it. The assets are served from a FIXED
 * path under a BARE filename (no content hash), so replacing a build is an in-place overwrite:
 * the URL, the version constant, and the review diff all look identical when the bytes change.
 * dsp hit the same shape on 2026-07-29 — a bare name resolved to the wrong build — and their
 * conclusion generalises: the trigger is not "same name", it is "same place, overwritten".
 * Their blast radius was a local scratchpad; ours is a URL already emailed to subscribers.
 *
 * The local path is DERIVED from the exported constant rather than written out here, so this
 * gate cannot keep passing while covering nothing: point the constant somewhere else and the
 * first test fails instead of quietly finding no file to check.
 *
 * Pin provenance (2026-08-27 swap): all three artifacts were measured from the signed packages
 * kimny produced and notarised on 2026-08-27, verified before AND after placement
 * (stapler validate + pkgutil TeamIdentifier F529L4WT3V, 5/5), and cross-checked against the
 * sha256 recorded in each product config (lib/muedsat, lib/muedlim, lib/muedrive). So these are
 *
 * real pins, not prefixes.
 *
 * Intentionally closing a download (emptying the URL) turns these red. That is the design:
 * a deliberate change should have to touch this file. Silence is the failure mode being fixed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";
import { MUEDLIM_DOWNLOAD_URL } from "@/lib/muedlim/config";
import { MUEDRIVE_DOWNLOAD_URL } from "@/lib/muedrive/config";
import { MUEDSAT_DOWNLOAD_URL } from "@/lib/muedsat/config";
import { WINDOWS_BETA } from "@/lib/plugins/windows-beta";

/**
 * ★The paid module's pin, kept separate because it does not exist yet.
 *
 * ★WHY IT IS HERE WHILE STILL NULL (CCO review of #991). Everything above protects the three FREE
 * downloads; masterchain — the one people pay $69 for — was in none of it. `lib/masterchain/config.ts`
 * told the next reader that publishing it was "one string, no other code moves", so on the day
 * someone set that string they would have shipped a paid download with ★no existence check, no sha,
 * no byte count — ★the guard the free modules have, absent from the product with money attached.
 *
 * ★A comment could not fix that: it would be read by the same person who was already reading the
 * wrong sentence. ★So the pairing is asserted below — URL set ⇔ pin present — and this slot exists
 * so the fix is "fill in two numbers", not "discover that a whole test file needs editing".
 *
 * ★TO PUBLISH: put the notarised .pkg in public/downloads/, set MASTERCHAIN_DOWNLOAD_URL, and fill
 * this in from `shasum -a 256 <file>` and `stat -f%z <file>`. The tests above then cover it exactly
 * as they cover the free three.
 */
const MASTERCHAIN_PIN: { sha256: string; bytes: number } | null = {
  // ★1.0.0 (2026-09-30). Measured on the COPY under public/downloads/, not on dsp's source and not
  //   from the relayed message — `shasum -a 256` / `stat -f%z`. dsp's and conductor's declared sha256
  //   matched, and `cmp` against dsp's plugin/dist/ was byte-identical. (0.1.3 was d9c21c25…/4_133_469.)
  sha256: "07607ba9a378e2054c0b3fa2bbf01ff7dc7492b9951746826bf8d1659683761d",
  bytes: 4_280_176,
};

const ARTIFACTS = [
  {
    name: "MUEDlim",
    url: MUEDLIM_DOWNLOAD_URL,
    sha256: "e71952251543959bb156f81611b1a5c40834699add4a5a2b687c35dce5600ad3",
    bytes: 3_272_834,
  },
  {
    name: "MUEDsat",
    url: MUEDSAT_DOWNLOAD_URL,
    sha256: "e36fd15220290c7d9b8faf51574711263df73321a26360533b8a6a7e876c89ff",
    bytes: 3_420_493,
  },
  {
    name: "MUEDrive",
    url: MUEDRIVE_DOWNLOAD_URL,
    sha256: "1f3fc0918ccbbb9551c4d217594c043f2f9e0b808023576b640d9e08f6ce8d49",
    bytes: 3_620_155,
  },
  // ★Present only once BOTH the URL and the pin exist — so the same two tests below start covering
  //   the paid artifact the moment it is published, with no separate wiring to remember.
  // ★Windows VST3 beta (dsp build/win-beta-20260930b). Pinned from the moment the files are on the
  //   shelf, not from the day WINDOWS_BETA_LIVE flips: the zip URL is static like every .pkg.
  //   Measured on the copies under public/downloads/ (2026-09-30): matched conductor's relay + cmp to dsp.
  {
    name: "MUEDsat (Windows beta)",
    url: WINDOWS_BETA.muedsat.url,
    sha256: "1b85e2df84c2371f03b7e6532f97d8707fce557076d23962953f22d3cdb7b4ce",
    bytes: 1_188_719,
  },
  {
    name: "MUEDlim (Windows beta)",
    url: WINDOWS_BETA.muedlim.url,
    sha256: "6594238da928c3068ddd47508c9a375c9e303193a8bf88885eb36463e99e58d8",
    bytes: 1_110_522,
  },
  {
    name: "MUEDrive (Windows beta)",
    url: WINDOWS_BETA.muedrive.url,
    sha256: "4c691c4ecf17d3d81769acbda633ca08bcc4d40c91a13aec2b3ffc6f074ac4ec",
    bytes: 1_225_353,
  },
  ...(MASTERCHAIN_DOWNLOAD_URL && MASTERCHAIN_PIN
    ? [{ name: "masterchain", url: MASTERCHAIN_DOWNLOAD_URL, ...MASTERCHAIN_PIN }]
    : []),
];

/** public/ is the web root, so the URL pathname is the repo path under it. */
const localPathFor = (url: string) => join(process.cwd(), "public", new URL(url).pathname);

/**
 * ★The pairing rule, as a value rather than an assertion — so its RED lives IN this repo.
 *
 * ★WHY IT WAS EXTRACTED (CCO review of #992). Written as a bare assertion, this rule had a property
 * no other check here has: ★both halves are empty today, so ★only the passing branch ever executes,
 * and the branch that matters fires exactly once — ★on the day someone publishes. ★That day is the
 * worst possible time to discover the check itself was wrong, and nobody re-runs a control that was
 * driven by hand in a terminal months earlier. ([[feedback-make-it-show-up-not-remember-it]]; the
 * `positive-control-verify` skill calls this meta-RED, and says to make it permanent.)
 *
 * ★A pure function fixes that without mocking: the real constants go through the same predicate the
 * synthetic combinations do, so the publish-day path is executed on every CI run — today, with
 * fabricated inputs, months before it is needed. ★This repo has reached for the same shape three
 * times before (`actionFor`, `duplicateNames`, `mayRefetch`): a rule that lives only inside an `if`
 * is a rule tests cannot reach.
 */
export type PinVerdict = { ok: true } | { ok: false; reason: string };

export function masterchainPinVerdict(
  url: string,
  pin: { sha256: string; bytes: number } | null,
): PinVerdict {
  if (!url) {
    // ★A pin with nothing to download is not harmless: it reads as coverage while covering nothing.
    return pin === null
      ? { ok: true }
      : { ok: false, reason: "MASTERCHAIN_PIN is set but MASTERCHAIN_DOWNLOAD_URL is empty — a pin for a download nobody can reach" };
  }
  if (pin === null) {
    return {
      ok: false,
      reason:
        "MASTERCHAIN_DOWNLOAD_URL is set but MASTERCHAIN_PIN is null — the paid download would ship " +
        "with none of the checks the free modules have. Fill MASTERCHAIN_PIN from " +
        "`shasum -a 256 <pkg>` and `stat -f%z <pkg>`.",
    };
  }
  // ★Shape, not just presence: a pin that cannot be compared against is the same as no pin.
  if (!/^[0-9a-f]{64}$/.test(pin.sha256)) {
    return { ok: false, reason: `MASTERCHAIN_PIN.sha256 is not a 64-hex sha256: ${pin.sha256}` };
  }
  if (!Number.isInteger(pin.bytes) || pin.bytes <= 0) {
    return { ok: false, reason: `MASTERCHAIN_PIN.bytes must be a positive integer: ${pin.bytes}` };
  }
  return { ok: true };
}

describe("masterchain (paid) download pin", () => {
  it("★the repo's ACTUAL pairing is valid", () => {
    const v = masterchainPinVerdict(MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_PIN);
    expect(v.ok ? null : v.reason).toBeNull();
    // ★When both halves exist the entry must actually reach the table above, not merely exist as a
    //   constant — "the pairing is valid" and "the artifact is covered" are different claims.
    if (MASTERCHAIN_DOWNLOAD_URL && MASTERCHAIN_PIN) {
      expect(ARTIFACTS.map((a) => a.name)).toContain("masterchain");
    }
  });

  it("★★the publish-day RED runs TODAY — every branch, on fabricated inputs", () => {
    // ★These four are the controls that were previously driven by hand. Kept here, they re-run on
    //   every CI run instead of living in a terminal transcript nobody will open on publish day.
    const PIN = { sha256: "a".repeat(64), bytes: 3_584_446 };
    const URL = "https://mued.jp/downloads/MUEDsp-masterchain-1.0.0-installer.pkg";

    expect(masterchainPinVerdict("", null).ok).toBe(true); // today's state
    expect(masterchainPinVerdict(URL, PIN).ok).toBe(true); // published + pinned

    const urlOnly = masterchainPinVerdict(URL, null); // ★the publish-day mistake
    expect(urlOnly.ok).toBe(false);
    expect(urlOnly.ok === false && urlOnly.reason).toContain("shasum -a 256");

    const pinOnly = masterchainPinVerdict("", PIN); // ★the mirror
    expect(pinOnly.ok).toBe(false);
    expect(pinOnly.ok === false && pinOnly.reason).toContain("nobody can reach");

    // ★A pin that is present but unusable is not a pin. Both spellings of that.
    expect(masterchainPinVerdict(URL, { sha256: "abc", bytes: 1 }).ok).toBe(false);
    expect(masterchainPinVerdict(URL, { ...PIN, bytes: 0 }).ok).toBe(false);
  });

  it("★the free three stay covered regardless — this block never shrinks that table", () => {
    // ★Guards the edit that would quietly narrow the population while looking like a paid-line change.
    expect(ARTIFACTS.map((a) => a.name)).toEqual(
      expect.arrayContaining(["MUEDlim", "MUEDsat", "MUEDrive"]),
    );
    expect(ARTIFACTS.length).toBeGreaterThanOrEqual(3);
  });
});

describe.each(ARTIFACTS)("$name public download artifact", ({ url, sha256, bytes }) => {
  it("resolves to a repo-hosted /downloads file this gate can actually read", () => {
    expect(url).not.toBe(""); // a closed download must be a deliberate edit here, not a skip
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://mued.jp");
    expect(parsed.pathname.startsWith("/downloads/")).toBe(true);
    expect(existsSync(localPathFor(url))).toBe(true);
  });

  it("matches the pinned sha256 — an in-place swap flips this red", () => {
    const path = localPathFor(url);
    const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(digest).toBe(sha256);
    expect(statSync(path).size).toBe(bytes); // cheap second signal if the digest is ever edited to match
  });
});

/**
 * ★2026-08-27 (A') — the 0.1.0 filenames are compatibility ALIASES.
 *
 * 311 subscribers already hold emails containing the literal 0.1.0 URL, and sent mail cannot be
 * edited. Publishing 0.1.1 only under a new name would leave every one of them on the crashing
 * build, so the old names were overwritten with the 0.1.1 payload and kept as aliases.
 *
 * That decision creates an invariant the gate above does NOT cover: it derives its path from the
 * constant, and the constant now points at the 0.1.1 name — so the alias could drift back to a
 * stale build with every test still green. This block pins the invariant itself: alias bytes ===
 * canonical bytes. If a future swap updates only one of the two, this fails.
 */
const ALIASES = [
  { name: "MUEDsat", alias: "MUEDsat-0.1.0-alpha-installer.pkg", canonical: "MUEDsat-0.1.1-alpha-installer.pkg" },
  { name: "MUEDlim", alias: "MUEDlim-0.1.0-alpha-installer.pkg", canonical: "MUEDlim-0.1.1-alpha-installer.pkg" },
];

describe.each(ALIASES)("$name 0.1.0 compatibility alias", ({ alias, canonical }) => {
  it("is byte-identical to the canonical 0.1.1 artifact", () => {
    const dir = join(process.cwd(), "public", "downloads");
    const a = readFileSync(join(dir, alias));
    const c = readFileSync(join(dir, canonical));
    expect(createHash("sha256").update(a).digest("hex")).toBe(
      createHash("sha256").update(c).digest("hex")
    );
    expect(a.byteLength).toBe(c.byteLength);
  });
});
