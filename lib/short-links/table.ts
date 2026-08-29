/**
 * ★The short-link table. One row = one short link. This file is the whole "management console":
 * changing where an article points is a one-line edit here plus a deploy, and the article is never
 * touched again.
 *
 * ★It lives in git on purpose. A settings screen somewhere would satisfy "the destination is
 * configurable" while making the mapping unmeasurable from the repo — nobody could diff it, review
 * it, or ask "which 60 links point at /dial today" without logging in somewhere.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ★How to add a row (the porting contract)
 *
 *   { slug: '…', path: '/dial', utmSource: 'note', utmMedium: '…', utmCampaign: '…', utmContent: '…' },
 *
 *   - `slug`        opaque and permanent. Once an article ships with it, it is a public URL —
 *                   ★changing a slug breaks a published article. Retire by repointing, never rename.
 *   - `path`        `''` = the bare host. NEVER a full URL (the host comes from ALLOWED_HOSTS).
 *   - `utmContent`  ★copied verbatim from the article link this row replaces. Never re-numbered:
 *                   a new value splits that link's clicks into two GA4 series, and nothing fails.
 *   - `host`        omit for `dial.mued.jp`.
 *
 * ★Rows are validated by tests/unit/short-links/resolve.test.ts (unique slug, allowlisted host,
 * path shape, no empty utm field). A malformed row fails CI rather than redirecting somewhere odd.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ★Scope this table is being populated for (conductor, measured 2026-08-29 against
 * `drafts/published/*.md` on origin/main of the articles repo):
 *
 *     markdown リンクの出現数   60      ← candidate rows
 *     utm_content の異なり      44
 *     path の異なり              5      bare 30 / `/` 16 / `/dial` 12 / `/waitlist` 1 / `/readiness` 1
 *
 * ★60 vs 44 is a real choice and it is NOT "pick the smaller number": collapsing to 44 keys forces
 * every link sharing a `utm_content` onto ONE destination, and the measured path spread (5 kinds)
 * says they do not all share one. ★The key that preserves today's behaviour is the distinct
 * (host, path, utm tuple) — somewhere between 44 and 60. Port at that granularity and let the row
 * count fall out; do not round it to either end.
 */
import type { ShortLink } from './resolve';

export const SHORT_LINKS: readonly ShortLink[] = [
  // ★Intentionally empty at merge. The器 ships first so gate ④ (canary) has something to point at;
  //   conductor ports the values. ★An empty table makes every "all rows are valid" check vacuously
  //   true, so `assertNonVacuous()` is what stops "0 problems" from being read as "verified" —
  //   scripts/verify/short-links.ts calls it and reports 検査不成立 (exit 2), not green.
] as const;
