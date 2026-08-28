// MUEDrive (MUEDsp drive) — free-download distribution constants.
//
// Mirrors lib/muedlim/config.ts and lib/muedsat/config.ts. Third module in the MUEDsp free family,
// but NOT a stage lifted out of the chain: MUEDrive was started outside MUEDsp masterchain as a
// standalone plugin (kimny 2026-08-22 — the copy says so explicitly, so the code comment says so too;
// if these ever disagree, the tokushoho/LP copy is canonical).
//
// false = staged: the page renders but is noindex + kept out of the sitemap, and /muedsp does not
//         link it. Nothing is public.
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (conductor executes), once distribution is
//         actually ready (signed .pkg in public/downloads/ + Resend audience provisioned).
//         Flipping this single constant:
//           - un-noindexes app/[locale]/muedrive/page.tsx  (robots.index = MUEDRIVE_LIVE)
//           - adds muedrive URLs to app/sitemap.ts         (gated on MUEDRIVE_LIVE)
export const MUEDRIVE_LIVE = true;

// Download asset URL emailed to subscribers after they submit the gate. Served from mued.jp static
// hosting (public/downloads/). NOT a secret (public CDN URL).
// Package: MUEDrive 0.1.0-alpha — first release. Three-position CHARACTER (tube / warm / console) +
//   DRIVE / FOCUS / MIX / OUTPUT and a true BYPASS. THREE formats (VST3 · AU · AAX (Pro Tools)),
//   macOS Universal, notarized + stapled (Developer ID Installer: glasswerks inc. F529L4WT3V).
//   sha256: 77a13bd14bb3e00effe7156d4ffc0d06f98b7c98e174064931801d0c51d08cdc
//   size:   3,584,446 B
//   Verify after any swap: shasum -a 256 public/downloads/MUEDrive-0.1.0-alpha-installer.pkg
//
// No 0.1.0-alias problem here (unlike MUEDsat/MUEDlim): MUEDrive has never been emailed under an
// older filename, so this URL is the only one that has ever existed for it.
export const MUEDRIVE_DOWNLOAD_URL = "https://mued.jp/downloads/MUEDrive-0.1.0-alpha-installer.pkg";

// Current build version shown in the user portal. Updated together with MUEDRIVE_DOWNLOAD_URL in the
// same PR (the pkg filename carries this version) so the portal's "latest version" and the DL link
// never drift. NOT a secret.
export const MUEDRIVE_VERSION = "0.1.0-alpha";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDRIVE_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDLIM_PRESS_TOKEN.)
export const MUEDRIVE_PRESS_TOKEN = "";
