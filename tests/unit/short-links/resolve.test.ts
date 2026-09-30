/**
 * Short-link resolution.
 *
 * ★The host-escape cases below assert the RESOLVED HOST, not the shape of the input. "the path did
 * not look absolute" and "the result is on our host" are different claims and only the second one is
 * the property; a check written against the first passes `/\evil`, which the WHATWG URL parser turns
 * into `https://evil/` because `\` folds into `/` for special schemes.
 *
 * ★The table's own rows are checked here too, but validity over an EMPTY table is vacuous — so the
 * table suite asserts what it can prove about zero rows and leaves non-vacuity to
 * scripts/verify/short-links.ts, which is what runs once rows exist.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveShortLink,
  validateTable,
  assertNonVacuous,
  ALLOWED_HOSTS,
  type ShortLink,
  prefersJapanese,
} from '@/lib/short-links/resolve';
import { SHORT_LINKS } from '@/lib/short-links/table';

const row = (over: Partial<ShortLink> = {}): ShortLink => ({
  slug: 'demo',
  path: '/dial',
  utmSource: 'note',
  utmMedium: 'referral',
  utmCampaign: 'note_demo',
  utmContent: 'body_cta',
  ...over,
});

describe('resolveShortLink', () => {
  it('resolves a known slug to the tagged destination', () => {
    const url = new URL(resolveShortLink([row()], 'demo')!);
    expect(url.origin).toBe('https://dial.mued.jp');
    expect(url.pathname).toBe('/dial');
    expect(url.searchParams.get('utm_source')).toBe('note');
    expect(url.searchParams.get('utm_medium')).toBe('referral');
    expect(url.searchParams.get('utm_campaign')).toBe('note_demo');
    expect(url.searchParams.get('utm_content')).toBe('body_cta');
  });

  it('sends an empty path to the bare host', () => {
    expect(new URL(resolveShortLink([row({ path: '' })], 'demo')!).pathname).toBe('/');
  });

  it('returns null for an unknown slug (the route turns this into a 404, never a 200)', () => {
    expect(resolveShortLink([row()], 'no-such-slug')).toBeNull();
    expect(resolveShortLink([], 'demo')).toBeNull();
  });

  it('keeps non-utm query the visitor arrived with', () => {
    const url = new URL(resolveShortLink([row()], 'demo', new URLSearchParams('ref=abc&x=1'))!);
    expect(url.searchParams.get('ref')).toBe('abc');
    expect(url.searchParams.get('x')).toBe('1');
  });

  it('lets the table win over utm_* supplied by the visitor (attribution cannot be spoofed)', () => {
    const url = new URL(
      resolveShortLink([row()], 'demo', new URLSearchParams('utm_source=twitter&utm_campaign=hijack'))!,
    );
    expect(url.searchParams.get('utm_source')).toBe('note');
    expect(url.searchParams.get('utm_campaign')).toBe('note_demo');
    expect(url.searchParams.getAll('utm_source')).toHaveLength(1);
  });

  it('★emits NO utm_content parameter when the row is empty (absent ≠ empty in a URL)', () => {
    const url = new URL(resolveShortLink([row({ utmContent: '' })], 'demo')!);
    expect(url.searchParams.has('utm_content')).toBe(false);
    expect(url.toString()).not.toContain('utm_content');
    // ★Positive control in the same call: a non-empty one IS emitted, so "absent" is the branch and
    //   not a resolver that dropped every utm parameter.
    expect(new URL(resolveShortLink([row()], 'demo')!).searchParams.get('utm_content')).toBe('body_cta');
  });

  it('emits utm_term only when the row has one', () => {
    expect(new URL(resolveShortLink([row()], 'demo')!).searchParams.has('utm_term')).toBe(false);
    expect(
      new URL(resolveShortLink([row({ utmTerm: 't' })], 'demo')!).searchParams.get('utm_term'),
    ).toBe('t');
  });

  it('honours an allowlisted host', () => {
    expect(new URL(resolveShortLink([row({ host: 'mued.jp', path: '/learn' })], 'demo')!).host).toBe(
      'mued.jp',
    );
  });

  // ★The property: whatever a table row says, the visitor lands on an allowlisted host.
  describe('cannot be walked off our hosts', () => {
    const escapes = [
      ['protocol-relative', '//evil.example'],
      ['backslash (WHATWG folds it into "/")', '/\\evil.example'],
      ['double backslash', '\\\\evil.example'],
      ['absolute URL in the path field', 'https://evil.example/x'],
      ['scheme-ish', 'javascript:alert(1)'],
      ['CRLF', '/a\r\nLocation: https://evil.example'],
    ] as const;

    for (const [name, path] of escapes) {
      it(`rejects ${name}`, () => {
        const out = resolveShortLink([row({ path })], 'demo');
        // Either refused outright, or — if it ever resolves — still on an allowlisted host.
        if (out !== null) {
          expect(ALLOWED_HOSTS).toContain(new URL(out).host as (typeof ALLOWED_HOSTS)[number]);
        } else {
          expect(out).toBeNull();
        }
      });
    }

    it('★positive control: a legitimate path is NOT rejected by the same guard', () => {
      // Without this, every case above would also pass if resolveShortLink always returned null.
      expect(resolveShortLink([row({ path: '/dial/waitlist' })], 'demo')).not.toBeNull();
    });
  });
});

describe('validateTable', () => {
  it('accepts a well-formed row', () => {
    expect(validateTable([row()])).toEqual([]);
  });

  it('catches a duplicate slug', () => {
    const problems = validateTable([row(), row()]);
    expect(problems.some((p) => p.problem.includes('重複'))).toBe(true);
  });

  it('catches a malformed slug', () => {
    expect(validateTable([row({ slug: 'Has Caps And Spaces' })])).not.toEqual([]);
    expect(validateTable([row({ slug: '' })])).not.toEqual([]);
  });

  it('catches a host outside the allowlist', () => {
    expect(
      validateTable([row({ host: 'evil.example' as unknown as ShortLink['host'] })]),
    ).not.toEqual([]);
  });

  it('catches an empty utm_source / medium / campaign', () => {
    expect(validateTable([row({ utmCampaign: '   ' })])).not.toEqual([]);
    expect(validateTable([row({ utmSource: '' })])).not.toEqual([]);
    expect(validateTable([row({ utmMedium: '' })])).not.toEqual([]);
  });

  // ★utm_content is the one utm field that may be empty. 19 of the 60 real article links never carried
  //   one (measured 2026-08-29), and GA4 already holds them as a single `(not set)` bucket — there is no
  //   series a non-empty rule would protect. The property is uniqueness, asserted below.
  it('★accepts an EMPTY utm_content (never having one is not the same as losing one)', () => {
    expect(validateTable([row({ utmContent: '' })])).toEqual([]);
  });

  it('★rejects a MISSING utm_content (the type requires it; dropping it is still a defect)', () => {
    expect(
      validateTable([{ ...row(), utmContent: undefined } as unknown as ShortLink]),
    ).not.toEqual([]);
  });

  it('★catches two rows that collapse into one GA4 bucket — same (campaign, content)', () => {
    const problems = validateTable([
      row({ slug: 'aa', utmCampaign: 'c1', utmContent: 'x' }),
      row({ slug: 'bb', utmCampaign: 'c1', utmContent: 'x' }),
    ]);
    expect(problems.some((p) => p.problem.includes('重複'))).toBe(true);
  });

  it('★two EMPTY-content rows are fine while their campaigns differ (the real 19-row shape)', () => {
    expect(
      validateTable([
        row({ slug: 'aa', utmCampaign: 'c1', utmContent: '' }),
        row({ slug: 'bb', utmCampaign: 'c2', utmContent: '' }),
      ]),
    ).toEqual([]);
  });

  it('★…but two EMPTY-content rows under the SAME campaign are not (indistinguishable)', () => {
    expect(
      validateTable([
        row({ slug: 'aa', utmCampaign: 'c1', utmContent: '' }),
        row({ slug: 'bb', utmCampaign: 'c1', utmContent: '' }),
      ]).some((p) => p.problem.includes('重複')),
    ).toBe(true);
  });

  it('catches a path that could escape the host', () => {
    expect(validateTable([row({ path: '//evil.example' })])).not.toEqual([]);
    expect(validateTable([row({ path: '/\\evil.example' })])).not.toEqual([]);
  });

  it('reports every problem, not just the first', () => {
    // ★utmContent: '' is legal now, so the two problems have to be genuinely separate ones.
    expect(validateTable([row({ slug: 'BAD', utmCampaign: '' })]).length).toBeGreaterThan(1);
  });
});

describe('assertNonVacuous', () => {
  it('throws on an empty table', () => {
    expect(() => assertNonVacuous([])).toThrow(/空/);
  });

  it('passes once there is at least one row', () => {
    expect(() => assertNonVacuous([row()])).not.toThrow();
  });
});

describe('the shipped table', () => {
  // ★Ratchet, not a target. Empty utm_content is legal — 19 of the ported rows never had one — but the
  //   table cannot tell "never had one" from "had one and lost it", which is the case condition ② exists
  //   to stop. So the COUNT is pinned: a row that silently goes blank pushes it to 20 and fails here.
  //   ★Adding a new link that genuinely has no utm_content also fails, on purpose — bumping this number
  //   is a one-line, conscious edit, which is the whole point. ★Do not update it to make a red go green
  //   without checking which of the two happened.
  //
  // ★WHERE 19 COMES FROM: the 60 dial.mued.jp links in `drafts/published/*.md` as measured 2026-08-29
  //   (conductor, _conductor docs/handoff/short-links-porting-20260829.md). ★It is a property of that
  //   article set, not of this code — ★it moves legitimately when articles are added or edited.
  //
  // ★HOW TO UPDATE IT LEGITIMATELY (so a real update and a silent loss stay distinguishable):
  //   1. Re-count the empty utm_content links in the article corpus with the SAME predicate.
  //   2. If the corpus number matches the new table number → update this baseline, and say in the
  //      commit which articles changed.
  //   3. If they DISAGREE → a row lost a value it used to have. That is the defect this pins. Do not
  //      touch this number; fix the row.
  //   ★Without step 3 the ratchet becomes a formality that gets bumped whenever it turns red.
  //   ★UPDATED 19 → 21 on 2026-08-29, by running the procedure above: product課 found the port was
  //   missing two links (the corpus has 62 dial links, not 60). Step 1 re-counted the corpus at 21
  //   empty; step 2 matched the table's 21 → legitimate update, not a lost value.
  const EMPTY_CONTENT_BASELINE = 21;

  it(`★has exactly ${EMPTY_CONTENT_BASELINE} rows with an empty utm_content (ratchet)`, () => {
    expect(SHORT_LINKS.filter((r) => r.utmContent === '').length).toBe(EMPTY_CONTENT_BASELINE);
  });

  it('★every empty-content row is still unique by campaign alone', () => {
    // ★insight課 2026-08-29: these 19 are distinguished by utm_campaign on its own — the
    //   (campaign, content) pair is what carries the OTHER 41. Asserting the actual property here
    //   rather than relying on the pair check to cover both cases.
    const empties = SHORT_LINKS.filter((r) => r.utmContent === '');
    expect(new Set(empties.map((r) => r.utmCampaign)).size).toBe(empties.length);
  });

  it('has no malformed rows', () => {
    // ★Vacuously true while the table is empty. That is why it is not the only check —
    //   scripts/verify/short-links.ts refuses to report green on an empty table.
    expect(validateTable(SHORT_LINKS)).toEqual([]);
  });

  it('every row resolves onto an allowlisted host', () => {
    for (const r of SHORT_LINKS) {
      const out = resolveShortLink(SHORT_LINKS, r.slug);
      expect(out).not.toBeNull();
      expect(ALLOWED_HOSTS).toContain(new URL(out!).host as (typeof ALLOWED_HOSTS)[number]);
    }
  });
});

describe("localeFromBrowser (masterchain plugin links, conductor 2026-09-30)", () => {
  const mc = row({ slug: "mc-buy", host: "mued.jp", path: "/en/muedsp", localeFromBrowser: true });
  it.each([
    ["ja,en-US;q=0.9", "/ja/muedsp"],
    ["ja-JP", "/ja/muedsp"],
    ["en-US,ja;q=0.8", "/en/muedsp"], // ★first preference only
    ["", "/en/muedsp"],
    [null, "/en/muedsp"],
  ])("Accept-Language %j → %s", (al, path) => {
    expect(new URL(resolveShortLink([mc], "mc-buy", undefined, al)!).pathname).toBe(path);
  });
  it("a row without the flag never changes path", () => {
    expect(new URL(resolveShortLink([row({ path: "/en/muedsp" })], "demo", undefined, "ja")!).pathname).toBe("/en/muedsp");
  });
  it("prefersJapanese reads only the first preference", () => {
    expect(prefersJapanese("ja")).toBe(true);
    expect(prefersJapanese("jax")).toBe(false);
    expect(prefersJapanese("en,ja")).toBe(false);
  });
});

describe("the four masterchain plugin links in the shipped table", () => {
  it("resolve to the agreed places and utm (baked into the binary — never change)", () => {
    const get = (slug: string, al?: string) => new URL(resolveShortLink(SHORT_LINKS, slug, undefined, al)!);
    expect(get("mc-plugin").pathname).toBe("/en/muedsp");
    expect(get("mc-plugin", "ja").pathname).toBe("/ja/muedsp");
    expect(get("mc-plugin").searchParams.get("utm_campaign")).toBe("masterchain_header");
    expect(get("mc-plugin").searchParams.get("utm_source")).toBe("muedsp_plugin");
    expect(get("mc-plugin").searchParams.get("utm_medium")).toBe("inapp");
    expect(get("mc-portal").pathname).toBe("/dashboard/plugins");
    expect(get("mc-portal", "ja").pathname).toBe("/dashboard/plugins");
    expect(get("mc-portal").searchParams.get("utm_campaign")).toBe("masterchain_portal");
    expect(get("mc-buy", "ja").pathname).toBe("/ja/muedsp");
    expect(get("mc-trial", "ja").pathname).toBe("/ja/muedsp");
    expect(get("mc-demo-mail", "ja").pathname).toBe("/ja/muedsp");
    expect(get("mc-demo-mail").searchParams.get("utm_campaign")).toBe("masterchain_demo_mail");
  });
});
