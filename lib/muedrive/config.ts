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
// Package: MUEDrive 0.1.0-alpha — first release. Three-position CHARACTER (tube / warm / console) +
//   DRIVE / FOCUS / MIX / OUTPUT and a true BYPASS. THREE formats (VST3 · AU · AAX (Pro Tools)),
//   macOS Universal, notarized + stapled (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: 77a13bd14bb3e00effe7156d4ffc0d06f98b7c98e174064931801d0c51d08cdc
//   size:   3,584,446 B
//   Verify after any swap: shasum -a 256 public/downloads/MUEDrive-0.1.0-alpha-installer.pkg
//
// No 0.1.0-alias problem here (unlike MUEDsat/MUEDlim): MUEDrive has never been emailed under an
// older filename, so this URL is the only one that has ever existed for it.
export const MUEDRIVE_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDrive-0.1.0-alpha-installer.pkg";

// Current build version shown in the user portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md).
// Bumped when a new build ships. NOT a secret.
//
// ★This constant is deliberately NOT kept in sync with the .pkg filename. It reads plain semver while
// MUEDRIVE_DOWNLOAD_URL still points at "MUEDrive-0.1.0-alpha-installer.pkg" — that is the intended state, not drift.
// kimny 2026-09-03 (「版表記は alpha 外します」): a maker's "unfinished" label must not ride along with
// a shipped product. Renaming the CURRENT file to match would strand every subscriber holding that
// literal URL in already-sent mail (which cannot be edited) and force another byte-identical alias.
// ★So: do NOT "fix" the mismatch by renaming the shipped file, and do NOT re-derive the on-screen
// label from the URL (tests/unit/components/plugin-version-display.test.tsx pins both directions).
//
// ★The tag still retires at zero cost — on the NEXT build, not by renaming this one. Ship the next
// one as "MUEDrive-0.1.1-installer.pkg" (no "-alpha", no alias needed: no sent mail points at that
// version yet). What is expensive is renaming the current file; dropping the tag going forward is free.
export const MUEDRIVE_VERSION = "0.1.0";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDRIVE_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDLIM_PRESS_TOKEN.)
export const MUEDRIVE_PRESS_TOKEN = "";
