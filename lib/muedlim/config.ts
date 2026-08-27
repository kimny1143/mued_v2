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
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (conductor executes) once distribution is
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
// Package: MUEDlim 0.1.1-alpha — crash fix over 0.1.0 (audio unchanged; bit-identical output verified
//   by dsp). 2-knob (INPUT + CEILING), THREE formats (VST3 · AU · AAX (Pro Tools)) + uninstaller,
//   notarized + stapled (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: dc51d7cbc23ab56f540ba43bbafbd362bbfa69f801b051c8c2602f110c437bc5
//   size:   3,238,046 B
//   Verify after any swap: shasum -a 256 public/downloads/MUEDlim-0.1.1-alpha-installer.pkg
//
// ★2026-08-27 (A'): the 0.1.0 FILENAME was ALSO overwritten with this same 0.1.1 payload, on purpose.
//   311 people already received emails containing the literal 0.1.0 URL; those emails cannot be
//   edited. Publishing only under a new name would leave every one of them on the crashing build.
//   So the old name survives as a compatibility alias (its filename now understates its contents),
//   and this constant points at the honest new name. Both files are byte-identical.
export const MUEDLIM_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDlim-0.1.1-alpha-installer.pkg";

// Current build version shown in the user portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md).
// Updated together with MUEDLIM_DOWNLOAD_URL in the same PR (the pkg filename carries this version) so
// the portal's "latest version" and the DL link never drift. NOT a secret.
export const MUEDLIM_VERSION = "0.1.1-alpha";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDLIM_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDSAT_PRESS_TOKEN.)
export const MUEDLIM_PRESS_TOKEN = "";
