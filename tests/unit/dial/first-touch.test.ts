import { describe, it, expect } from 'vitest';
import { buildFirstTouch } from '@/lib/dial/first-touch';

function headers(init: Record<string, string> = {}): Headers {
  return new Headers(init);
}

describe('buildFirstTouch', () => {
  it('returns null when no referer header and no client payload', () => {
    expect(buildFirstTouch(headers())).toBeNull();
    expect(buildFirstTouch(headers(), {})).toBeNull();
    expect(buildFirstTouch(headers(), undefined)).toBeNull();
  });

  it('records the server referer header alone, with a server timestamp', () => {
    const ft = buildFirstTouch(headers({ referer: 'https://dial.mued.jp/dial' }));
    expect(ft).not.toBeNull();
    expect(ft!.refererHeader).toBe('https://dial.mued.jp/dial');
    expect(typeof ft!.serverCapturedAt).toBe('string');
  });

  it('merges client first-touch with the server referer header', () => {
    const ft = buildFirstTouch(headers({ referer: 'https://dial.mued.jp/dial/pricing' }), {
      referrer: 'https://www.threads.net/@mued',
      utmSource: 'threads',
      utmMedium: 'bio',
      utmCampaign: 'launch',
      utmContent: 'cta',
      utmTerm: 'aimix',
      landingPath: '/dial?utm_source=threads',
      gaClientId: '123456789.1700000000',
      capturedAt: '2026-06-09T00:00:00.000Z',
    });
    expect(ft).toMatchObject({
      referrer: 'https://www.threads.net/@mued',
      refererHeader: 'https://dial.mued.jp/dial/pricing',
      utmSource: 'threads',
      utmMedium: 'bio',
      utmCampaign: 'launch',
      utmContent: 'cta',
      utmTerm: 'aimix',
      landingPath: '/dial?utm_source=threads',
      gaClientId: '123456789.1700000000',
      capturedAt: '2026-06-09T00:00:00.000Z',
    });
    expect(typeof ft!.serverCapturedAt).toBe('string');
  });

  it('ignores non-string and empty fields, trims, and clips overly long values', () => {
    const long = 'x'.repeat(5000);
    const ft = buildFirstTouch(headers(), {
      referrer: '  https://example.com  ',
      utmSource: '',
      utmMedium: 123 as unknown as string,
      landingPath: long,
    });
    expect(ft).not.toBeNull();
    expect(ft!.referrer).toBe('https://example.com');
    expect(ft!.utmSource).toBeUndefined();
    expect(ft!.utmMedium).toBeUndefined();
    expect(ft!.landingPath!.length).toBe(2048);
  });

  it('never throws on a malformed client payload', () => {
    expect(() => buildFirstTouch(headers(), 'not-an-object')).not.toThrow();
    expect(buildFirstTouch(headers(), 'not-an-object')).toBeNull();
  });
});
