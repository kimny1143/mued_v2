import { describe, it, expect } from 'vitest';
import { findCrossedThreshold } from '@/lib/dial/bonus-campaign';

describe('findCrossedThreshold', () => {
  it('returns undefined when no threshold is crossed', () => {
    expect(findCrossedThreshold(10, 50, null)).toBeUndefined();
  });

  it('returns 80 when crossing 80% for the first time', () => {
    expect(findCrossedThreshold(79, 81, null)).toBe(80);
  });

  it('returns 95 when crossing 95% for the first time (80 already alerted)', () => {
    expect(findCrossedThreshold(94, 96, 80)).toBe(95);
  });

  it('returns 100 when crossing 100% (95 already alerted)', () => {
    expect(findCrossedThreshold(99, 101, 95)).toBe(100);
  });

  it('skips already-alerted 80 and returns 95 when both crossed in one grant', () => {
    // Single large grant that jumps from 79% to 96%
    expect(findCrossedThreshold(79, 96, 80)).toBe(95);
  });

  it('returns 80 (lowest) when multiple thresholds crossed in one grant and none alerted', () => {
    expect(findCrossedThreshold(10, 99, null)).toBe(80);
  });

  it('returns undefined when 80% already alerted and new pct < 95', () => {
    expect(findCrossedThreshold(82, 88, 80)).toBeUndefined();
  });

  it('returns undefined when 100% already alerted (no higher threshold)', () => {
    expect(findCrossedThreshold(100, 102, 100)).toBeUndefined();
  });

  it('handles exact boundary values — at exactly 80 counts as crossed', () => {
    expect(findCrossedThreshold(79.99, 80, null)).toBe(80);
  });

  it('returns undefined when prevPct is already at 80 (not newly crossed)', () => {
    expect(findCrossedThreshold(80, 82, null)).toBeUndefined();
  });
});
