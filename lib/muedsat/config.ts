//
// MUEDsat publish gate (staged free-download storefront).
//
// Mirrors lib/advisory/config.ts (ADVISORY_LIVE) — the go-live pattern proven on advisory:
// a single constant that isolates every discoverability surface so publish is one atomic flip.
//
// false = STAGED: the LP is noindex, absent from sitemap.ts / llms.txt, and NOT linked from the
//         homepage nav. The page is still reachable by direct URL for review (advisory / ai-mixing
//         precedent) but is undiscoverable/unannounced. The email-capture form still works (adds to
//         the Resend audience when configured), so a reviewer can exercise the full flow while staged.
//
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (★the OWNING PEER opens and merges the PR after kimny's go — NOT conductor, whose standing
//         constraint makes other peers' repos read-only. See lib/muedrive/config.ts for the full note
//         and for what a flip actually opens.). Flipping this single
//         constant atomically:
//           - un-noindexes app/[locale]/muedsat/page.tsx     (robots.index = MUEDSAT_LIVE)
//           - adds muedsat URLs to app/sitemap.ts             (gated on MUEDSAT_LIVE)
//           - adds the MUEDsat blurb to app/llms.txt/route.ts (gated on MUEDSAT_LIVE)
//           - reveals the MUEDsat home product card           (components/features/landing/
//             integrated-landing-content.tsx — a /muedsat teaser in the MUEDear/MUEDial lineup)
//         The header nav / FloatingNav quick-nav are intentionally NOT auto-added — those remain a
//         separate editorial decision, not part of the publish flip.
//
// Unlock flow: staged build -> conductor real-path verify -> kimny irreversible gate.
// 2026-07-08 UNLOCK (kimny GO・conductor 執行): flipped true. Reveals the DL page (indexable),
// the home MUEDsat card, and the sitemap/llms entries together.
export const MUEDSAT_LIVE = true;

// Download asset URL emailed to subscribers after they submit the gate. Served from mued.jp static
// hosting (public/downloads/, #598). NOT a secret (public CDN URL).
// Package: MUEDsat 0.1.2 — dsp's signed re-release (dsp #731). ★What changed functionally vs 0.1.1 is
//   dsp's record, NOT re-measured here; the "crash fix / audio unchanged" note belonged to 0.1.1.
//   Notarized + stapled (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: d41d5a30e71df80723a750b036027c3388c19be33eab0343e3385384fefdb610
//   size:   3,405,970 B
//   ★Verified 2026-09-13 before shipping (independent inspector + 2 refuters): binaries are MUEDsat,
//   every bundle 0.1.2, no format dropped vs 0.1.1, notarized/stapled, AAX dsig names MUEDsat.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDsat-0.1.2-installer.pkg
//   History: 2026-07-08 unlock (sha256 c2f931f…), 2026-07-09 signed UI rebuild (c1f11fa1…, audio
//   byte-identical, same filename/URL at 0.1.0-alpha).
//
// ★2026-08-27 (A'): the 0.1.0 FILENAME was ALSO overwritten with this same 0.1.1 payload, on purpose —
//   same reason as MUEDlim (already-sent emails carry the literal 0.1.0 URL and cannot be edited).
//   The old name is a compatibility alias; this constant points at the honest new name.
export const MUEDSAT_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDsat-0.1.2-installer.pkg";

// Current build version shown in the user portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md).
// Bumped when a new build ships. NOT a secret.
//
// ★2026-09-13: the mismatch this block used to defend is RESOLVED, exactly as it predicted. The block said:
//   "Ship the next one as \"MUEDsat-0.1.2-installer.pkg\" (no \"-alpha\", no alias needed: no sent mail points at
//   that version yet)." ★0.1.2 shipped under that name, so URL and VERSION now agree without renaming
//   any file that sent mail points at.
// ★The rule that still holds: the OLD filenames stay on the shelf. Mail already sent quotes them and
//   cannot be edited (see the alias history above). ★Never "tidy" public/downloads/ by deleting them.
// ★URL and VERSION now carry the same semver, and tests/unit/plugin-version-matches-download.test.ts
//   fails if they part again. (The on-screen label is still pinned separately by
//   tests/unit/components/plugin-version-display.test.tsx — plain semver, never the filename.)
export const MUEDSAT_VERSION = "0.1.2";

// MUEDsp product page URL for the footer "where it came from" link. Empty => the link is hidden
// (the copy's "MUEDsp product page — link TBD, kimny gate"). Set once the MUEDsp page exists.
export const MUEDSAT_MUEDSP_URL = "";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, a press/reviewer can skip the email gate via `?press=<token>` to reveal
// MUEDSAT_DOWNLOAD_URL directly, while the public surface keeps the email gate (list asset + press
// exposure both preserved). Independent of MUEDSAT_LIVE. Left empty => the check is always false =>
// fully no-op, so this costs nothing until an outreach push (content 外報kit) actually needs it.
export const MUEDSAT_PRESS_TOKEN = "";
