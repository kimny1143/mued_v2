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
// it is a business call about a paid artefact, so it was NOT made here — ★and it has since been
// MADE: kimny chose the public shelf (逐語「公開URLで、keyで守る」), then rejected a Dropbox
// route outright (逐語「それは言語道断だぞ」, relayed by conductor 2026-09-11). ★So masterchain
// sits on the same shelf as the free three, gated by the licence at runtime rather than by the
// obscurity of its URL.
//
// ★WHAT SETTING THIS CONSTANT ACTUALLY COSTS. An earlier version of this comment said "one string,
// no other code moves" — ★that was wrong, and it was wrong in the place it would be READ: by whoever
// sets the string (CCO review of #991). The free three are pinned by url + sha256 + byte count in
// tests/unit/plugin-download-artifact-integrity.test.ts, because these files are served from a FIXED
// path under a BARE filename, so replacing a build is an in-place overwrite that the URL, the
// version constant and the review diff all render identically. ★masterchain was not in that table:
// setting this string alone would have published a paid download that nothing verified — the check
// the FREE modules have, missing from the one people pay for.
//
// ★So the pairing is now enforced rather than remembered: set this URL without adding the matching
// sha256/bytes pin and that test goes RED and names what to add. ★"One string" is true in the sense
// that matters — the string is all you decide; the gate tells you the rest.
//
// ★IF YOU EVER MAKE THIS READ FROM env, THE ESCAPING ASSUMPTION BREAKS (CCO nit, #991). The delivery
// email interpolates it straight into `href="…"` with no escaping, which is safe ONLY because it is
// a literal in this file that review sees — the same assumption the free three run on. ★An env-read
// value is attacker-influenceable in a way a committed constant is not, so that change is the moment
// to escape at the interpolation site, not later.
//
// ★WHILE IT IS EMPTY the email degrades honestly instead of silently: it tells the buyer the link
// is coming and to reply to that email. ★That is a fallback, not a delivery — a paid purchase must
// not reach a customer through it, so this has to be non-empty before the paid line can transact.
// ★2026-09-16 訂正 — この段の旧記述「both kimny-gated and unset」は ★もう真ではない。
// `vercel env ls` の name/environments 列で実測（値は見ていない）: FASTSPRING_WEBHOOK_SECRET は
// Preview,Production に 49 日前から／MASTERCHAIN_LICENSE_PRIVATE_KEY は Production に 51 日前から
// 在る。webhook route も deploy 済（GET /api/webhooks/fastspring → 200）で、この URL も set。
// ★∴ fail-CLOSED の根拠は「secret の不在」ではなくなった。今 live 決済を止めているのは
// ★FastSpring store が activation 前であることと、上の live/test 分岐だけである。
// ★repo のコメントを読んで「unset だから安全」と読まないこと（それがこの訂正の理由）。
//
export const MASTERCHAIN_DOWNLOAD_URL =
  "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-installer.pkg";

// Purchase rollout — same rule as the trial below: a reviewed code change, never an environment switch.
// ★CLOSED 2026-09-30 (launch day), kimny 逐語「今日の販売はそもそも間に合わない。最短のルートで進めて
//   準備整い次第告知」. The FastSpring env was already live (button enabled 11:09 JST); this keeps the
//   /muedsp Buy button closed until the announcement, and also keeps the first real order off a path
//   that no live order has run end to end yet (test orders skip fulfillment). Flip to true in the PR
//   for the announcement day.
// ★OPENED 2026-09-30 (#1178, 12:39Z) BEFORE kimny's verification order, on purpose (kimny 9/30 「1で」):
//   the verification buys through the same path as a customer (Buy → EULA consent → popup), so the
//   button has to be open for it. Customers can buy from this moment, which is why the launch mail
//   waits until that order has run end to end (webhook → key → portal → keyfile → LICENSED).
//   Rollback if it fails: branch revert/purchase-live (PURCHASE_LIVE=false only).
// ★CLOSED AGAIN (flag-only rollback): the verification order did not pass end to end. Copy and tests stay.
export const MASTERCHAIN_PURCHASE_LIVE = false;

// Trial rollout is a reviewed code change, never an environment switch.
export const MASTERCHAIN_TRIAL_LIVE = false;
export const MASTERCHAIN_TRIAL_DAYS = 15;

// Demo download entry (Valhalla-style demo, kimny 2026-09-30). A reviewed code change, never an env switch.
// Flipped true in the announcement PR together with MASTERCHAIN_DOWNLOAD_URL → masterchain 1.0.1.
// ★OPENED (merge on conductor's signal after kimny's word): MASTERCHAIN_DOWNLOAD_URL has served 1.0.1
//   since #1174 (2026-09-30, sha256 e4846886… on prod). 1.0.0 had DemoFade=0 — its behaviour does not
//   match the demo copy — so tests/unit/masterchain-demo-gates.test.ts refuses DEMO_LIVE on a 1.0.0 URL.
export const MASTERCHAIN_DEMO_LIVE = true;
