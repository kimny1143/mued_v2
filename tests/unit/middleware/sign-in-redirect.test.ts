/**
 * buildSignInRedirectTarget — the post-sign-in destination handed to Clerk as `redirect_url`.
 *
 * Two things are easy to get wrong and both are load-bearing: keeping the query string (dropping it
 * is how the welcome emails' campaign parameters were being lost) and never producing a value that
 * could point at another origin.
 */

import { describe, it, expect } from 'vitest';
import { buildSignInRedirectTarget } from '@/lib/middleware/sign-in-redirect';

describe('buildSignInRedirectTarget', () => {
  it('keeps the query string', () => {
    expect(
      buildSignInRedirectTarget('/dashboard/plugins', '?utm_source=email&utm_campaign=email_welcome-muedsat'),
    ).toBe('/dashboard/plugins?utm_source=email&utm_campaign=email_welcome-muedsat');
  });

  it('returns the bare path when there is no query', () => {
    expect(buildSignInRedirectTarget('/dashboard/plugins')).toBe('/dashboard/plugins');
    expect(buildSignInRedirectTarget('/dashboard/plugins', '')).toBe('/dashboard/plugins');
  });

  it('accepts a query string that was passed without its leading "?"', () => {
    expect(buildSignInRedirectTarget('/dashboard', 'a=1&b=2')).toBe('/dashboard?a=1&b=2');
  });

  // Leading "//" AND "/\" are both read as protocol-relative — browsers treat the backslash as a
  // slash, so /\evil.example resolves to https://evil.example exactly like //evil.example does.
  it('collapses leading slashes and backslashes so the value cannot become protocol-relative', () => {
    expect(buildSignInRedirectTarget('//evil.example/path')).toBe('/evil.example/path');
    expect(buildSignInRedirectTarget('////evil.example')).toBe('/evil.example');
    expect(buildSignInRedirectTarget('//evil.example', '?x=1')).toBe('/evil.example?x=1');
    expect(buildSignInRedirectTarget('/\\evil.example')).toBe('/evil.example');
    expect(buildSignInRedirectTarget('\\\\evil.example')).toBe('/evil.example');
    expect(buildSignInRedirectTarget('/\\/\\evil.example')).toBe('/evil.example');
  });

  it('roots a path that arrives without a leading slash', () => {
    expect(buildSignInRedirectTarget('dashboard/plugins')).toBe('/dashboard/plugins');
  });

  // Assert the property that actually matters — where the value RESOLVES — not the proxy "it isn't a
  // scheme-qualified absolute URL". `/\evil.example` satisfies the proxy and still resolves off-origin.
  it('always resolves to the same origin', () => {
    const base = 'https://mued.jp';
    const hostile = [
      '//evil.example',
      '///evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      '/\\/evil.example',
      '/dashboard/plugins',
    ];
    for (const pathname of hostile) {
      const target = buildSignInRedirectTarget(pathname, '?utm_source=email');
      expect(new URL(target, base).origin).toBe(base);
    }
  });
});
