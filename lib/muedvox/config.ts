// MUEDvox — staged until kimny’s go: noindex, not in sitemap, no buy/demo.
// Flip publication and distribution flags only after the release assets are ready.
// ★PURCHASE_LIVE / DEMO_LIVE render text only — the buy button and the demo gate are not built yet (PR-C,
//   docs/paid-line/c9-multi-product-paid-line-design.md). Do not flip them before PR-C lands.
export const MUEDVOX_LIVE = false;
export const MUEDVOX_PURCHASE_LIVE = false;
export const MUEDVOX_DEMO_LIVE = false;
export const MUEDVOX_SCREENSHOT = "";
export const MUEDVOX_AUDIO_EXAMPLES: ReadonlyArray<{ label: string; before: string; after: string }> = [];
