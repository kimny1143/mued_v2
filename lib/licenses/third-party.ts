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
// ★When dsp adds components (Windows: khrplatform.h, glad), re-copy from the build that ships them
//   and update the pins in the same PR.
//
// ★Read with fs at REQUEST time (the root layout makes every route dynamic), so next.config's
//   outputFileTracingIncludes for "/[locale]/licenses" is LOAD-BEARING — same as /learn.
import fs from "node:fs";
import path from "node:path";

export const LICENSE_PLUGINS = ["MUEDsp", "MUEDsat", "MUEDlim", "MUEDrive"] as const;
export type LicensePlugin = (typeof LICENSE_PLUGINS)[number];
export const LICENSE_KINDS = ["THIRD-PARTY-LICENSES.md", "FONT-LICENSES.md"] as const;
export type LicenseKind = (typeof LICENSE_KINDS)[number];

/** sha256 of each copy (= the file inside the 1.0.0 installer, measured 2026-09-30). */
export const LICENSE_FILES: Record<LicensePlugin, Record<LicenseKind, string>> = {
  MUEDsp: {
    "THIRD-PARTY-LICENSES.md": "5636219c2322bf882c62665324f245add9a19700d4ee244f680006487868b4d8",
    "FONT-LICENSES.md": "2d0f646b01f2469dd8bd79c48ec20032a796d58869ce36876293532025e0c497",
  },
  MUEDsat: {
    "THIRD-PARTY-LICENSES.md": "80e3d2fb5348f46440f1ae6314e4e496f016c4a56df03aa1c22fe5224f779a1b",
    "FONT-LICENSES.md": "7ccbb46aa40444f67ef4e9ce73be2919c66567c2fb68df167490229e7dab88da",
  },
  MUEDlim: {
    "THIRD-PARTY-LICENSES.md": "0507ab15b5d2dede0257ed375491e15fd4af7198e8735a12827509587fb08cb4",
    "FONT-LICENSES.md": "a1d334b428d724792b80c52fa0be346fd2de2e418a8459b2bf9eed037e2b67bf",
  },
  MUEDrive: {
    "THIRD-PARTY-LICENSES.md": "8dbe03b5c6dd070342053102ecc367d6c15db03d864aeaf7521f68e8ee29d53d",
    "FONT-LICENSES.md": "bfd0cc81e01540ee8d1eeb53d7dad7510d0d1fa1677e9ba874c40c0270bfea39",
  },
};

export const LICENSES_DIR = path.join(process.cwd(), "content", "licenses");

export function readLicense(plugin: LicensePlugin, kind: LicenseKind): string {
  return fs.readFileSync(path.join(LICENSES_DIR, plugin, kind), "utf8");
}
