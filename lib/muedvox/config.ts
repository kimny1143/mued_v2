// MUEDvox — staged until kimny’s go: noindex, not in sitemap, no buy/demo.
// Flip publication and distribution flags only after the release assets are ready.
// ★PURCHASE_LIVE / DEMO_LIVE render text only — the buy button and the demo gate are not built yet (PR-C,
//   docs/paid-line/c9-multi-product-paid-line-design.md). Do not flip them before PR-C lands.
export const MUEDVOX_LIVE = false;
export const MUEDVOX_PURCHASE_LIVE = false;
export const MUEDVOX_DEMO_LIVE = false;
export const MUEDVOX_SCREENSHOT = "";
export const MUEDVOX_AUDIO_EXAMPLES: ReadonlyArray<{ label: string; before: string; after: string }> = [];

/**
 * ★Whether the page may render at all (CCO #1216). Before LIVE, production answers 404 — noindex alone
 * leaves mued.jp/en/muedvox readable by anyone with the URL, so values not yet checked against the
 * release build (latency, formats) would already be public. Vercel preview and local dev still render it.
 */
export function muedvoxPageVisible(live: boolean, vercelEnv: string | undefined, nodeEnv: string | undefined): boolean {
  // ★Fail-CLOSED (CCO #1216): render before LIVE only on a Vercel preview or in local `next dev` — a missing
  //   VERCEL_ENV (or any other value) answers 404 rather than publishing.
  return live || vercelEnv === "preview" || nodeEnv === "development";
}

// Set at launch with the sha256/bytes pin, like masterchain.
export const MUEDVOX_DOWNLOAD_URL = "";
export const MUEDVOX_WINDOWS_URL = "";
export const MUEDVOX_WINDOWS_VERSION = "";
