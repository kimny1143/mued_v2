// MUEDrive (MUEDsp drive) — free-download distribution constants.
//
// Mirrors lib/muedlim/config.ts and lib/muedsat/config.ts. Third module in the MUEDsp free family,
// but NOT a stage lifted out of the chain: MUEDrive was started outside MUEDsp masterchain as a
// standalone plugin (kimny 2026-08-22 — the copy says so explicitly, so the code comment says so too;
// if these ever disagree, the tokushoho/LP copy is canonical).
//
// false = staged: the page renders but is noindex + kept out of the sitemap, and the email gate
//         no-ops (the form returns 200 without sending anything). Nothing is public.
// true  = LIVE. Flipped 2026-08-27 on kimny's verbatim go.
//
//   ★WHO FLIPS IT: the owning peer (mued) opens the PR and merges it after receiving kimny's go.
//   NOT conductor. This line previously read "(conductor executes)" — that was already false when
//   the flip came: conductor holds a standing constraint that other peers' repos are READ-ONLY
//   (2026-08-27, after they moved another peer's working tree and deleted a branch as a merge
//   side-effect). They cannot write this file. The stale note cost a round-trip on launch night;
//   left alone it would cost the next one too.
//
//   ★WHAT IT OPENS — measured 2026-08-27, not inferred. Six surfaces, and the last is the point:
//     1. app/sitemap.ts        — adds /ja/muedrive + /en/muedrive
//     2. app/llms.txt/route.ts — emits the MUEDrive line
//     3. page.tsx robots       — noindex,nofollow → index,follow
//     4. page.tsx              — emits the SoftwareApplication JSON-LD
//     5. registry.live         — ★drops the `!live` early return in subscribe-handler, so the email
//                                gate actually runs and the welcome mail carries the download link
//     6. versions.json         — the module starts being advertised
//   ★5 is the launch. Until then the form is a well-behaved no-op. Treat this constant as
//   "publish", not "a boolean" — it is effectively irreversible (indexed + mail starts going out).
export const MUEDRIVE_LIVE = true;

// Download asset URL emailed to subscribers after they submit the gate. Served from mued.jp static
// hosting (public/downloads/). NOT a secret (public CDN URL).
// Package: MUEDrive 1.0.0 (2026-09-30) — the 1.0.0 release; all four MUEDsp plugins ship 1.0.0 together
//   (kimny 9/23). Built by dsp with the provisional EULA 2026.09 in the installer.
//   sha256: 1f3fc0918ccbbb9551c4d217594c043f2f9e0b808023576b640d9e08f6ce8d49
//   size:   3,620,155 B
//   ★Verified 2026-09-30 on the copy under public/downloads/ (not the relayed values): shasum -a 256
//   matched dsp's + conductor's, `cmp` byte-identical to dsp's plugin/dist/, magic `xar!`,
//   pkgutil = Developer ID Installer: glasswerks inc. (F529L4WT3V), stapler validate OK,
//   spctl -t install = accepted / Notarized Developer ID.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDrive-1.0.0-installer.pkg
//   ★The 0.1.x files below stay on the shelf (sent mail quotes them — W0b). History follows.
//
// Previous — MUEDrive 0.1.2 — dsp's signed re-release (dsp #731); first shipped as 0.1.0-alpha.
//   ★What changed functionally vs 0.1.0 is dsp's record, NOT re-measured here.
//   Three-position CHARACTER (tube / warm / console) + DRIVE / FOCUS / MIX / OUTPUT and a true BYPASS.
//   THREE formats (VST3 · AU · AAX (Pro Tools)), macOS Universal, notarized + stapled
//   (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: cf5a9a7b1a6ea984091b1f7329ce54b4c0229ef3ec259bfdc16559362b51e5b3
//   size:   3,584,930 B
//   ★Verified 2026-09-13 before shipping (independent inspector + 2 refuters): binaries are MUEDrive,
//   every bundle 0.1.2, no format dropped vs 0.1.0-alpha, notarized/stapled, AAX dsig names MUEDrive.
//   ★Provenance note: the 0.1.0-alpha this replaces (77a13bd1…) is NOT byte-identical to dsp's
//   dist/MUEDrive-0.1.0-alpha (31715d…) — where the previously live build came from is unresolved.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDrive-0.1.2-installer.pkg
//
// No 0.1.0-alias problem here (unlike MUEDsat/MUEDlim): MUEDrive has never been emailed under an
// older filename, so this URL is the only one that has ever existed for it.
export const MUEDRIVE_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDrive-1.0.0-installer.pkg";

// Current build version shown in the user portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md).
// Bumped when a new build ships. NOT a secret.
//
// ★2026-09-13: the mismatch this block used to defend is RESOLVED, exactly as it predicted. The block said:
//   "Ship the next one as \"MUEDrive-0.1.2-installer.pkg\" (no \"-alpha\", no alias needed: no sent mail points at
//   that version yet)." ★0.1.2 shipped under that name, so URL and VERSION now agree without renaming
//   any file that sent mail points at.
// ★The rule that still holds: the OLD filenames stay on the shelf. Mail already sent quotes them and
//   cannot be edited (see the alias history above). ★Never "tidy" public/downloads/ by deleting them.
// ★URL and VERSION now carry the same semver, and tests/unit/plugin-version-matches-download.test.ts
//   fails if they part again. (The on-screen label is still pinned separately by
//   tests/unit/components/plugin-version-display.test.tsx — plain semver, never the filename.)
export const MUEDRIVE_VERSION = "1.0.0";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDRIVE_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDLIM_PRESS_TOKEN.)
export const MUEDRIVE_PRESS_TOKEN = "";
