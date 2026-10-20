// MUEDvox — LIVE since 2026-10-13 (kimny, in the MUED window: 「MUEDvox を今夜開ける。」). The page is indexed, Buy and
// the demo are open, and the webhook issues keys (PAID_PRODUCTS.muedvox.enabled).
// ★To close Buy in a hurry, set MUEDVOX_PURCHASE_LIVE and MUEDVOX_DEMO_LIVE to false together
//   (muedvoxLaunchProblems: the demo's receipt sends people to the Buy button).
// ★The announcement is later (about a week): the link from /muedsp and the llms.txt line are NOT in yet.
export const MUEDVOX_LIVE = true;
export const MUEDVOX_PURCHASE_LIVE = true;
export const MUEDVOX_DEMO_LIVE = true;
// The HARMONY page of 1.0.2, LICENSED, Natural (VOX 2026-10-16, conductor (a)): the gear (SETTINGS) at the top right,
// as the 1.0.2 manual says. MUEDvox-1.0.2-harmony-2400x1800.png sha256 e36ab8e2…93aa → cwebp -q 90 (2400×1800,
// e767bf4d…c53c). The 1.0.0 screen (SETTINGS at the bottom left) stays in public/muedvox/, unlinked.
export const MUEDVOX_SCREENSHOT: string = "/muedvox/MUEDvox-1.0.2-harmony.webp";
// The listening examples on the page (kimny 2026-10-14: two songs, vocal +4 dB — 001 is 20 s, 003 is 26.3 s, cut by kimny:
//   「これでお願い」). The songs differ in length; the four takes of one song do not.
// ★The songs and their files are this list and nothing else: to swap a file, re-encode it under the same name
//   (scripts/muedvox/encode-lp-audio.sh <folder of wavs>); to add or drop a song, add or drop a row.
// Four takes per song, same length and same start: the mix and the vocal alone, each before and after MUEDvox.
// Source: lp/audio-final-20261014-rev4/*.wav (48 kHz 24 bit) → mp3 192 kbps CBR.
// ★The song names stay off the page (kimny 2026-10-14: 「サンプルの曲名は伏せましょう。Sample #1 #2」): the title is
//   what is shown and read aloud, the same in ja and en; the files carry only the number.
export type MuedvoxAudioTake = "mix_before" | "mix_after" | "vocal_before" | "vocal_after";
export type MuedvoxAudioExample = { id: string; title: string; files: Record<MuedvoxAudioTake, string> };
const audioExample = (id: string, title: string): MuedvoxAudioExample => ({
  id,
  title,
  files: {
    mix_before: `/muedvox/audio/${id}_mix_before.mp3`,
    mix_after: `/muedvox/audio/${id}_mix_after.mp3`,
    vocal_before: `/muedvox/audio/${id}_vocal_before.mp3`,
    vocal_after: `/muedvox/audio/${id}_vocal_after.mp3`,
  },
});
export const MUEDVOX_AUDIO_EXAMPLES: ReadonlyArray<MuedvoxAudioExample> = [
  audioExample("001", "Sample #1"),
  audioExample("003", "Sample #2"),
];

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

// 1.1.0 (VOX 2026-10-20, D9 all OK: signature, pkg, MIDI placement in Pro Tools and Logic, Windows): Save MIDI…
// writes the harmony parts as a Standard MIDI File (licensed only; greyed out in the demo). The pkg is
// build/dist-1.1.0 (signed, notarised); the zip is run 39347284671 on mued-vox main 0580272a, unsigned, VST3 x64.
// Both carry EULA 2026.10.3 (Section 6: the demo cannot write MIDI). Publishing is kimny's call (the merge).
// ★1.0.2 stays on the shelf under its own URLs, unlinked (plugin-download-retention).
// 1.0.2 (VOX 2026-10-17 「1.0.2 ready」): the 1.0.1 demo, plus SETTINGS moved to a gear at the top right, left of
// ACTIVE (mued-vox #221・#222 eaf37abe). The pkg is build/dist-1.0.2 (notarised, stapled, EULA 2026.10.2 inside);
// the zip is run 38982961640 on mued-vox 1256e08d (= eaf37abe + one docs commit), unsigned, EULA.txt 2026.10.2.
// ★1.0.1 was never distributed (conductor 2026-10-16: straight to 1.0.2). Its pkg and zip stay on the shelf,
//   unlinked: the URL was in this branch's history, so plugin-download-retention keeps them.
// 1.0.1 (VOX 2026-10-15): only the demo changed — no time limit, the harmony drops out for about 3 s every 45 s of
// sound while the lead keeps playing, settings save with the session, saving presets from the plug-in needs a key
// (mued-vox #213). EULA 2026.10.2 inside (pkg: the consent screen; zip: EULA.txt). Same plug-in ID: a 1.0.0 key works.
// The pkg is build/dist-1.0.1-eula2 (notarised, stapled); the zip is mued-vox 0875c7c1, unsigned.
// ★Never ship the first 1.0.1 pkg (3a39b952…) or the zip …-0ac02273 (8738123f…): both carry EULA 2026.10.1, whose
//   Section 6 describes the 1.0.0 demo (VOX docs/product-facts-1.0.md 「前の物は配らない」).
// 1.0.0 (2026-10-13, pkg + zip be75a5d2) stays on the shelf under its own URLs.
// sha256 and bytes are pinned in tests/unit/plugin-download-artifact-integrity.test.ts.
export const MUEDVOX_DOWNLOAD_URL: string = "https://mued.jp/downloads/MUEDvox-1.1.0-installer.pkg";
export const MUEDVOX_WINDOWS_URL: string = "https://mued.jp/downloads/MUEDvox-1.1.0-win-x64-0580272a.zip";
export const MUEDVOX_WINDOWS_VERSION: string = "1.1.0";
