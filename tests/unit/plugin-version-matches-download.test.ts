/**
 * Unit — the version the portal SHOWS must be the version the download URL SERVES.
 *
 * ## Why this exists
 *
 * `PluginDist.version` is documented, in lib/plugins/registry.ts, as "updated with downloadUrl in the
 * same PR". ★That rule was only a comment, and on 2026-09-13 an order to ship the 0.1.2 builds named
 * the URL, the file and the sha pin — and not the version. ★Had it landed as written, the portal would
 * have said "0.1.1" while serving 0.1.2, and nothing would have gone red: both constants are valid
 * strings, and no check compared them.
 *
 * ★The same fact lives in two constants (`*_DOWNLOAD_URL` and `*_VERSION`), so they WILL drift again.
 * This test is what makes the comment's rule enforced instead of remembered.
 *
 * ★It reads PLUGIN_DIST — what the portal renders — rather than the config constants, so it checks the
 * value users see, not a proxy for it.
 */
import { describe, it, expect } from "vitest";
import { PLUGIN_DIST } from "@/lib/plugins/registry";

/** "…/MUEDlim-0.1.1-alpha-installer.pkg" → "0.1.1". Null when the filename carries no version. */
function versionInUrl(url: string): string | null {
  const m = new URL(url).pathname.match(/-(\d+\.\d+\.\d+)(?:-[a-z]+)?-installer\.pkg$/);
  return m ? m[1] : null;
}

describe("plugin portal version ⇔ download URL", () => {
  it("★★every live download's version matches the version the portal displays", () => {
    const checked: string[] = [];
    for (const dist of Object.values(PLUGIN_DIST)) {
      if (!dist.downloadUrl) continue; // not yet live — nothing is served, nothing to disagree with
      const served = versionInUrl(dist.downloadUrl);
      // ★A URL we cannot read a version from is a failure, not a skip: silently skipping it is exactly
      //   how this guard would stop guarding the day the naming scheme changes.
      expect(served, `${dist.key}: no version readable from ${dist.downloadUrl}`).not.toBeNull();
      // ★Compare the semver core. The shelf uses "-alpha" in some filenames while the displayed version
      //   is the bare "0.1.1"; that suffix is naming, not a different build.
      expect(dist.version.replace(/-[a-z]+$/, ""), `${dist.key}: portal shows ${dist.version}, URL serves ${served}`).toBe(
        served,
      );
      checked.push(dist.key);
    }
    // ★Population guard. If every entry were skipped (all URLs emptied, or PLUGIN_DIST reshaped), the
    //   loop above would assert nothing and pass. The three free plugins are live today.
    expect(checked.length, `checked: ${checked.join(", ")}`).toBeGreaterThanOrEqual(3);
  });

  it("★positive control — the parser reads a version from the real filename shapes on the shelf", () => {
    // ★Without this, a regex that never matches would make the test above fail on every URL — which
    //   is loud, not silent, but it would also make a real mismatch indistinguishable from a broken
    //   parser. Pin the parser separately.
    expect(versionInUrl("https://mued.jp/downloads/MUEDlim-0.1.1-alpha-installer.pkg")).toBe("0.1.1");
    expect(versionInUrl("https://mued.jp/downloads/MUEDrive-0.1.0-alpha-installer.pkg")).toBe("0.1.0");
    expect(versionInUrl("https://mued.jp/downloads/MUEDsat-0.1.2-installer.pkg")).toBe("0.1.2");
    expect(versionInUrl("https://mued.jp/downloads/no-version-here.pkg")).toBeNull();
  });
});
