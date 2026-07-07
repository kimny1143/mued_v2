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
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (conductor executes). Flipping this single
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
export const MUEDSAT_LIVE = false;

// Download asset URL emailed to subscribers after they submit the gate. Empty while the dsp-owned
// package (VST3 + AU, macOS, signed/notarized) is not yet uploaded — the confirmation email then
// omits the link and says it's on the way. Set at unlock (kimny gate). NOT a secret (public CDN URL).
export const MUEDSAT_DOWNLOAD_URL = "";

// MUEDsp product page URL for the footer "where it came from" link. Empty => the link is hidden
// (the copy's "MUEDsp product page — link TBD, kimny gate"). Set once the MUEDsp page exists.
export const MUEDSAT_MUEDSP_URL = "";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, a press/reviewer can skip the email gate via `?press=<token>` to reveal
// MUEDSAT_DOWNLOAD_URL directly, while the public surface keeps the email gate (list asset + press
// exposure both preserved). Independent of MUEDSAT_LIVE. Left empty => the check is always false =>
// fully no-op, so this costs nothing until an outreach push (content 外報kit) actually needs it.
export const MUEDSAT_PRESS_TOKEN = "";
