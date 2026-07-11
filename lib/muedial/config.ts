//
// /muedial LP publish gate (wave2 "使い始める" LP, staged).
//
// Mirrors lib/muedsp/config.ts (MUEDSP_LIVE), lib/muedsat/config.ts, lib/advisory/config.ts —
// one constant that isolates every discoverability surface so publish is a single atomic flip.
//
// false = STAGED: the /muedial LP is noindex and reachable only by direct URL (for the kimny 現物
//         gate). The home MIX CTA already points to /muedial, so the page is reachable but
//         unannounced/unindexed until go-live.
//
// true  = LIVE: flipped ONLY in the kimny-gated unlock PR (conductor executes) — un-noindexes the
//         page (and adds sitemap/OGP surfaces if wired). Pricing display is already kimny-gated
//         (gate①: 現行設定価格で公開 GO), so prices show on the LP regardless of this flag.
//
// NOTE: the separate "waitlist 撤去 + direct-upload + COGS 件数上限" change lives in the dial app
// flow (campaign/upload gate), NOT on this marketing LP. This LP's CTA links to dial.mued.jp.
export const MUEDIAL_LP_LIVE = false;
