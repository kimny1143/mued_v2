//
// Windows VST3 beta of the three free plugins (kimny-approved beta window 2026-10-01 – 10-03).
//
// ★Served ONLY on the user portal, next to the Mac download — never as a direct link on /muedsp
//   (conductor 2026-09-30, option (b)). The free plugins are exchanged for the email sign-up; the
//   North Star (reachable subscribers, consent-only since #1166) and the 5,000 target (kimny 9/29)
//   rest on that, so the beta does not open a way around it. /muedsp#windows carries the install
//   steps only.
//
// ★A reviewed code change, never an env switch. Flip WINDOWS_BETA_LIVE on conductor's signal.
//   While false, the portal shows no Windows link and /muedsp#windows keeps the "coming" copy.
//   (The files themselves sit under public/downloads/ like every .pkg — a static URL is not a gate;
//   the flag controls where the link is shown.)
//
// ★Zips from dsp's build/win-beta-20260930b (INSTALL.txt-only rebuild; the plug-in binaries are the
//   bytes kimny ran in Parallels). Each contains the .vst3 folder, EULA.txt (2026.10),
//   THIRD-PARTY-LICENSES.md, FONT-LICENSES.md and INSTALL.txt. Unsigned beta builds.
//   Measured 2026-09-30 on the copies under public/downloads/: sha256 + bytes matched conductor's
//   relay and `cmp` against dsp's files was byte-identical. Pins: tests/unit/plugin-download-artifact-integrity.test.ts.
import type { PluginKey } from "@/lib/plugins/registry";

// ★OPENED 2026-10-01 (kimny 「いまやればいいじゃん、ぜんぶ。」・conductor's signal; kimny ran the 7ca36065 zips in
//   Parallels — all three fine, MUEDrive's CHARACTER fix included).
export const WINDOWS_BETA_LIVE = true;

export interface WindowsBetaBuild {
  url: string;
  version: string;
}

export const WINDOWS_BETA: Record<PluginKey, WindowsBetaBuild> = {
  // ★7ca36065 (dsp build 2026-10-01, from the GitHub CI artifact): MUEDsat 1.0.1 (same code as the Mac 1.0.1),
  //   MUEDrive 1.0.1 with the CHARACTER knob fix, MUEDlim 1.0.0. The 80178027 zips stay on the shelf (pinned).
  muedsat: { url: "https://mued.jp/downloads/MUEDsat-1.0.1-win-x64-7ca36065.zip", version: "1.0.1" },
  // ★3b853018 (dsp #888, mued-dsp main 27284478, 2026-10-09): MUEDlim 1.0.1. The 7ca36065 zip is the portal's
  //   "previous version" (lib/plugins/previous-versions.ts).
  muedlim: { url: "https://mued.jp/downloads/MUEDlim-1.0.1-win-x64-3b853018.zip", version: "1.0.1" },
  muedrive: { url: "https://mued.jp/downloads/MUEDrive-1.0.1-win-x64-7ca36065.zip", version: "1.0.1" },
};

/** The Windows build to show on a portal row — null while the beta is not live or for an unknown key. */
export function windowsBetaFor(pluginKey: string, live: boolean = WINDOWS_BETA_LIVE): WindowsBetaBuild | null {
  if (!live) return null;
  return WINDOWS_BETA[pluginKey as PluginKey] ?? null;
}

/**
 * masterchain for Windows on a buyer's portal row — null until MASTERCHAIN_WINDOWS_LIVE and a URL are set.
 */
export function masterchainWindowsBuild(live: boolean, url: string, version: string): WindowsBetaBuild | null {
  return live && url ? { url, version } : null;
}

/**
 * The operating systems a free plugin page claims (JSON-LD `operatingSystem`). macOS only until the beta is live.
 */
export function freePluginOperatingSystem(live: boolean = WINDOWS_BETA_LIVE): string {
  return live ? "macOS, Windows" : "macOS";
}

/**
 * A free plugin's meta description, with the Windows sentence appended only while the beta is live. ★While it
 * is not, this returns the description unchanged — the pages read exactly as before (tests/unit/windows-launch-prep).
 */
export function withWindowsSentence(description: string, windowsSentence: string, live: boolean = WINDOWS_BETA_LIVE): string {
  return live ? `${description} ${windowsSentence}` : description;
}
