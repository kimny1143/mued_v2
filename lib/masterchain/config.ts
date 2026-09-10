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

//
// masterchain installer URL — the thing a $69 buyer actually needs.
//
// ★WHY THIS IS EMPTY, AND WHY THAT IS NOT THE BUG. The delivery email
// (`emailTemplates.masterchainLicenseDelivery`) shipped the license KEY and never said where to get
// the PLUGIN — so the buyer received a key for software they had no way to obtain. The fulfilment
// spec commits to both: `docs/paid-line/c1-fastspring-product-and-fulfillment-spec.md:66` —
// 「ライセンスキーはメールでお送りします」+ ダウンロードリンク. The email now carries the link
// whenever this is set, which is the part that was missing.
//
// ★WHAT IS STILL OPEN IS A DECISION, NOT CODE (kimny; conductor board card
// `masterchain-dl-location-20260910`): may the PAID binary sit on the same PUBLIC shelf as the free
// three? `public/downloads/*.pkg` is unauthenticated — measured: the individual .pkg files answer
// 200 while the directory index is 404. That is the usual plugin-industry shape (open installer,
// licence unlocks the DSP), and masterchain is licence-gated at runtime, so it is defensible — but
// it is a business call about a paid artefact, so it is NOT made here. ★Setting this constant is
// the whole of that decision: one string, no other code moves.
//
// ★WHILE IT IS EMPTY the email degrades honestly instead of silently: it tells the buyer the link
// is coming and to reply to that email. ★That is a fallback, not a delivery — a paid purchase must
// not reach a customer through it, so this has to be non-empty before the paid line can transact.
// ★Nothing can transact today regardless: the FastSpring webhook is fail-CLOSED on
// FASTSPRING_WEBHOOK_SECRET (401) and licence issuance throws without MASTERCHAIN_LICENSE_PRIVATE_KEY
// (both kimny-gated and unset), which is why this is a launch blocker and not a live incident.
//
export const MASTERCHAIN_DOWNLOAD_URL = "";
