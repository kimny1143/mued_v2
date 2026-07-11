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
export const MUEDLIM_LIVE = true;

// Download asset URL emailed to subscribers after they submit the gate. Empty while staged — the
// welcome email then omits the link and says it's on the way. Set at unlock (kimny gate) to the
// mued.jp static path below (the pkg is already hosted at public/downloads/). NOT a secret.
//   go-live value: "https://mued.jp/downloads/MUEDlim-0.1.0-alpha-installer.pkg"
// Package: MUEDlim 0.1.0-alpha, macOS, notarized + stapled.
//   sha256: 22d2293cc4e0b20e2a0126a5ba69d92b5477717c2ed825673c053584288718b6
//   (2,235,824 B — conductor release verify: spctl/stapler/pkgutil/auval all PASS)
export const MUEDLIM_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDlim-0.1.0-alpha-installer.pkg";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDLIM_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDSAT_PRESS_TOKEN.)
export const MUEDLIM_PRESS_TOKEN = "";
