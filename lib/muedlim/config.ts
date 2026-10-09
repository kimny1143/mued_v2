//
// MUEDlim publish gate (staged free-download plugin — 2nd free module of the MUEDsp family).
//
// Mirrors lib/muedsat/config.ts (MUEDSAT_LIVE) — a single constant that isolates every
// discoverability surface so publish is one atomic flip.
//
// false = STAGED: the /muedsp MUEDlim section is noindex/unannounced, absent from the home card /
//         sitemap / llms.txt, and the email-capture form is a no-op-safe silent add (until the
//         RESEND_MUEDLIM_AUDIENCE_ID audience is provisioned). Reachable by direct URL for review.
//
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (★the OWNING PEER opens and merges the PR after kimny's go — NOT conductor, whose standing
//         constraint makes other peers' repos read-only. See lib/muedrive/config.ts for the full note
//         and for what a flip actually opens.) once distribution is
//         approved — reveals the section, un-gates discoverability, and (with the DL URL + audience
//         set) turns the capture into a real list add + download email.
//
// 2026-07-13 — CLOSED to "coming soon" (kimny: plugin UI below standard), then REOPENED the same day
// once the polished 3-format build shipped. While true the /muedsp MUEDlim section is LIVE (download
// form + real capture/email). Reversible: flip false → the section falls back to the visible
// "近日 / UI 整備中" teaser and the download closes (form hidden, handler no-ops, URL emptied).
export const MUEDLIM_LIVE = true;

// Download asset URL emailed to subscribers after they submit the gate. Served from the mued.jp
// static path (public/downloads/). NOT a secret.
// Package: MUEDlim 1.0.1 (2026-10-09) — CEILING −18 to 0 dBTP (was −3 to 0), the 1:1 switch, the GR graph
//   (mued-dsp main 27284478; facts in its docs/drafts/release_notes_input_muedlim_1.0.1_20261009.md).
//   ★This build changes what an existing session plays: CEILING automation written in VST3 / AAX with 1.0.0
//   plays back at 6× the written value. So 1.0.0 stays downloadable beside it (kimny 2026-10-09) — see
//   lib/plugins/previous-versions.ts — and /muedlim says so before the form.
//   sha256: 3a1a49d21756456a2376d2255883bbdeebb628f35eaeccd560773168a3522360
//   size:   3,302,225 B
//   ★Verified 2026-10-09 13:43 JST on the copy under public/downloads/: shasum -a 256 + bytes matched dsp's
//   message (measured after signing, notarization and staple), pkgutil = Developer ID Installer: glasswerks
//   inc. (F529L4WT3V) / trusted by the Apple notary service, stapler validate OK, spctl -t install = Notarized
//   Developer ID. ★Not checked here: the payload's bundle versions and formats (dsp: three formats, 1.0.1,
//   universal, EULA 2026.10, uninstaller) and installing it.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDlim-1.0.1-installer.pkg
//
// Previous — MUEDlim 1.0.0 — EULA 2026.10 rebuild (2026-09-30). ★Still linked: the portal's "previous version". Same plug-in as the first 1.0.0: dsp §5
//   compared VST3 + AU on copies with the signature stripped (identical; only re-signed) and AAX
//   byte-for-byte (identical; mued re-checked AAX with diff -r on the expanded payloads). What changed
//   is the installer's EULA: Resources/MUED-EULA-2026.10.rtf (sha256 44f5b54f7f48f4a6…).
//   ★Served from /downloads/eula-2026.10/ under the SAME file name (conductor 2026-09-30): the name
//   stays name-version-installer.pkg, the directory separates the build. The first 1.0.0 stays at
//   /downloads/MUEDlim-1.0.0-installer.pkg — sent mail links to it — and is still pinned in
//   tests/unit/plugin-download-artifact-integrity.test.ts. A different URL also means no stale cache.
//   sha256: 123bb9994e7ea85099778603484576200cddf017c82802b92935c4d8758bb7c7
//   size:   3,269,395 B
//   ★Verified 2026-09-30 on the copy under public/downloads/eula-2026.10/: sha256 + bytes matched
//   conductor's relay, `cmp` byte-identical to dsp's plugin/dist/, magic `xar!`, pkgutil = Developer
//   ID Installer: glasswerks inc. (F529L4WT3V), stapler validate OK, spctl -t install = Notarized.
//   Verify after any swap: shasum -a 256 public/downloads/eula-2026.10/MUEDlim-1.0.0-installer.pkg
//
// Previous — MUEDlim 1.0.0, first build (2026-09-30), provisional EULA 2026.09 in the installer:
//   sha256: e71952251543959bb156f81611b1a5c40834699add4a5a2b687c35dce5600ad3
//   size:   3,272,834 B
//   ★Verified 2026-09-30 on the copy under public/downloads/ (not the relayed values): shasum -a 256
//   matched dsp's + conductor's, `cmp` byte-identical to dsp's plugin/dist/, magic `xar!`,
//   pkgutil = Developer ID Installer: glasswerks inc. (F529L4WT3V), stapler validate OK,
//   spctl -t install = accepted / Notarized Developer ID.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDlim-1.0.0-installer.pkg
//   ★The 0.1.x files below stay on the shelf (sent mail quotes them — W0b). History follows.
//
// Previous — MUEDlim 0.1.2 — dsp's signed re-release (dsp #731). ★What changed functionally vs 0.1.1 is
//   dsp's record, NOT re-measured here; the "crash fix / audio unchanged" note belonged to 0.1.1.
//   2-knob (INPUT + CEILING), THREE formats (VST3 · AU · AAX (Pro Tools)) + uninstaller,
//   notarized + stapled (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: fe2d35d4e1762fb29591f9396c04dd4c3b1ef1dd736f5dce1f2459c311153226
//   size:   3,254,821 B
//   ★Verified 2026-09-13 before shipping (independent inspector + 2 refuters): binaries are MUEDlim,
//   every bundle 0.1.2, no format dropped vs 0.1.1, notarized/stapled.
//   ★KNOWN, shipped on purpose (conductor): the AAX PACE dsig names the product "MUEDsat" and reuses
//   MUEDsat's PACE GUID. Confined to that one dsig file — not Info.plist, not CFBundleName, not the
//   VST3/AU bundles, not any executable (binary carries MUEDlim's own id MdLm, never MUEDsat's oVZW).
//   Pre-existing in 0.1.1-alpha, so not a regression. Untested: co-installing MUEDsat + MUEDlim AAX
//   in Pro Tools. Fix on dsp's next signing run.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDlim-0.1.2-installer.pkg
//
// ★2026-08-27 (A'): the 0.1.0 FILENAME was ALSO overwritten with this same 0.1.1 payload, on purpose.
//   311 people already received emails containing the literal 0.1.0 URL; those emails cannot be
//   edited. Publishing only under a new name would leave every one of them on the crashing build.
//   So the old name survives as a compatibility alias (its filename now understates its contents),
//   and this constant points at the honest new name. Both files are byte-identical.
export const MUEDLIM_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDlim-1.0.1-installer.pkg";

// Current build version shown in the user portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md).
// Bumped when a new build ships. NOT a secret.
//
// ★2026-09-13: the mismatch this block used to defend is RESOLVED, exactly as it predicted. The block said:
//   "Ship the next one as \"MUEDlim-0.1.2-installer.pkg\" (no \"-alpha\", no alias needed: no sent mail points at
//   that version yet)." ★0.1.2 shipped under that name, so URL and VERSION now agree without renaming
//   any file that sent mail points at.
// ★The rule that still holds: the OLD filenames stay on the shelf. Mail already sent quotes them and
//   cannot be edited (see the alias history above). ★Never "tidy" public/downloads/ by deleting them.
// ★URL and VERSION now carry the same semver, and tests/unit/plugin-version-matches-download.test.ts
//   fails if they part again. (The on-screen label is still pinned separately by
//   tests/unit/components/plugin-version-display.test.tsx — plain semver, never the filename.)
export const MUEDLIM_VERSION = "1.0.1";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDLIM_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDSAT_PRESS_TOKEN.)
export const MUEDLIM_PRESS_TOKEN = "";
