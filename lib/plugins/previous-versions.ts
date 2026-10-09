//
// A previous build of a free plugin that stays downloadable next to the current one.
//
// ★Why (kimny 2026-10-09): 「既存バージョンのインストーラは維持しておきましょう。そして MUEDlim の新バージョンでは
//   既存セッションの値が変わることを告知やダウンロードページで明記すること」. A new build can change what an
//   existing session plays back; the person who needs the old sound back must be able to get the old
//   installer from the same shelf, and must be told what changed before they take the new one.
//
// ★Shown on the user portal only, like every direct file link (the free plugins are exchanged for the
//   email sign-up — see lib/plugins/windows-beta.ts). The public product page carries the notice text and
//   a link to the portal, never the file.
//
// ★A plugin with no entry here renders exactly as before: no "previous version" row, no notice.
//   The files themselves are never removed or overwritten (W0b) — an entry only decides where a link shows.
//
// CLIENT-SAFE: URLs and versions only.
import type { PluginKey } from "@/lib/plugins/registry";

export interface PreviousVersion {
  /** Plain semver of the kept build, as shown on screen. */
  version: string;
  /** Mac installer (.pkg) of that build. */
  macUrl: string;
  /** Windows build (.zip) of that build — null when that version had none. */
  windowsUrl: string | null;
  /**
   * The current version this entry sits next to. ★The entry is shown only while the registry's current
   * version equals this — so it cannot linger beside a later build whose notice was never written
   * (tests/unit/plugin-previous-version.test.tsx pins the pairing).
   */
  besideVersion: string;
}

export const PREVIOUS_VERSIONS: Partial<Record<PluginKey, PreviousVersion>> = {
  // MUEDlim 1.0.1 widened CEILING (−3..0 → −18..0 dBTP): CEILING automation written with 1.0.0 in VST3 / AAX
  // plays back lower. The text is messages/*.json `muedlim.versionNotice` + `pluginPortal.changes.muedlim`.
  muedlim: {
    version: "1.0.0",
    macUrl: "https://mued.jp/downloads/eula-2026.10/MUEDlim-1.0.0-installer.pkg",
    windowsUrl: "https://mued.jp/downloads/MUEDlim-1.0.0-win-x64-7ca36065.zip",
    besideVersion: "1.0.1",
  },
};

/** The kept previous build to show beside `currentVersion` of `pluginKey` — null when there is none. */
export function previousVersionFor(
  pluginKey: string,
  currentVersion: string,
  table: Partial<Record<string, PreviousVersion>> = PREVIOUS_VERSIONS,
): PreviousVersion | null {
  const entry = table[pluginKey];
  if (!entry || entry.besideVersion !== currentVersion) return null;
  return entry;
}
