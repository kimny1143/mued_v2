/**
 * Short-link resolution — `mued.jp/l/<slug>` → a tagged destination URL.
 *
 * ★Why this exists (kimny, 2026-08-29): note articles carried the destination AND its utm_*
 * parameters inline, so changing either meant editing every published article. 57 articles already
 * carry such a link; the next campaign would mean editing all of them again. The article now writes
 * one opaque short link, and the destination + tagging live here, in git.
 *
 * ★Two properties this file exists to guarantee, both of which are easy to lose silently:
 *
 * 1. **The destination host can never come from the table.** `SHORT_LINKS` supplies a PATH; the host
 *    is chosen from ALLOWED_HOSTS. A table row is a redirect target, so a row that could name its own
 *    host would be an open redirect that a table edit (not a code review) could introduce. Note the
 *    path check is not cosmetic: `new URL('/\\evil', 'https://dial.mued.jp')` resolves to
 *    `https://evil/` because the WHATWG parser folds `\` into `/` for special schemes, and
 *    `//evil.com` does the same. Testing "the path looks relative" would pass both. So resolution
 *    re-asserts `url.host` after building, and the tests assert the resolved HOST, not the shape of
 *    the input (the property, not a proxy for it).
 *
 * 2. **`utm_content` is copied verbatim from the article it replaces, never re-numbered.** Rewriting
 *    it splits one link's history into two GA4 keys — clicks before the change and clicks after stop
 *    being the same series, and nothing fails when that happens. Same reasoning content課 used in
 *    PR #561 when it left `utm_content` alone.
 *
 * Taxonomy is owned by content/data (data課 PR #177 is canonical); this file only applies it.
 */

/**
 * Hosts a short link may point at. The table cannot extend this — adding one is a code change, and
 * therefore a review.
 */
export const ALLOWED_HOSTS = ['dial.mued.jp', 'mued.jp'] as const;
export type AllowedHost = (typeof ALLOWED_HOSTS)[number];

export const DEFAULT_HOST: AllowedHost = 'dial.mued.jp';

/** One row of the table = one short link. */
export interface ShortLink {
  /** The `<slug>` in `mued.jp/l/<slug>`. Lowercase, unique across the table. */
  slug: string;
  /** Destination host. Omit for the default (`dial.mued.jp`). */
  host?: AllowedHost;
  /** Destination path. `''` (bare host) or `/…`. NEVER a full URL — see the header note. */
  path: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  /** ★Copied verbatim from the article link this row replaces. Never re-numbered. */
  utmContent: string;
  utmTerm?: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

/**
 * Characters a path segment may contain. Backslash is absent on purpose: `\` is where the
 * host-escape lives, because the WHATWG URL parser folds it into `/` for special schemes.
 */
const PATH_RE = /^(?:\/[A-Za-z0-9\-._~!$&'()*+,;=:@%]*)*$/;

/**
 * ★A leading `//` needs its own line. It matches PATH_RE (an empty first segment, then a second one)
 * and reads as an ordinary path — but `//evil.example` is the protocol-relative form, the shape a
 * host-escape takes. The unit test caught the regex accepting it before this existed.
 */
function pathIsSafe(path: string): boolean {
  if (path === '') return true;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  return PATH_RE.test(path);
}

export interface TableProblem {
  slug: string;
  problem: string;
}

/**
 * Validates the whole table. Returns every problem found (not just the first) so one CI run reports
 * the full list rather than one row per push.
 *
 * ★The caller must also reject an EMPTY table where a non-empty one is expected: every check below
 * is vacuously true over zero rows, so "no problems" from an empty table says nothing at all.
 * `assertNonVacuous` exists for exactly that and is deliberately a separate call — a check that
 * silently passes on an empty population is the failure this codebase keeps re-learning.
 */
export function validateTable(rows: readonly ShortLink[]): TableProblem[] {
  const problems: TableProblem[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, i) => {
    const at = row.slug || `#${i}`;

    if (!SLUG_RE.test(row.slug)) {
      problems.push({ slug: at, problem: `slug が規則に合わない（^[a-z0-9][a-z0-9-]{1,63}$）: ${JSON.stringify(row.slug)}` });
    }
    const prev = seen.get(row.slug);
    if (prev !== undefined) {
      problems.push({ slug: at, problem: `slug が重複（行 ${prev} と ${i}）` });
    }
    seen.set(row.slug, i);

    if (row.host !== undefined && !ALLOWED_HOSTS.includes(row.host)) {
      problems.push({ slug: at, problem: `host が allowlist の外: ${JSON.stringify(row.host)}` });
    }

    if (!pathIsSafe(row.path)) {
      problems.push({ slug: at, problem: `path が規則に合わない（'' か /… のみ・'//' と '\\' は不可）: ${JSON.stringify(row.path)}` });
    }

    for (const [field, value] of [
      ['utmSource', row.utmSource],
      ['utmMedium', row.utmMedium],
      ['utmCampaign', row.utmCampaign],
    ] as const) {
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push({ slug: at, problem: `${field} が空` });
      }
    }

    // ★utmContent may be empty — but only because the property being protected is not "the field is
    //   non-empty", it is "★this row stays distinguishable in analytics". The two came apart when the
    //   real links were measured (conductor, 2026-08-29): 19 of the 60 article links never carried a
    //   `utm_content` at all, and GA4 already holds them as one `(not set)` bucket, so there is no
    //   series to preserve. The original rule read "a row that silently LOSES it would quietly stop
    //   being attributable" — losing a value and never having one are different, and only the first is
    //   a defect. Requiring the field's presence in the TYPE (it is not optional) keeps a row from
    //   dropping it by accident; the uniqueness check below is what actually holds the property.
    if (typeof row.utmContent !== 'string') {
      problems.push({ slug: at, problem: 'utmContent が文字列でない（空文字は可・欠落は不可）' });
    }
  });

  // ★No two rows IN THIS TABLE may share (utm_campaign, utm_content): they would land in one GA4 bucket
  //   and stop being tellable apart. This subsumes the empty-content rows (fine, their campaigns differ)
  //   and catches what the old non-empty rule never could — two rows with the SAME non-empty content
  //   under one campaign.
  //
  // ★SCOPE, because the claim is narrower than "unique in GA4" (product課, measured 2026-08-29). The
  //   check sees only these rows. The same articles also carry ~50 mued.jp links that are NOT in this
  //   table, and 30 of those share a (campaign, content) pair with a row here. So `utm_content` is used
  //   operationally to name the ARTICLE, not the destination, and the pair is unique per destination
  //   only while an article links a destination once. ★Pre-existing and out of this table's scope —
  //   recorded so the guarantee is not read as wider than it is.
  //
  // ★GA4's real key also includes source / medium / term, which this check ignores. That errs toward
  //   OVER-detection (rows GA4 could tell apart by source would be flagged here), which is the safe
  //   direction — but if a second utm_source is ever added, expect a legitimate row to go red here.
  const byPair = new Map<string, string>();
  rows.forEach((row) => {
    const key = `${row.utmCampaign}\u0000${row.utmContent}`;
    const prev = byPair.get(key);
    if (prev !== undefined) {
      problems.push({
        slug: row.slug || '(no slug)',
        problem: `(utm_campaign, utm_content) が ${prev} と重複 — GA4 で1つのバケツに潰れる`,
      });
    } else {
      byPair.set(key, row.slug || '(no slug)');
    }
  });

  return problems;
}

/**
 * Fails when the table is empty. Separate from validateTable() on purpose: see the note there.
 */
export function assertNonVacuous(rows: readonly ShortLink[]): void {
  if (rows.length === 0) {
    throw new Error(
      '短リンク表が空です。★空の表では全ての検査が vacuously true になるため、"問題なし" は測定になりません。',
    );
  }
}

/**
 * Builds the destination for `slug`, or null when the slug is unknown.
 *
 * `incoming` is the query the visitor arrived with. Non-utm parameters are preserved; the table's
 * utm_* values overwrite any the visitor supplied, so attribution is what the table says and cannot
 * be spoofed through the short link.
 */
export function resolveShortLink(
  rows: readonly ShortLink[],
  slug: string,
  incoming?: URLSearchParams,
): string | null {
  const row = rows.find((r) => r.slug === slug);
  if (!row) return null;

  const host = row.host ?? DEFAULT_HOST;
  if (!ALLOWED_HOSTS.includes(host)) return null;
  if (!pathIsSafe(row.path)) return null;

  const url = new URL(`https://${host}`);
  url.pathname = row.path === '' ? '/' : row.path;

  // ★Re-assert the host AFTER building. The path checks above should make this unreachable; it is
  //   here because "the input looked relative" and "the result is on our host" are different claims,
  //   and only the second one is the one that matters.
  if (url.host !== host) return null;

  if (incoming) {
    for (const [k, v] of incoming) {
      if (!k.startsWith('utm_')) url.searchParams.append(k, v);
    }
  }
  url.searchParams.set('utm_source', row.utmSource);
  url.searchParams.set('utm_medium', row.utmMedium);
  url.searchParams.set('utm_campaign', row.utmCampaign);
  // ★An empty utmContent emits NO parameter, rather than `utm_content=`. The 19 rows it applies to had
  //   no such parameter in the original article link, and `?utm_content=` is a different URL from one
  //   without it — emitting it would be adding something the verbatim contract says to preserve as
  //   absent. It would also stake the outcome on GA4 folding "" and absent into the same `(not set)`
  //   bucket, which is an assumption this code does not need to make. (Caught by running the 60 rows,
  //   not by reading them: the table looked right and the URL was wrong.)
  if (row.utmContent) url.searchParams.set('utm_content', row.utmContent);
  if (row.utmTerm) url.searchParams.set('utm_term', row.utmTerm);

  return url.toString();
}
