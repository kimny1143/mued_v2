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
// Package: MUEDsat 1.0.2 (2026-10-14) — fixes the click when DRIVE is moved (dsp #876); the bundled third-party
//   notices and the EULA (2026.10.1) are new.
//   sha256: 7e66600e75fbca39250bb47662d3298aee30b954cb345f44eb7d6f9eee1ac1f4
//   size:   3,434,728 B
//   ★Verified 2026-10-14 08:57 JST on the copy under public/downloads/: shasum -a 256 + bytes matched dsp's message, cmp
//   byte-identical to dsp's plugin/dist/, magic xar!, Developer ID Installer: glasswerks inc. (F529L4WT3V), notarized,
//   stapler validate OK, spctl -t install = Notarized Developer ID; pkgutil --expand-full: VST3 / AU / AAX all 1.0.2,
//   Resources/MUED-EULA-2026.10.1.rtf, and the two notice files equal content/licenses/ (sha256).
//   ★1.0.1 stays at /downloads/MUEDsat-1.0.1-installer.pkg (sent mail points there), pinned as a shelf row.
//
// Previous — MUEDsat 1.0.1 (2026-10-01, dsp §5 passed; kimny checked it by eye — 「手順4はOKでした」).
//   What changed vs 1.0.0 (dsp's record): the THD readout shows the measured value, and the operating-point dot
//   swings to about half the curve on a chorus — DISPLAY ONLY, the audio is bit-identical to 1.0.0.
//   EULA in the installer: MUED-EULA-2026.10.rtf (same text as 1.0.0's 2026.10 build).
//   ★Served from /downloads/ directly: the name carries the new version, so it collides with nothing.
//   sha256: 39596b0a813a3ded383f900e29f682d32810ec76af9121c65cbc76c848f6a066
//   size:   3,425,562 B
//   ★Verified 2026-10-01 on the copy under public/downloads/: shasum -a 256 + bytes matched dsp's relay,
//   `cmp` byte-identical to dsp's plugin/dist/, magic `xar!`, pkgutil = Developer ID Installer: glasswerks
//   inc. (F529L4WT3V) + notarized, stapler validate OK, spctl -t install = Notarized Developer ID.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDsat-1.0.1-installer.pkg
//   ★The Windows beta zip stays 1.0.0 (conductor 2026-10-01).
//
// Previous — MUEDsat 1.0.0, EULA 2026.10 rebuild (2026-09-30). Same plug-in as the first 1.0.0: dsp §5
//   compared VST3 + AU on copies with the signature stripped (identical; only re-signed) and AAX
//   byte-for-byte (identical; mued re-checked AAX with diff -r on the expanded payloads). What changed
//   is the installer's EULA: Resources/MUED-EULA-2026.10.rtf (sha256 44f5b54f7f48f4a6…).
//   ★Served from /downloads/eula-2026.10/ under the SAME file name (conductor 2026-09-30): the name
//   stays name-version-installer.pkg, the directory separates the build. The first 1.0.0 stays at
//   /downloads/MUEDsat-1.0.0-installer.pkg — sent mail links to it — and is still pinned in
//   tests/unit/plugin-download-artifact-integrity.test.ts. A different URL also means no stale cache.
//   sha256: 9871b6071ddb7b522162000bcd28d1b6993c5ccfcb88a04744c1d0d27b8b4dc8
//   size:   3,417,085 B
//   ★Verified 2026-09-30 on the copy under public/downloads/eula-2026.10/: sha256 + bytes matched
//   conductor's relay, `cmp` byte-identical to dsp's plugin/dist/, magic `xar!`, pkgutil = Developer
//   ID Installer: glasswerks inc. (F529L4WT3V), stapler validate OK, spctl -t install = Notarized.
//   Verify after any swap: shasum -a 256 public/downloads/eula-2026.10/MUEDsat-1.0.0-installer.pkg
//
// Previous — MUEDsat 1.0.0, first build (2026-09-30), provisional EULA 2026.09 in the installer:
//   sha256: e36fd15220290c7d9b8faf51574711263df73321a26360533b8a6a7e876c89ff
//   size:   3,420,493 B
//   ★Verified 2026-09-30 on the copy under public/downloads/ (not the relayed values): shasum -a 256
//   matched dsp's + conductor's, `cmp` byte-identical to dsp's plugin/dist/, magic `xar!`,
//   pkgutil = Developer ID Installer: glasswerks inc. (F529L4WT3V), stapler validate OK,
//   spctl -t install = accepted / Notarized Developer ID.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDsat-1.0.0-installer.pkg
//   ★The 0.1.x files below stay on the shelf (sent mail quotes them — W0b). History follows.
//
// Previous — MUEDsat 0.1.2 — dsp's signed re-release (dsp #731). ★What changed functionally vs 0.1.1 is
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
export const MUEDSAT_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDsat-1.0.2-installer.pkg";

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
export const MUEDSAT_VERSION = "1.0.2";

// MUEDsp product page URL for the footer "where it came from" link. Empty => the link is hidden
// (the copy's "MUEDsp product page — link TBD, kimny gate"). Set once the MUEDsp page exists.
export const MUEDSAT_MUEDSP_URL = "";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, a press/reviewer can skip the email gate via `?press=<token>` to reveal
// MUEDSAT_DOWNLOAD_URL directly, while the public surface keeps the email gate (list asset + press
// exposure both preserved). Independent of MUEDSAT_LIVE. Left empty => the check is always false =>
// fully no-op, so this costs nothing until an outreach push (content 外報kit) actually needs it.
export const MUEDSAT_PRESS_TOKEN = "";
