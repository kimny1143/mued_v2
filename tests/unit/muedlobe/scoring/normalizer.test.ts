import { describe, it, expect } from 'vitest';
import { normalizeScore, normalizeAllScores } from '@/lib/muedlobe/scoring/normalizer';

describe('normalizer', () => {
  describe('normalizeScore', () => {
    it('returns 50 for mean value', () => {
      expect(normalizeScore(12, { mean: 12, sd: 4 })).toBe(50);
    });

    it('returns 65 for 1 SD above mean', () => {
      expect(normalizeScore(16, { mean: 12, sd: 4 })).toBe(65);
    });

    it('returns 35 for 1 SD below mean', () => {
      expect(normalizeScore(8, { mean: 12, sd: 4 })).toBe(35);
    });

    it('clamps to 0 for very low scores', () => {
      // 12 - 20 = -8, z = -8/4 = -2, normalized = 50 + (-2)*15 = 20
      expect(normalizeScore(-8, { mean: 12, sd: 4 })).toBe(0);
    });

    it('clamps to 100 for very high scores', () => {
      // z = (40-12)/4 = 7, normalized = 50 + 7*15 = 155 -> clamped to 100
      expect(normalizeScore(40, { mean: 12, sd: 4 })).toBe(100);
    });

    it('returns 50 when sd is 0', () => {
      expect(normalizeScore(999, { mean: 12, sd: 0 })).toBe(50);
    });

    it('rounds to integer', () => {
      // z = (13-12)/4 = 0.25, normalized = 50 + 0.25*15 = 53.75 -> 54
      expect(normalizeScore(13, { mean: 12, sd: 4 })).toBe(54);
    });
  });

  describe('normalizeAllScores', () => {
    it('normalizes all 5 variables using INITIAL_NORMS', () => {
      const result = normalizeAllScores({
        wm: 16,    // mean -> 50
        ps: 35,    // mean -> 50
        vc: 15,    // mean -> 50
        pr: 12,    // mean -> 50
        att: 2.5,  // mean -> 50
      });

      expect(result.wm).toBe(50);
      expect(result.ps).toBe(50);
      expect(result.vc).toBe(50);
      expect(result.pr).toBe(50);
      expect(result.att).toBe(50);
    });

    it('produces higher scores for above-mean inputs', () => {
      const result = normalizeAllScores({
        wm: 21,    // +1 SD (mean=16, sd=5)
        ps: 50,    // +1 SD (mean=35, sd=15)
        vc: 20,    // +1 SD (mean=15, sd=5)
        pr: 17,    // +1 SD (mean=12, sd=5)
        att: 3.3,  // +1 SD (mean=2.5, sd=0.8)
      });

      expect(result.wm).toBe(65);
      expect(result.ps).toBe(65);
      expect(result.vc).toBe(65);
      expect(result.pr).toBe(65);
      expect(result.att).toBe(65);
    });

    it('produces lower scores for below-mean inputs', () => {
      const result = normalizeAllScores({
        wm: 11,    // -1 SD (mean=16, sd=5)
        ps: 20,    // -1 SD (mean=35, sd=15)
        vc: 10,    // -1 SD (mean=15, sd=5)
        pr: 7,     // -1 SD (mean=12, sd=5)
        att: 1.7,  // -1 SD (mean=2.5, sd=0.8)
      });

      expect(result.wm).toBe(35);
      expect(result.ps).toBe(35);
      expect(result.vc).toBe(35);
      expect(result.pr).toBe(35);
      expect(result.att).toBe(35);
    });
  });
});
