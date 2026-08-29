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

  it('catches an empty utm field — utm_content especially (condition ②)', () => {
    expect(validateTable([row({ utmContent: '' })]).some((p) => p.problem.includes('utmContent'))).toBe(
      true,
    );
    expect(validateTable([row({ utmCampaign: '   ' })])).not.toEqual([]);
  });

  it('catches a path that could escape the host', () => {
    expect(validateTable([row({ path: '//evil.example' })])).not.toEqual([]);
    expect(validateTable([row({ path: '/\\evil.example' })])).not.toEqual([]);
  });

  it('reports every problem, not just the first', () => {
    expect(validateTable([row({ slug: 'BAD', utmContent: '' })]).length).toBeGreaterThan(1);
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
