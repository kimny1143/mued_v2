import { describe, it, expect } from 'vitest';
import { estimateCompCr, COMP_DAILY_CAP, COMP_TYPE, CompGrantError } from '@/lib/dial/comp';
import { DIAL_CREDIT_COSTS } from '@/lib/dial/pricing';

describe('estimateCompCr', () => {
  it('omakase + mastering ≈ omakase final + mastering', () => {
    expect(estimateCompCr({ mode: 'omakase', masteringMode: 'omakase' }))
      .toBe(DIAL_CREDIT_COSTS.omakase + DIAL_CREDIT_COSTS.mastering);
  });

  it('dialogue without mastering ≈ dialogue final (250)', () => {
    expect(estimateCompCr({ mode: 'dialogue', masteringMode: null })).toBe(250);
  });

  it('dialogue + mastering ≈ 250 + mastering', () => {
    expect(estimateCompCr({ mode: 'dialogue', masteringMode: 'omakase' }))
      .toBe(250 + DIAL_CREDIT_COSTS.mastering);
  });

  it('mastering-only (no mix mode) falls back to the mastering cost', () => {
    expect(estimateCompCr({ mode: null, masteringMode: 'omakase' })).toBe(DIAL_CREDIT_COSTS.mastering);
  });

  it('is always a positive credit estimate', () => {
    for (const s of [
      { mode: 'omakase', masteringMode: null },
      { mode: 'dialogue', masteringMode: 'omakase' },
      { mode: null, masteringMode: 'omakase' },
    ]) {
      expect(estimateCompCr(s)).toBeGreaterThan(0);
    }
  });
});

describe('comp constants & error', () => {
  it('daily cap is 3 (kimny gate)', () => {
    expect(COMP_DAILY_CAP).toBe(3);
  });

  it('comp type is retake_cycle', () => {
    expect(COMP_TYPE).toBe('retake_cycle');
  });

  it('CompGrantError carries a machine-readable reason', () => {
    const e = new CompGrantError('daily_cap_reached', { usedToday: 3, cap: 3 });
    expect(e.reason).toBe('daily_cap_reached');
    expect(e.detail).toEqual({ usedToday: 3, cap: 3 });
    expect(e).toBeInstanceOf(Error);
  });
});
