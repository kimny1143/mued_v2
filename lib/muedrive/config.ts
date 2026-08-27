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
export const MUEDRIVE_LIVE = false;

// Download asset URL emailed to subscribers after they submit the gate. Served from the mued.jp
// static path (public/downloads/). NOT a secret.
//
// ★EMPTY UNTIL THE SIGNED PACKAGE LANDS. The email template renders an "on the way" line instead of a
// download button while this is empty (same guard as MUEDlim's), so shipping the page before the .pkg
// exists cannot mail a 404 to anyone.
export const MUEDRIVE_DOWNLOAD_URL = "";

// Current build version shown in the user portal. Updated together with MUEDRIVE_DOWNLOAD_URL in the
// same PR (the pkg filename carries this version) so the portal's "latest version" and the DL link
// never drift. NOT a secret.
export const MUEDRIVE_VERSION = "0.1.0-alpha";

// Press / reviewer bypass — DESIGN ROOM ONLY (dormant until a token is set; not a public feature).
// When non-empty, `?press=<token>` reveals MUEDRIVE_DOWNLOAD_URL directly, skipping the email gate.
// Empty => the check is always false => fully no-op. (Same pattern as MUEDLIM_PRESS_TOKEN.)
export const MUEDRIVE_PRESS_TOKEN = "";
