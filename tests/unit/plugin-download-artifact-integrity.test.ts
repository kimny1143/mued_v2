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
 * Pin provenance differs per artifact, and that difference is the honest limit of this gate:
 *   MUEDlim — full 64-char sha256 independently recorded in `lib/muedlim/config.ts:26` at the
 *             2026-07-27 3-format reopen. Measured bytes match it, so this is a real pin.
 *   MUEDsat — the repo records only the 8-char prefix `c1f11fa1…` (conductor-verified
 *             2026-07-09, `lib/muedsat/config.ts:32`). The measured bytes match that prefix;
 *             the remaining 56 chars are pinned from the 2026-07-29 measurement. So for
 *             MUEDsat this proves "matches the conductor-verified 32-bit prefix, and unchanged
 *             since 2026-07-29" — NOT "is byte-for-byte the build conductor signed off".
 *
 * Intentionally closing a download (emptying the URL) turns these red. That is the design:
 * a deliberate change should have to touch this file. Silence is the failure mode being fixed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MUEDLIM_DOWNLOAD_URL } from "@/lib/muedlim/config";
import { MUEDSAT_DOWNLOAD_URL } from "@/lib/muedsat/config";

const ARTIFACTS = [
  {
    name: "MUEDlim",
    url: MUEDLIM_DOWNLOAD_URL,
    sha256: "a832976a9fa4da91dc05b33f4f384c89731ac6598c82f1110e8bece80a807729",
    bytes: 3_191_130,
  },
  {
    name: "MUEDsat",
    url: MUEDSAT_DOWNLOAD_URL,
    sha256: "c1f11fa1350dcac521252011ddcc26f207df4d64d4208884306e45da328c0429",
    bytes: 4_038_915,
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
