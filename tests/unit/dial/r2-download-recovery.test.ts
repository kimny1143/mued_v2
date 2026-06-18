import { describe, it, expect } from 'vitest';
import {
  isR2Source,
  shouldRefreshR2Bookkeeping,
  R2_REFRESH_WINDOW_MS,
} from '@/lib/dial/r2-download-recovery';

const NOW = new Date('2026-06-19T00:00:00.000Z');
const day = 24 * 60 * 60 * 1000;

describe('isR2Source', () => {
  it('true only when sourceUrl is the task r2FinalUrl', () => {
    expect(isR2Source({ r2FinalUrl: 'r2://x' }, 'r2://x')).toBe(true);
    expect(isR2Source({ r2FinalUrl: 'r2://x' }, 'gcs://x')).toBe(false); // fell back to GCS
    expect(isR2Source({ r2FinalUrl: null }, 'gcs://x')).toBe(false); // no R2 copy
    expect(isR2Source(null, 'gcs://x')).toBe(false);
    expect(isR2Source(undefined, 'gcs://x')).toBe(false);
  });
});

describe('shouldRefreshR2Bookkeeping', () => {
  it('refreshes when within the window or already past', () => {
    expect(shouldRefreshR2Bookkeeping(new Date(NOW.getTime() + 3 * day), NOW)).toBe(true); // 3d left ≤ 7d
    expect(shouldRefreshR2Bookkeeping(new Date(NOW.getTime() - 5 * day), NOW)).toBe(true); // already past
    expect(shouldRefreshR2Bookkeeping(NOW, NOW)).toBe(true); // 0 left
  });

  it('does NOT refresh when well outside the window', () => {
    expect(shouldRefreshR2Bookkeeping(new Date(NOW.getTime() + 20 * day), NOW)).toBe(false); // 20d left
    expect(shouldRefreshR2Bookkeeping(new Date(NOW.getTime() + 8 * day), NOW)).toBe(false); // 8d > 7d
  });

  it('null expiry → no refresh', () => {
    expect(shouldRefreshR2Bookkeeping(null, NOW)).toBe(false);
  });

  it('accepts an ISO string (DB/JSON serialized date)', () => {
    expect(shouldRefreshR2Bookkeeping(new Date(NOW.getTime() + 2 * day).toISOString(), NOW)).toBe(true);
  });

  it('boundary: exactly the window edge is not refreshed (strict <)', () => {
    const edge = new Date(NOW.getTime() + R2_REFRESH_WINDOW_MS);
    expect(shouldRefreshR2Bookkeeping(edge, NOW)).toBe(false); // diff === windowMs, not <
  });
});
