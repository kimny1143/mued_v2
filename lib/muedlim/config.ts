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
export const MUEDLIM_LIVE = false;

// Download asset URL emailed to subscribers after they submit the gate. Empty while staged — the
// welcome email then omits the link and says it's on the way. Set at unlock (kimny gate) to the
// mued.jp static path below (the pkg is already hosted at public/downloads/). NOT a secret.
//   go-live value: "https://mued.jp/downloads/MUEDlim-0.1.0-alpha-installer.pkg"
// Package: MUEDlim 0.1.0-alpha — 2-knob (INPUT + CEILING) minimal + constant-latency build (dsp
//   e665fef5). macOS, VST3 · AU, notarized + stapled.
//   sha256: PENDING NOTARIZATION — pinned at flip once the conductor delivers the notarized final
//   pkg + sha (dsp notarizes after kimny provides the notary key). The old 4-knob build
//   (22d2293c…) is RETIRED. Do NOT host a non-notarized build; swap + pin at go-live only.
export const MUEDLIM_DOWNLOAD_URL = "";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDLIM_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDSAT_PRESS_TOKEN.)
export const MUEDLIM_PRESS_TOKEN = "";
