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
import { MASTERCHAIN_WINDOWS_URL } from "@/lib/masterchain/config";

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
  // ★1.0.1 (2026-09-30, EULA 2026.10 inside). Measured on the COPY under public/downloads/, not on
  //   dsp's source and not from the relayed message — `shasum -a 256` / `stat -f%z`. conductor's
  //   declared sha256/bytes matched, and `cmp` against dsp's plugin/dist/ was byte-identical.
  //   (1.0.0 was 07607ba9…/4_280_176; 0.1.3 was d9c21c25…/4_133_469 — both stay on the shelf.)
  // ★1.0.1 key-entry rebuild (2026-10-01, /downloads/keyentry-2026.10/・dsp #854): matched conductor's relay
  //   (`shasum -a 256` / `stat -f%z`) + cmp to dsp's plugin/dist/. The ui-2026.10 build (b9fef6da…/4_296_252) and
  //   the first 1.0.1 (e4846886…/4_276_006) are pinned below as shelf entries.
  sha256: "2a800e04fe5bee6d992e39db4a8cad15550107d47cde3b1b7994f5b2b3817d51",
  bytes: 4_321_171,
};

const ARTIFACTS = [
  {
    name: "MUEDlim",
    url: MUEDLIM_DOWNLOAD_URL,
    // 1.0.0, EULA 2026.10 rebuild (/downloads/eula-2026.10/). The first 1.0.0 is pinned as a shelf entry below.
    sha256: "123bb9994e7ea85099778603484576200cddf017c82802b92935c4d8758bb7c7",
    bytes: 3_269_395,
  },
  {
    name: "MUEDsat",
    url: MUEDSAT_DOWNLOAD_URL,
    // 1.0.1 (2026-10-01, /downloads/): matched dsp's relay + cmp to dsp's plugin/dist/. The 1.0.0 builds are
    //   pinned as shelf entries below.
    sha256: "39596b0a813a3ded383f900e29f682d32810ec76af9121c65cbc76c848f6a066",
    bytes: 3_425_562,
  },
  // ★Shelf: MUEDsat 1.0.0, EULA 2026.10 rebuild — the download until 2026-10-01; mail sent in that window points here.
  {
    name: "MUEDsat 1.0.0 (eula-2026.10, shelf)",
    url: "https://mued.jp/downloads/eula-2026.10/MUEDsat-1.0.0-installer.pkg",
    sha256: "9871b6071ddb7b522162000bcd28d1b6993c5ccfcb88a04744c1d0d27b8b4dc8",
    bytes: 3_417_085,
  },
  {
    name: "MUEDrive",
    url: MUEDRIVE_DOWNLOAD_URL,
    // 1.0.1 CHARACTER rebuild (2026-10-01, /downloads/character-2026.10/): matched dsp's relay + cmp to dsp's
    //   plugin/dist/. The first 1.0.1 (75bf0dcc…/3_616_696) is pinned below as a shelf entry; 1.0.0 was 1f3fc091….
    sha256: "c3fb7d164ab9907490ef03633757e35400d0acc3d5f49c59fe74be407b36f8f4",
    bytes: 3_619_132,
  },
  // ★Shelf: the first MUEDrive 1.0.1 (2026-09-30 → 2026-10-01). Same name and version as the current one; mail
  //   sent in that window points here. Told apart by sha256.
  {
    name: "MUEDrive 1.0.1 (first build, shelf)",
    url: "https://mued.jp/downloads/MUEDrive-1.0.1-installer.pkg",
    sha256: "75bf0dcc1457559a35fbda9b55ae74c318f51dca754767863d0c080481a40fd4",
    bytes: 3_616_696,
  },
  // ★Windows VST3 beta — 7ca36065 (dsp 2026-10-01, the zips kimny ran in Parallels). Measured on the copies under
  //   public/downloads/: shasum -a 256 + bytes matched dsp's relay, cmp-identical to dsp's files AND to the copy
  //   kimny tested (_[MUED]fileshare/_win-check-20261001b).
  {
    name: "MUEDsat (Windows beta)",
    url: WINDOWS_BETA.muedsat.url,
    sha256: "c7c46e065f2f35fe7d9b40ffb46d48c59f68546d926ccf63c28626baf097e128",
    bytes: 1_210_634,
  },
  {
    name: "MUEDlim (Windows beta)",
    url: WINDOWS_BETA.muedlim.url,
    sha256: "cff3ab78931d2639e4e230b7530336ca4976d32555c99decaa2c06681b65f09e",
    bytes: 1_136_734,
  },
  {
    name: "MUEDrive (Windows beta)",
    url: WINDOWS_BETA.muedrive.url,
    sha256: "96009dae19a384c96b41864fc209db145ac4f16c30a977672c82cebd0e848f7b",
    bytes: 1_252_194,
  },
  // ★masterchain for Windows (VST3) — a2678157 (dsp 2026-10-01, PLUG_HOST_RESIZE 0; the build kimny accepted).
  {
    name: "masterchain (Windows)",
    url: MASTERCHAIN_WINDOWS_URL,
    sha256: "af9dfe0424105a79171bedcdecabe8dc2bba6f25662f1240d369b32479535d29",
    bytes: 1_416_745,
  },
  // ★Shelf: the first Windows beta zips (dsp build/win-beta-20260930b, 80178027). Never linked (the flag was off
  //   while they were the table's), but public under these URLs since 2026-09-30 — so their bytes stay fixed.
  {
    name: "MUEDsat (Windows beta 80178027, shelf)",
    url: "https://mued.jp/downloads/MUEDsat-1.0.0-win-x64-80178027.zip",
    sha256: "1b85e2df84c2371f03b7e6532f97d8707fce557076d23962953f22d3cdb7b4ce",
    bytes: 1_188_719,
  },
  {
    name: "MUEDlim (Windows beta 80178027, shelf)",
    url: "https://mued.jp/downloads/MUEDlim-1.0.0-win-x64-80178027.zip",
    sha256: "6594238da928c3068ddd47508c9a375c9e303193a8bf88885eb36463e99e58d8",
    bytes: 1_110_522,
  },
  {
    name: "MUEDrive (Windows beta 80178027, shelf)",
    url: "https://mued.jp/downloads/MUEDrive-1.0.1-win-x64-80178027.zip",
    sha256: "4c691c4ecf17d3d81769acbda633ca08bcc4d40c91a13aec2b3ffc6f074ac4ec",
    bytes: 1_225_353,
  },
  // ★Shelf: the masterchain 1.0.1 UI rebuild (2026-09-30 night → 2026-10-01). Demo mails and purchases in that
  //   window point here (the confirmation purchase of 10/1 included).
  {
    name: "masterchain 1.0.1 (ui-2026.10, shelf)",
    url: "https://mued.jp/downloads/ui-2026.10/MUEDsp-masterchain-1.0.1-installer.pkg",
    sha256: "b9fef6da4d5c11a990d358248308fc5b7c95c9b1b67e43e7334150cdbd4791d6",
    bytes: 4_296_252,
  },
  // ★Shelf: the first masterchain 1.0.1 (before tonight's UI rebuild). Demo mails sent before the swap point here.
  {
    name: "masterchain 1.0.1 (first build, shelf)",
    url: "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-installer.pkg",
    sha256: "e484688613197dc26d40cca3ca1c6c2e69608e575600254c1bb47c7bc8fa3fb0",
    bytes: 4_276_006,
  },
  // ★Shelf: the first 1.0.0 builds (EULA 2026.09). No constant points here any more, but the launch
  //   mail of 2026-09-30 does — so the bytes behind these URLs must not change (kimny 9/30: published
  //   versions stay available).
  {
    name: "MUEDlim 1.0.0 (first build, shelf)",
    url: "https://mued.jp/downloads/MUEDlim-1.0.0-installer.pkg",
    sha256: "e71952251543959bb156f81611b1a5c40834699add4a5a2b687c35dce5600ad3",
    bytes: 3_272_834,
  },
  {
    name: "MUEDsat 1.0.0 (first build, shelf)",
    url: "https://mued.jp/downloads/MUEDsat-1.0.0-installer.pkg",
    sha256: "e36fd15220290c7d9b8faf51574711263df73321a26360533b8a6a7e876c89ff",
    bytes: 3_420_493,
  },
  // ★Present only once BOTH the URL and the pin exist — so the same two tests below start covering
  //   the paid artifact the moment it is published, with no separate wiring to remember.
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
