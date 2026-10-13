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
//
// ★Read with fs at REQUEST time (the root layout makes every route dynamic), so next.config's
//   outputFileTracingIncludes for "/[locale]/licenses" is LOAD-BEARING — same as /learn.
import fs from "node:fs";
import path from "node:path";

export const LICENSE_PLUGINS = ["MUEDsp", "MUEDvox", "MUEDsat", "MUEDlim", "MUEDrive"] as const;
export type LicensePlugin = (typeof LICENSE_PLUGINS)[number];
export const LICENSE_KINDS = ["THIRD-PARTY-LICENSES.md", "FONT-LICENSES.md"] as const;
export type LicenseKind = (typeof LICENSE_KINDS)[number];

/** sha256 of each copy (THIRD-PARTY: dsp 4b331677 incl. the Windows-only parts; FONT: the 1.0.0 installer file). */
export const LICENSE_FILES: Record<LicensePlugin, Record<LicenseKind, string>> = {
  MUEDsp: {
    "THIRD-PARTY-LICENSES.md": "15da934102f8ce1d4f34da54b5c051b2f23228a0a64ef73f7a4855538d85611e",
    "FONT-LICENSES.md": "2d0f646b01f2469dd8bd79c48ec20032a796d58869ce36876293532025e0c497",
  },
  // ★MUEDvox (2026-10-13): copied from mued-vox main da9332e6 (#197), plugin/MUEDvox/resources/fonts/ — git blobs
  //   matched upstream. ★NOT yet compared with a shipped installer: no MUEDvox 1.0.0 package exists. Re-copy and
  //   re-pin from the package when it does. ★EULA 2026.10.1 Section 9 says WORLD's text is also at /licenses — so
  //   this section must be on the site BEFORE any package carrying that EULA is distributed.
  MUEDvox: {
    "THIRD-PARTY-LICENSES.md": "2a98ae5424bef0496b657fb814240a07bd40e738ecbcfd64574a784306bae831",
    "FONT-LICENSES.md": "033ef5368b06349f28b17191620ce92ef042ebf87c6a1839227609f667176912",
  },
  MUEDsat: {
    "THIRD-PARTY-LICENSES.md": "5d93fdbba454021966929a33d5fbd367111723f2b8f16a89e2ac696e6e65ffdd",
    "FONT-LICENSES.md": "7ccbb46aa40444f67ef4e9ce73be2919c66567c2fb68df167490229e7dab88da",
  },
  MUEDlim: {
    "THIRD-PARTY-LICENSES.md": "8042d8424517c6a4d2459111b5d11afdbff3845cf8f7e1745537d7b7b8871799",
    "FONT-LICENSES.md": "a1d334b428d724792b80c52fa0be346fd2de2e418a8459b2bf9eed037e2b67bf",
  },
  MUEDrive: {
    "THIRD-PARTY-LICENSES.md": "ae78bf8b135b23c62a9dbb41bb876ac27a09dd31f2ec161cf2029e3d1ecffba4",
    "FONT-LICENSES.md": "bfd0cc81e01540ee8d1eeb53d7dad7510d0d1fa1677e9ba874c40c0270bfea39",
  },
};

export const LICENSES_DIR = path.join(process.cwd(), "content", "licenses");

export function readLicense(plugin: LicensePlugin, kind: LicenseKind): string {
  return fs.readFileSync(path.join(LICENSES_DIR, plugin, kind), "utf8");
}
