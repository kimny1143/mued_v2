// Which demo download to start, and which to offer as the alternative (conductor 2026-10-01).
//
// ★While there is no Windows build (MASTERCHAIN_WINDOWS_LIVE false → no Windows URL) this is exactly the old
//   behaviour: start the Mac download, offer nothing else.
// ★With both: start the one for the visitor's OS and offer the other as a link. When the OS cannot be told,
//   start nothing and show both side by side — a wrong automatic download is worse than one more click.

export type DemoOs = "mac" | "windows" | "unknown";

export interface DemoDownloadPlan {
  /** Start this download right away (null = do not start one; the visitor picks). */
  start: string | null;
  /** Links to show after the start (the other OS, or both when the OS is unknown). */
  offer: { os: "mac" | "windows"; url: string }[];
}

/** The visitor's OS from what the browser reports. `platform` is navigator.userAgentData?.platform when present. */
export function detectDemoOs(nav: { platform?: string | null; userAgent?: string | null; maxTouchPoints?: number | null }): DemoOs {
  const p = `${nav.platform ?? ""} ${nav.userAgent ?? ""}`;
  // iPhone/iPad cannot run a desktop plug-in — treat as unknown (both links, nothing started).
  if (/iPhone|iPad|iPod|Android/i.test(p)) return "unknown";
  // ★iPadOS Safari asks for the desktop site and reports "Macintosh" (CCO #1200). A "Mac" with a touch screen is
  //   an iPad — Macs report 0 touch points.
  if (/mac/i.test(p) && (nav.maxTouchPoints ?? 0) > 1) return "unknown";
  if (/Windows|Win64|Win32/i.test(p)) return "windows";
  if (/mac/i.test(p)) return "mac";
  return "unknown";
}

export function planDemoDownload(os: DemoOs, macUrl: string, windowsUrl: string | null | undefined): DemoDownloadPlan {
  if (!windowsUrl) return { start: macUrl, offer: [] };
  if (os === "mac") return { start: macUrl, offer: [{ os: "windows", url: windowsUrl }] };
  if (os === "windows") return { start: windowsUrl, offer: [{ os: "mac", url: macUrl }] };
  return { start: null, offer: [{ os: "mac", url: macUrl }, { os: "windows", url: windowsUrl }] };
}
