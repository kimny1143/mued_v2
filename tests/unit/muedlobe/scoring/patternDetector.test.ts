import { describe, it, expect } from 'vitest';
import { detectPatterns } from '@/lib/muedlobe/scoring/patternDetector';
import type { Scores } from '@/types/muedlobe';

function makeScores(overrides: Partial<Scores> = {}): Scores {
  return { wm: 50, ps: 50, vc: 50, pr: 50, att: 50, ...overrides };
}

describe('patternDetector', () => {
  describe('pairwise patterns', () => {
    it('detects high_wm_low_ps when WM is 15+ above PS', () => {
      const patterns = detectPatterns(makeScores({ wm: 70, ps: 50 }));
      expect(patterns).toContain('high_wm_low_ps');
    });

    it('detects low_wm_high_ps when PS is 15+ above WM', () => {
      const patterns = detectPatterns(makeScores({ wm: 35, ps: 55 }));
      expect(patterns).toContain('low_wm_high_ps');
    });

    it('does not detect pairwise pattern at exactly threshold-1', () => {
      const patterns = detectPatterns(makeScores({ wm: 64, ps: 50 }));
      expect(patterns).not.toContain('high_wm_low_ps');
    });

    it('detects pairwise pattern at exactly threshold', () => {
      const patterns = detectPatterns(makeScores({ wm: 65, ps: 50 }));
      expect(patterns).toContain('high_wm_low_ps');
    });

    it('detects multiple pairwise patterns', () => {
      const patterns = detectPatterns(makeScores({ wm: 80, ps: 30, vc: 50, pr: 50 }));
      expect(patterns).toContain('high_wm_low_ps');
    });
  });

  describe('composite types', () => {
    it('detects architect_type', () => {
      const patterns = detectPatterns(makeScores({ wm: 70, ps: 45, pr: 70 }));
      expect(patterns).toContain('architect_type');
    });

    it('detects performer_type', () => {
      const patterns = detectPatterns(makeScores({ wm: 35, ps: 70 }));
      expect(patterns).toContain('performer_type');
    });

    it('detects theorist_type', () => {
      const patterns = detectPatterns(makeScores({ wm: 70, vc: 70, pr: 45 }));
      expect(patterns).toContain('theorist_type');
    });

    it('detects visualizer_type', () => {
      const patterns = detectPatterns(makeScores({ pr: 70, vc: 45 }));
      expect(patterns).toContain('visualizer_type');
    });

    it('detects balanced_type when core 4 scores within 15 (ATT excluded)', () => {
      const patterns = detectPatterns(makeScores({ wm: 50, ps: 55, vc: 48, pr: 52, att: 20 }));
      expect(patterns).toContain('balanced_type');
    });

    it('does not detect balanced_type when core 4 range >= 15', () => {
      const patterns = detectPatterns(makeScores({ wm: 43, ps: 58, vc: 50, pr: 50, att: 50 }));
      expect(patterns).not.toContain('balanced_type');
    });

    it('detects balanced_type at range=14 (strict < 15)', () => {
      const patterns = detectPatterns(makeScores({ wm: 43, ps: 57, vc: 50, pr: 50 }));
      expect(patterns).toContain('balanced_type');
    });

    it('does not detect balanced_type at range=15 (strict < 15)', () => {
      const patterns = detectPatterns(makeScores({ wm: 43, ps: 58, vc: 50, pr: 50 }));
      expect(patterns).not.toContain('balanced_type');
    });
  });

  describe('ATT modifiers', () => {
    it('detects low_attention_modifier when ATT <= 35', () => {
      const patterns = detectPatterns(makeScores({ att: 35 }));
      expect(patterns).toContain('low_attention_modifier');
    });

    it('detects high_attention_modifier when ATT >= 65', () => {
      const patterns = detectPatterns(makeScores({ att: 65 }));
      expect(patterns).toContain('high_attention_modifier');
    });

    it('detects no ATT modifier for middle range', () => {
      const patterns = detectPatterns(makeScores({ att: 50 }));
      expect(patterns).not.toContain('low_attention_modifier');
      expect(patterns).not.toContain('high_attention_modifier');
    });
  });

  describe('no patterns', () => {
    it('returns empty array for perfectly balanced scores', () => {
      const patterns = detectPatterns(makeScores());
      // all 50 -> balanced_type should be detected since max-min = 0
      expect(patterns).toContain('balanced_type');
      // but no pairwise or ATT modifier patterns
      expect(patterns.filter((p) => !p.endsWith('_type'))).toHaveLength(0);
    });
  });
});
