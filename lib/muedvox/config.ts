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

/**
 * The messages a layout hands to the browser (NextIntlClientProvider serialises ALL of them into every page).
 * ★Before LIVE the `muedvox` namespace is left out: the page answering 404 does not keep its copy private while
 *   the same words — price, modes, latency figures not yet checked against the release build — ride along in the
 *   HTML of every other page (measured on production 2026-10-13: /ja, /ja/muedsp, /en/eula, /ja/tokushoho each
 *   carried the whole namespace). Same condition as the page itself, so preview and local dev still get it.
 * ★The MUEDvox page reads its words on the server, so it does not need them in this payload.
 * ★This covers the HTML. The JS chunks are covered by where the words live: messages/muedvox.<locale>.json,
 *   imported only by lib/i18n/request.ts (server) — not messages/{en,ja}.json, which client modules import whole.
 */
export function clientMessages<T extends Record<string, unknown>>(
  messages: T,
  visible: boolean = muedvoxPageVisible(MUEDVOX_LIVE, process.env.VERCEL_ENV, process.env.NODE_ENV),
): T {
  if (visible || !("muedvox" in messages)) return messages;
  const { muedvox: _unreleased, ...rest } = messages;
  void _unreleased;
  return rest as T;
}

/**
 * ★What must be true together on launch day, as one checked list rather than a remembered order. Each line is a
 * way to open something that cannot work: a Buy button whose cart cannot check out, a purchase mail with no
 * download, a demo form that "starts" a download of nothing, client components whose words never reach the
 * browser. Returns the problems (empty = consistent). tests/unit/muedvox-launch-gates.test.ts runs it on the
 * real values, so a half-flipped launch PR fails CI instead of production.
 */
export function muedvoxLaunchProblems(state: {
  live: boolean; purchaseLive: boolean; demoLive: boolean;
  downloadUrl: string; windowsUrl: string; windowsVersion: string; screenshot: string;
  /** PAID_PRODUCTS.muedvox.enabled — the webhook issues a key only then. */
  productEnabled: boolean;
}): string[] {
  const problems: string[] = [];
  const need = (ok: boolean, message: string) => { if (!ok) problems.push(message); };
  if (state.purchaseLive) {
    need(state.live, "PURCHASE_LIVE needs LIVE: the page is 404 and the cart's words are not sent to the browser");
    need(state.productEnabled, "PURCHASE_LIVE needs PAID_PRODUCTS.muedvox.enabled: the order would be paid and get no key");
    need(state.downloadUrl !== "", "PURCHASE_LIVE needs MUEDVOX_DOWNLOAD_URL: the purchase mail and the portal would have no installer");
    need(state.screenshot !== "", "PURCHASE_LIVE needs MUEDVOX_SCREENSHOT: the cart shows the product's own screen");
  }
  if (state.demoLive) {
    need(state.live, "DEMO_LIVE needs LIVE: the page is 404 and the form's words are not sent to the browser");
    need(state.downloadUrl !== "", "DEMO_LIVE needs MUEDVOX_DOWNLOAD_URL: the demo is that installer without a key");
    // ★The demo's receipt says "you can buy it from the product page" and links there (CCO #1272): a demo open
    //   while buying is closed would send people to a page with no Buy button.
    need(state.purchaseLive, "DEMO_LIVE needs PURCHASE_LIVE: the demo receipt tells people they can buy from the product page");
  }
  // ★Enabled without the button is allowed on purpose: the launch order is "enable + deploy, THEN publish the
  //   store" (docs/paid-line/c9 §3.4) — but an enabled product must be able to deliver.
  if (state.productEnabled) need(state.downloadUrl !== "", "an enabled product needs MUEDVOX_DOWNLOAD_URL: a buyer's mail would promise the link by reply");
  need((state.windowsUrl === "") === (state.windowsVersion === ""), "MUEDVOX_WINDOWS_URL and MUEDVOX_WINDOWS_VERSION are set together or not at all");
  need(state.windowsUrl === "" || state.downloadUrl !== "", "a Windows zip without the Mac installer: the mails link the Mac package first");
  return problems;
}

// Set at launch with the sha256/bytes pin, like masterchain.
export const MUEDVOX_DOWNLOAD_URL = "";
export const MUEDVOX_WINDOWS_URL = "";
export const MUEDVOX_WINDOWS_VERSION = "";
