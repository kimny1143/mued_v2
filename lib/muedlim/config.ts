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

// Download asset URL emailed to subscribers after they submit the gate. Served from the mued.jp
// static path below (the pkg is hosted at public/downloads/). NOT a secret.
// Package: MUEDlim 0.1.0-alpha — 2-knob (INPUT + CEILING) minimal + constant-latency build (dsp
//   e665fef5). macOS Universal, VST3 · AU, notarized + stapled (Developer ID Installer:
//   glasswerks inc. F529L4WT3V — spctl accepted).
//   sha256: c6c9ad52a64a213b0742ec353dd545355ee0f5daf2b6115c5e89a933f9f32663
//   size:   2,234,492 B. The old 4-knob build (22d2293c…) is RETIRED and fully replaced.
//   Verify after any swap: shasum -a 256 public/downloads/MUEDlim-0.1.0-alpha-installer.pkg
export const MUEDLIM_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDlim-0.1.0-alpha-installer.pkg";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDLIM_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDSAT_PRESS_TOKEN.)
export const MUEDLIM_PRESS_TOKEN = "";
