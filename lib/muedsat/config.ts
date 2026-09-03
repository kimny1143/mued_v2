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
// Package: MUEDsat 0.1.1-alpha — crash fix over 0.1.0 (audio unchanged). Notarized + stapled
//   (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: b3ac87fc4a789660c398421fe64a2f5a34e78d8c2c263e28c4d3a439ad332d0c
//   size:   3,405,698 B
//   Verify after any swap: shasum -a 256 public/downloads/MUEDsat-0.1.1-alpha-installer.pkg
//   History: 2026-07-08 unlock (sha256 c2f931f…), 2026-07-09 signed UI rebuild (c1f11fa1…, audio
//   byte-identical, same filename/URL at 0.1.0-alpha).
//
// ★2026-08-27 (A'): the 0.1.0 FILENAME was ALSO overwritten with this same 0.1.1 payload, on purpose —
//   same reason as MUEDlim (already-sent emails carry the literal 0.1.0 URL and cannot be edited).
//   The old name is a compatibility alias; this constant points at the honest new name.
export const MUEDSAT_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDsat-0.1.1-alpha-installer.pkg";

// Current build version shown in the user portal (P-2 — docs/portal/plan-brief-user-portal-20260717.md).
// Updated together with MUEDSAT_DOWNLOAD_URL in the same PR (the pkg filename carries this version) so
// the portal's "latest version" and the DL link never drift. NOT a secret.
// ★No pre-release tag: kimny 2026-09-03 (「版表記は alpha 外します」) — a maker's "unfinished"
// label must not ride along with a shipped product. ★The .pkg FILENAME deliberately keeps its
// "-alpha" (see *_DOWNLOAD_URL above): renaming it would strand the subscribers who already hold
// that URL in sent mail, and force yet another byte-identical alias. Display and filename are
// decoupled on purpose — do NOT "fix" the mismatch by renaming the file or by re-deriving the
// on-screen label from the URL (tests/unit/components/plugin-version-display.test.tsx pins both).
export const MUEDSAT_VERSION = "0.1.1";

// MUEDsp product page URL for the footer "where it came from" link. Empty => the link is hidden
// (the copy's "MUEDsp product page — link TBD, kimny gate"). Set once the MUEDsp page exists.
export const MUEDSAT_MUEDSP_URL = "";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, a press/reviewer can skip the email gate via `?press=<token>` to reveal
// MUEDSAT_DOWNLOAD_URL directly, while the public surface keeps the email gate (list asset + press
// exposure both preserved). Independent of MUEDSAT_LIVE. Left empty => the check is always false =>
// fully no-op, so this costs nothing until an outreach push (content 外報kit) actually needs it.
export const MUEDSAT_PRESS_TOKEN = "";
