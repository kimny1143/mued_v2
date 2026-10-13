//
// /licenses — the third-party software and font licenses shipped inside the MUEDsp plugins.
// EULA Section 9 links here (conductor 2026-09-30: 「第 9 条の [LINK] になる」).
//
// ★The .md files under content/licenses/<plugin>/ are COPIES. The source of truth is the dsp repo
//   (`plugin/<plugin>/resources/fonts/{THIRD-PARTY-LICENSES,FONT-LICENSES}.md`), and what ships is the
//   copy inside each installer. On 2026-09-30 the eight files were copied from dsp origin/main
//   (last change 01ef36d4, 2026-09-26) and matched, byte for byte, the files inside the four 1.0.0
//   .pkg (pkgutil --expand-full → shasum -a 256). LICENSE_FILES pins those hashes;
//   tests/unit/licenses-page.test.ts fails if a copy changes without the pin changing with it.
// ★2026-09-30 (EULA 2026.10, Section 9 lists the Windows-only parts): THIRD-PARTY-LICENSES.md was
//   re-copied from dsp's Windows branch commit 4b331677 (feat/win-vst3-ci = feat/win-drag-nowarp,
//   identical). It is the macOS 1.0.0 file plus sections marked "Windows only" (Khronos khrplatform.h,
//   glad GL2 loader) — additions only, nothing removed. FONT-LICENSES.md is unchanged (same bytes).
//   ★When dsp merges the Windows files to main or the shipped build changes, re-copy and re-pin.
// ★2026-10-13 (dsp #894, mued-dsp main 733a92be): the four THIRD-PARTY-LICENSES.md were re-copied (git show; blobs
//   matched upstream). dsp's audit of the five packages on the shelf found parts that are IN the binaries but
//   were missing from the notice files: MetalNanoVG (MIT, macOS), Destroy FX AU Utilities (BSD 3-Clause, macOS
//   AU), the Red Sweater text field cell (MIT, macOS), plus the notices iPlug2's own source carries. Additions
//   only — no line of the previous copies was removed (diff, 0 "<" lines each). FONT-LICENSES.md: unchanged.
//   ★So these copies are now AHEAD of the files inside the installers on the shelf (those still lack the
//   sections) — the page no longer says "the same as shipped". When the packages are rebuilt, compare again.
//   ★The page note says so in one sentence (kimny 2026-10-13, via conductor: 「残りも推奨通りでOK」 = write it):
//   「一部の節は、次の版のインストーラーから同梱されます。」 ★REMOVE that sentence (messages licenses.note, ja + en)
//   when the four products' 1.0.2 installers — the ones carrying these sections — are on the shelf.
//
// ★Read with fs at REQUEST time (the root layout makes every route dynamic), so next.config's
//   outputFileTracingIncludes for "/[locale]/licenses" is LOAD-BEARING — same as /learn.
import fs from "node:fs";
import path from "node:path";

export const LICENSE_PLUGINS = ["MUEDsp", "MUEDsat", "MUEDlim", "MUEDrive"] as const;
export type LicensePlugin = (typeof LICENSE_PLUGINS)[number];
export const LICENSE_KINDS = ["THIRD-PARTY-LICENSES.md", "FONT-LICENSES.md"] as const;
export type LicenseKind = (typeof LICENSE_KINDS)[number];

/** sha256 of each copy (THIRD-PARTY: mued-dsp main 733a92be, dsp #894; FONT: the 1.0.0 installer file). */
export const LICENSE_FILES: Record<LicensePlugin, Record<LicenseKind, string>> = {
  MUEDsp: {
    "THIRD-PARTY-LICENSES.md": "40190ea689b67cbc52eed0305f75e9b59e0017c6c585640692851683904fe2ad",
    "FONT-LICENSES.md": "2d0f646b01f2469dd8bd79c48ec20032a796d58869ce36876293532025e0c497",
  },
  MUEDsat: {
    "THIRD-PARTY-LICENSES.md": "0621828d905d45aa129dee2fdabe4dd99f5f634fd95952b093b1fecfb5cbf170",
    "FONT-LICENSES.md": "7ccbb46aa40444f67ef4e9ce73be2919c66567c2fb68df167490229e7dab88da",
  },
  MUEDlim: {
    "THIRD-PARTY-LICENSES.md": "cfc6dbcd6e2ebce1aad8d889917c48799057f9e5d98ec9b1a0a5286d0426d53e",
    "FONT-LICENSES.md": "a1d334b428d724792b80c52fa0be346fd2de2e418a8459b2bf9eed037e2b67bf",
  },
  MUEDrive: {
    "THIRD-PARTY-LICENSES.md": "49f4f6e587560222b871c491229c14b1fb114087fc6303cbe27792c3f05f58e2",
    "FONT-LICENSES.md": "bfd0cc81e01540ee8d1eeb53d7dad7510d0d1fa1677e9ba874c40c0270bfea39",
  },
};

export const LICENSES_DIR = path.join(process.cwd(), "content", "licenses");

export function readLicense(plugin: LicensePlugin, kind: LicenseKind): string {
  return fs.readFileSync(path.join(LICENSES_DIR, plugin, kind), "utf8");
}
