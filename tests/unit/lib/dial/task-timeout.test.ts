/**
 * MUEDial task-timeout helper unit tests (pure functions).
 * Guards the thresholds that flip a never-completing RoEx task to `failed`
 * instead of letting it spin forever.
 */
import { describe, it, expect } from 'vitest';
import {
  DIAL_FREE_PREVIEW_TIMEOUT_MS,
  DIAL_PAID_RENDER_TIMEOUT_MS,
  getDialTaskTimeoutMs,
  isDialTaskTimedOut,
} from '@/lib/dial/task-timeout';

describe('timeout constants', () => {
  it('free preview = 3 min, paid render = 10 min', () => {
    expect(DIAL_FREE_PREVIEW_TIMEOUT_MS).toBe(3 * 60_000);
    expect(DIAL_PAID_RENDER_TIMEOUT_MS).toBe(10 * 60_000);
  });
});

describe('getDialTaskTimeoutMs', () => {
  it('free (preview-class) types use the free timeout', () => {
    expect(getDialTaskTimeoutMs('preview')).toBe(DIAL_FREE_PREVIEW_TIMEOUT_MS);
    expect(getDialTaskTimeoutMs('mastering_preview')).toBe(DIAL_FREE_PREVIEW_TIMEOUT_MS);
  });

  it('paid render types use the paid timeout', () => {
    for (const t of ['final_basic', 'final_advanced', 'mix_check', 'mastering']) {
      expect(getDialTaskTimeoutMs(t)).toBe(DIAL_PAID_RENDER_TIMEOUT_MS);
    }
  });

  it('unknown task types default to the conservative (paid) timeout', () => {
    expect(getDialTaskTimeoutMs('something_else')).toBe(DIAL_PAID_RENDER_TIMEOUT_MS);
  });
});

describe('isDialTaskTimedOut', () => {
  const now = 1_700_000_000_000;

  it('is false just under the free timeout', () => {
    const created = new Date(now - (DIAL_FREE_PREVIEW_TIMEOUT_MS - 1000));
    expect(isDialTaskTimedOut(created, 'preview', now)).toBe(false);
  });

  it('is true just over the free timeout', () => {
    const created = new Date(now - (DIAL_FREE_PREVIEW_TIMEOUT_MS + 1000));
    expect(isDialTaskTimedOut(created, 'preview', now)).toBe(true);
  });

  it('uses the paid threshold for paid renders (free-timeout overrun is not enough)', () => {
    const pastFreeOnly = new Date(now - (DIAL_FREE_PREVIEW_TIMEOUT_MS + 1000));
    expect(isDialTaskTimedOut(pastFreeOnly, 'final_basic', now)).toBe(false);

    const pastPaid = new Date(now - (DIAL_PAID_RENDER_TIMEOUT_MS + 1000));
    expect(isDialTaskTimedOut(pastPaid, 'final_basic', now)).toBe(true);
  });

  it('accepts an ISO-string createdAt', () => {
    const created = new Date(now - (DIAL_FREE_PREVIEW_TIMEOUT_MS + 5000)).toISOString();
    expect(isDialTaskTimedOut(created, 'preview', now)).toBe(true);
  });

  it('a healthy ~35s task is never timed out', () => {
    const created = new Date(now - 35_000);
    expect(isDialTaskTimedOut(created, 'preview', now)).toBe(false);
    expect(isDialTaskTimedOut(created, 'mastering', now)).toBe(false);
  });
});
