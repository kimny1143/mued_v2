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
// Package: MUEDlim 0.1.2 — dsp's signed re-release (dsp #731). ★What changed functionally vs 0.1.1 is
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
export const MUEDLIM_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDlim-0.1.2-installer.pkg";

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
export const MUEDLIM_VERSION = "0.1.2";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDLIM_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDSAT_PRESS_TOKEN.)
export const MUEDLIM_PRESS_TOKEN = "";
