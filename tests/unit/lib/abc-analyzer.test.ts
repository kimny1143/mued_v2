/**
 * Unit Tests: ABC Analyzer
 *
 * Critical test coverage for the ABC notation analysis engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeAbc,
  calculatePlayabilityScore,
  calculateLearningValueScore,
  passesQualityGate,
  explainAnalysis,
} from '@/lib/abc-analyzer';

describe('ABC Analyzer', () => {
  describe('analyzeAbc', () => {
    it('should successfully parse valid ABC notation', () => {
      const abc = `
X:1
T:C Major Scale
M:4/4
L:1/4
Q:1/4=120
K:Cmaj
C D E F | G A B c | c B A G | F E D C |
      `.trim();

      const analysis = analyzeAbc(abc, 'piano');

      expect(analysis).not.toBeNull();
      expect(analysis?.note_count).toBe(16);
      expect(analysis?.measure_count).toBeGreaterThan(0);
      expect(analysis?.tempo_qpm).toBe(120);
      expect(analysis?.instrument).toBe('piano');
    });

    it('should handle invalid ABC notation gracefully', () => {
      const invalidAbc = 'This is not ABC notation';
      const analysis = analyzeAbc(invalidAbc, 'piano');

      // abcjs may still attempt to parse invalid input, so we check for minimal validity
      // instead of expecting null
      if (analysis) {
        expect(analysis.note_count).toBeLessThan(10);
      } else {
        expect(analysis).toBeNull();
      }
    });

    it('should handle empty ABC notation', () => {
      const analysis = analyzeAbc('', 'piano');
      expect(analysis).toBeNull();
    });

    it('should calculate correct range statistics', () => {
      const abc = `
X:1
M:4/4
L:1/4
K:Cmaj
C c | C, c' |
      `.trim();

      const analysis = analyzeAbc(abc, 'piano');

      expect(analysis).not.toBeNull();
      expect(analysis?.range_span).toBeGreaterThan(12); // More than an octave
    });

    it('should detect chromatic passages correctly', () => {
      const chromaticAbc = `
X:1
M:4/4
L:1/4
K:Cmaj
C ^C D ^D | E F ^F G |
      `.trim();

      const analysis = analyzeAbc(chromaticAbc, 'piano');

      expect(analysis).not.toBeNull();
      expect(analysis?.chromatic_density).toBeGreaterThan(0.3);
    });

    it('should identify repetition patterns', () => {
      const repetitiveAbc = `
X:1
M:4/4
L:1/4
K:Cmaj
C D E F | C D E F | G A B c | G A B c |
      `.trim();

      const analysis = analyzeAbc(repetitiveAbc, 'piano');

      expect(analysis).not.toBeNull();
      expect(analysis?.repetition_ratio).toBeGreaterThan(0);
      expect(analysis?.sequence_count).toBeGreaterThan(0);
    });

    it('should handle different instruments', () => {
      const abc = `
X:1
M:4/4
L:1/4
K:Cmaj
C D E F | G A B c |
      `.trim();

      const pianoAnalysis = analyzeAbc(abc, 'piano');
      const violinAnalysis = analyzeAbc(abc, 'violin');
      const fluteAnalysis = analyzeAbc(abc, 'flute');

      expect(pianoAnalysis?.instrument).toBe('piano');
      expect(violinAnalysis?.instrument).toBe('violin');
      expect(fluteAnalysis?.instrument).toBe('flute');

      // Different instruments may have different playability scores
      expect(pianoAnalysis?.playability_score).toBeDefined();
      expect(violinAnalysis?.playability_score).toBeDefined();
      expect(fluteAnalysis?.playability_score).toBeDefined();
    });

    it('should extract tempo variations', () => {
      const tempoTests = [
        { abc: 'Q:1/4=60', expected: 60 },
        { abc: 'Q:1/4=120', expected: 120 },
        { abc: 'Q:1/4=180', expected: 180 },
        { abc: 'Q:120', expected: 120 },
      ];

      tempoTests.forEach(({ abc, expected }) => {
        const fullAbc = `
X:1
M:4/4
L:1/4
${abc}
K:Cmaj
C D E F |
        `.trim();

        const analysis = analyzeAbc(fullAbc, 'piano');
        expect(analysis?.tempo_qpm).toBe(expected);
      });
    });

    it('should estimate difficulty levels correctly', () => {
      const easyAbc = `
X:1
M:4/4
L:1/4
Q:1/4=80
K:Cmaj
C D E F | G F E D | C E G c | G E C2 |
      `.trim();

      const hardAbc = `
X:1
M:4/4
L:1/8
Q:1/4=160
K:Cmaj
C,, G,, C, G, c g c' g' | c'' g' e' c' g e c G |
      `.trim();

      const easyAnalysis = analyzeAbc(easyAbc, 'piano');
      const hardAnalysis = analyzeAbc(hardAbc, 'piano');

      expect(easyAnalysis?.difficulty_level).toBe('beginner');
      expect(hardAnalysis?.difficulty_level).toMatch(/intermediate|advanced/);
    });

    it('should calculate leap statistics accurately', () => {
      const leapyAbc = `
X:1
M:4/4
L:1/4
K:Cmaj
C c C c | C G' C, g |
      `.trim();

      const stepwiseAbc = `
X:1
M:4/4
L:1/4
K:Cmaj
C D E F | G F E D |
      `.trim();

      const leapyAnalysis = analyzeAbc(leapyAbc, 'piano');
      const stepwiseAnalysis = analyzeAbc(stepwiseAbc, 'piano');

      expect(leapyAnalysis?.leap_mean).toBeGreaterThan(5);
      expect(stepwiseAnalysis?.leap_mean).toBeLessThan(3);
      expect(leapyAnalysis?.leap_count).toBeGreaterThan(0);
    });
  });

  describe('calculatePlayabilityScore', () => {
    it('should return maximum score for ideal conditions', () => {
      const score = calculatePlayabilityScore(
        true,  // range_ok
        2,     // leap_mean (small)
        0.1,   // chromatic_density (low)
        100,   // tempo_qpm (moderate)
        'piano'
      );

      expect(score).toBeGreaterThan(8);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should penalize out-of-range notes', () => {
      const inRangeScore = calculatePlayabilityScore(true, 3, 0.2, 120, 'piano');
      const outOfRangeScore = calculatePlayabilityScore(false, 3, 0.2, 120, 'piano');

      expect(outOfRangeScore).toBeLessThan(inRangeScore);
      expect(inRangeScore - outOfRangeScore).toBeGreaterThanOrEqual(2);
    });

    it('should penalize large leaps', () => {
      const smallLeapScore = calculatePlayabilityScore(true, 2, 0.2, 120, 'piano');
      const largeLeapScore = calculatePlayabilityScore(true, 8, 0.2, 120, 'piano');

      expect(largeLeapScore).toBeLessThan(smallLeapScore);
    });

    it('should penalize high chromatic density', () => {
      const lowDensityScore = calculatePlayabilityScore(true, 3, 0.1, 120, 'piano');
      const highDensityScore = calculatePlayabilityScore(true, 3, 0.5, 120, 'piano');

      expect(highDensityScore).toBeLessThan(lowDensityScore);
    });

    it('should penalize extreme tempos', () => {
      const moderateTempoScore = calculatePlayabilityScore(true, 3, 0.2, 100, 'piano');
      const fastTempoScore = calculatePlayabilityScore(true, 3, 0.2, 180, 'piano');
      const slowTempoScore = calculatePlayabilityScore(true, 3, 0.2, 40, 'piano');

      expect(fastTempoScore).toBeLessThan(moderateTempoScore);
      expect(slowTempoScore).toBeLessThan(moderateTempoScore);
    });

    it('should never return negative scores', () => {
      const worstCaseScore = calculatePlayabilityScore(
        false, // out of range
        15,    // huge leaps
        0.8,   // very chromatic
        200,   // very fast
        'piano'
      );

      expect(worstCaseScore).toBeGreaterThanOrEqual(0);
    });

    it('should never exceed 10', () => {
      const bestCaseScore = calculatePlayabilityScore(
        true,  // in range
        1,     // minimal leaps
        0,     // no chromaticism
        90,    // comfortable tempo
        'piano'
      );

      expect(bestCaseScore).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateLearningValueScore', () => {
    it('should boost score for moderate repetition', () => {
      const lowRepScore = calculateLearningValueScore(7, 0.05, 1, 4, 'intermediate');
      const goodRepScore = calculateLearningValueScore(7, 0.4, 5, 4, 'intermediate');
      const highRepScore = calculateLearningValueScore(7, 0.8, 12, 4, 'intermediate');

      expect(goodRepScore).toBeGreaterThan(lowRepScore);
      expect(goodRepScore).toBeGreaterThan(highRepScore);
    });

    it('should favor appropriate note density', () => {
      const sparseScore = calculateLearningValueScore(7, 0.3, 3, 1, 'intermediate');
      const goodDensityScore = calculateLearningValueScore(7, 0.3, 3, 6, 'intermediate');
      const overDenseScore = calculateLearningValueScore(7, 0.3, 3, 15, 'intermediate');

      expect(goodDensityScore).toBeGreaterThan(sparseScore);
      expect(goodDensityScore).toBeGreaterThan(overDenseScore);
    });

    it('should favor intermediate difficulty', () => {
      const beginnerScore = calculateLearningValueScore(7, 0.3, 3, 4, 'beginner');
      const intermediateScore = calculateLearningValueScore(7, 0.3, 3, 4, 'intermediate');
      const advancedScore = calculateLearningValueScore(7, 0.3, 3, 4, 'advanced');

      expect(intermediateScore).toBeGreaterThanOrEqual(beginnerScore);
      expect(intermediateScore).toBeGreaterThanOrEqual(advancedScore);
    });

    it('should use playability as baseline', () => {
      const lowPlayability = calculateLearningValueScore(3, 0.4, 5, 6, 'intermediate');
      const highPlayability = calculateLearningValueScore(9, 0.4, 5, 6, 'intermediate');

      expect(highPlayability).toBeGreaterThan(lowPlayability);
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { playability: 0, rep: 0, seq: 0, density: 0, level: 'beginner' as const },
        { playability: 10, rep: 1, seq: 100, density: 100, level: 'advanced' as const },
      ];

      edgeCases.forEach(({ playability, rep, seq, density, level }) => {
        const score = calculateLearningValueScore(playability, rep, seq, density, level);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('passesQualityGate', () => {
    it('should pass materials with high learning value', () => {
      const goodAnalysis = {
        learning_value_score: 7.5,
        playability_score: 8,
        note_count: 50,
        measure_count: 8,
        unique_pitches: 7,
        range_min: 60,
        range_max: 72,
        range_span: 12,
        range_ok: true,
        leap_mean: 3,
        leap_max: 5,
        leap_count: 2,
        chromatic_density: 0.1,
        notes_per_measure: 6.25,
        repetition_ratio: 0.4,
        sequence_count: 3,
        tempo_qpm: 120,
        instrument: 'piano',
        difficulty_level: 'intermediate' as const,
      };

      expect(passesQualityGate(goodAnalysis)).toBe(true);
      expect(passesQualityGate(goodAnalysis, 7)).toBe(true);
    });

    it('should fail materials with low learning value', () => {
      const poorAnalysis = {
        learning_value_score: 4.5,
        playability_score: 5,
        note_count: 50,
        measure_count: 8,
        unique_pitches: 7,
        range_min: 60,
        range_max: 72,
        range_span: 12,
        range_ok: true,
        leap_mean: 3,
        leap_max: 5,
        leap_count: 2,
        chromatic_density: 0.1,
        notes_per_measure: 6.25,
        repetition_ratio: 0.4,
        sequence_count: 3,
        tempo_qpm: 120,
        instrument: 'piano',
        difficulty_level: 'intermediate' as const,
      };

      expect(passesQualityGate(poorAnalysis)).toBe(false);
      expect(passesQualityGate(poorAnalysis, 4)).toBe(true);
    });

    it('should respect custom thresholds', () => {
      const analysis = {
        learning_value_score: 5.5,
        playability_score: 6,
        note_count: 50,
        measure_count: 8,
        unique_pitches: 7,
        range_min: 60,
        range_max: 72,
        range_span: 12,
        range_ok: true,
        leap_mean: 3,
        leap_max: 5,
        leap_count: 2,
        chromatic_density: 0.1,
        notes_per_measure: 6.25,
        repetition_ratio: 0.4,
        sequence_count: 3,
        tempo_qpm: 120,
        instrument: 'piano',
        difficulty_level: 'intermediate' as const,
      };

      expect(passesQualityGate(analysis, 5)).toBe(true);
      expect(passesQualityGate(analysis, 6)).toBe(false);
      expect(passesQualityGate(analysis, 5.5)).toBe(true);
    });
  });

  describe('explainAnalysis', () => {
    it('should generate human-readable explanation', () => {
      const analysis = {
        learning_value_score: 7.5,
        playability_score: 8,
        note_count: 50,
        measure_count: 8,
        unique_pitches: 7,
        range_min: 60,
        range_max: 72,
        range_span: 12,
        range_ok: true,
        leap_mean: 3.2,
        leap_max: 5,
        leap_count: 2,
        chromatic_density: 0.15,
        notes_per_measure: 6.25,
        repetition_ratio: 0.4,
        sequence_count: 3,
        tempo_qpm: 120,
        instrument: 'piano',
        difficulty_level: 'intermediate' as const,
      };

      const explanation = explainAnalysis(analysis);

      expect(explanation).toContain('piano');
      expect(explanation).toContain('intermediate');
      expect(explanation).toContain('120 BPM');
      expect(explanation).toContain('7.5/10');
      expect(explanation).toContain('8.0/10');
      expect(explanation).toContain('✅');
    });

    it('should indicate quality gate failure', () => {
      const failingAnalysis = {
        learning_value_score: 4.5,
        playability_score: 5,
        note_count: 50,
        measure_count: 8,
        unique_pitches: 7,
        range_min: 60,
        range_max: 72,
        range_span: 12,
        range_ok: false,
        leap_mean: 8,
        leap_max: 15,
        leap_count: 10,
        chromatic_density: 0.6,
        notes_per_measure: 12,
        repetition_ratio: 0.1,
        sequence_count: 1,
        tempo_qpm: 180,
        instrument: 'violin',
        difficulty_level: 'advanced' as const,
      };

      const explanation = explainAnalysis(failingAnalysis);

      expect(explanation).toContain('⚠️');
      expect(explanation).toContain('不合格');
      expect(explanation).toContain('いいえ（快適範囲外）');
    });
  });
});