//
// MUEDsp masterchain (paid, $69) — interest-capture publish gate.
//
// Mirrors lib/muedlim/config.ts (MUEDLIM_LIVE): a single constant that gates the pre-launch
// "notify me at launch" interest surface + its API. While the masterchain is in development the
// interest capture is unpublished — the /api/masterchain/interest route no-ops (benign 200,
// registered:false) and the capture UI is not shown.
//
// false = STAGED: interest capture disabled (route no-ops; DB/audience untouched). Flipped true only
//         at the kimny-gated pre-launch announcement, once the dedicated interest audience
//         (RESEND_MASTERCHAIN_INTEREST_AUDIENCE_ID) is provisioned and the CTA copy is in.
// true  = LIVE: interest capture records a masterchain_interest row + adds to the interest audience.
//
// Purpose (Codex P2 / design #670): measure masterchain paid-interest SEPARATELY from the free
// module (MUEDsat/MUEDlim) download lists — the un-polluted denominator for the 90-day judgment.
export const MASTERCHAIN_INTEREST_LIVE = false;
