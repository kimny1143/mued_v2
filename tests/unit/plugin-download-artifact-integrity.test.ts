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

import { MUEDLIM_DOWNLOAD_URL } from "@/lib/muedlim/config";
import { MUEDRIVE_DOWNLOAD_URL } from "@/lib/muedrive/config";
import { MUEDSAT_DOWNLOAD_URL } from "@/lib/muedsat/config";

const ARTIFACTS = [
  {
    name: "MUEDlim",
    url: MUEDLIM_DOWNLOAD_URL,
    sha256: "dc51d7cbc23ab56f540ba43bbafbd362bbfa69f801b051c8c2602f110c437bc5",
    bytes: 3_238_046,
  },
  {
    name: "MUEDsat",
    url: MUEDSAT_DOWNLOAD_URL,
    sha256: "b3ac87fc4a789660c398421fe64a2f5a34e78d8c2c263e28c4d3a439ad332d0c",
    bytes: 3_405_698,
  },
  {
    name: "MUEDrive",
    url: MUEDRIVE_DOWNLOAD_URL,
    sha256: "42aa60274bd828b02eab402a63dde3ab0c32589f17e3ad4c8cf00077d50e2d13",
    bytes: 3_590_153,
  },
];

/** public/ is the web root, so the URL pathname is the repo path under it. */
const localPathFor = (url: string) => join(process.cwd(), "public", new URL(url).pathname);

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
