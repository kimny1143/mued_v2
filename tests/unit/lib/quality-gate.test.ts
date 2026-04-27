import { describe, it, expect } from 'vitest';
import type { AbcAnalysis } from '@/lib/abc-analyzer';
import {
  suggestImprovements,
  explainQualityScore,
  calculateDynamicThreshold,
  analyzeQualityTrend,
  QUALITY_THRESHOLD,
} from '@/lib/quality-gate';

// Minimal valid AbcAnalysis fixture
const makeAnalysis = (overrides: Partial<AbcAnalysis> = {}): AbcAnalysis => ({
  note_count: 32,
  measure_count: 8,
  unique_pitches: 7,
  range_min: 60,
  range_max: 76,
  range_span: 16,
  range_ok: true,
  leap_mean: 2.0,
  leap_max: 5,
  leap_count: 2,
  chromatic_density: 0.1,
  notes_per_measure: 4,
  repetition_ratio: 0.3,
  sequence_count: 3,
  tempo_qpm: 100,
  playability_score: 7.5,
  learning_value_score: 7.0,
  instrument: 'piano',
  difficulty_level: 'beginner',
  ...overrides,
});

// ─── suggestImprovements ─────────────────────────────────────────────────────

describe('suggestImprovements', () => {
  it('returns no-issue message when all metrics are within range', () => {
    const suggestions = suggestImprovements(makeAnalysis());
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toContain('良好');
  });

  it('suggests range adjustment when range_ok is false', () => {
    const suggestions = suggestImprovements(makeAnalysis({ range_ok: false }));
    expect(suggestions.some(s => s.includes('音域'))).toBe(true);
  });

  it('suggests simpler intervals when leap_mean > 5', () => {
    const suggestions = suggestImprovements(makeAnalysis({ leap_mean: 6 }));
    expect(suggestions.some(s => s.includes('跳躍'))).toBe(true);
  });

  it('suggests fewer chromatic notes when chromatic_density > 0.4', () => {
    const suggestions = suggestImprovements(makeAnalysis({ chromatic_density: 0.5 }));
    expect(suggestions.some(s => s.includes('半音'))).toBe(true);
  });

  it('suggests slowing down when tempo > 160', () => {
    const suggestions = suggestImprovements(makeAnalysis({ tempo_qpm: 180 }));
    expect(suggestions.some(s => s.includes('速すぎ'))).toBe(true);
  });

  it('suggests speeding up when tempo < 60', () => {
    const suggestions = suggestImprovements(makeAnalysis({ tempo_qpm: 40 }));
    expect(suggestions.some(s => s.includes('遅すぎ'))).toBe(true);
  });

  it('suggests adding repetition when repetition_ratio < 0.1', () => {
    const suggestions = suggestImprovements(makeAnalysis({ repetition_ratio: 0.05 }));
    expect(suggestions.some(s => s.includes('反復') && s.includes('少なすぎ'))).toBe(true);
  });

  it('suggests reducing repetition when repetition_ratio > 0.6', () => {
    const suggestions = suggestImprovements(makeAnalysis({ repetition_ratio: 0.7 }));
    expect(suggestions.some(s => s.includes('反復') && s.includes('多すぎ'))).toBe(true);
  });

  it('suggests reducing note density when notes_per_measure > 12', () => {
    const suggestions = suggestImprovements(makeAnalysis({ notes_per_measure: 14 }));
    expect(suggestions.some(s => s.includes('密度'))).toBe(true);
  });

  it('suggests increasing note density when notes_per_measure < 2', () => {
    const suggestions = suggestImprovements(makeAnalysis({ notes_per_measure: 1 }));
    expect(suggestions.some(s => s.includes('低すぎ'))).toBe(true);
  });
});

// ─── explainQualityScore ─────────────────────────────────────────────────────

describe('explainQualityScore', () => {
  it('returns very playable for score >= 8', () => {
    const { playability } = explainQualityScore(makeAnalysis({ playability_score: 9 }));
    expect(playability).toContain('非常に演奏しやすい');
  });

  it('returns playable for score >= 6', () => {
    const { playability } = explainQualityScore(makeAnalysis({ playability_score: 7 }));
    expect(playability).toContain('演奏可能');
  });

  it('returns high learning value for score >= 8', () => {
    const { learningValue } = explainQualityScore(makeAnalysis({ learning_value_score: 8.5 }));
    expect(learningValue).toContain('非常に高い');
  });

  it('returns pass overall when score meets threshold', () => {
    const { overall } = explainQualityScore(makeAnalysis({ learning_value_score: 8, playability_score: 8 }));
    expect(overall).toContain('✅');
  });

  it('returns fail overall when score below threshold', () => {
    const { overall } = explainQualityScore(makeAnalysis({ learning_value_score: 3, playability_score: 3 }));
    expect(overall).toContain('⚠️');
  });
});

// ─── calculateDynamicThreshold ───────────────────────────────────────────────

describe('calculateDynamicThreshold', () => {
  it('returns default threshold when fewer than 10 scores', () => {
    expect(calculateDynamicThreshold([7, 8, 6])).toBe(QUALITY_THRESHOLD);
  });

  it('returns default when empty', () => {
    expect(calculateDynamicThreshold([])).toBe(QUALITY_THRESHOLD);
  });

  it('clamps result to minimum 5.0', () => {
    // Very low scores → dynamic would go below 5
    const lowScores = Array(20).fill(1.0);
    expect(calculateDynamicThreshold(lowScores)).toBe(5.0);
  });

  it('clamps result to maximum 7.0', () => {
    // Very high consistent scores → dynamic would go above 7
    const highScores = Array(20).fill(10.0);
    expect(calculateDynamicThreshold(highScores)).toBe(7.0);
  });

  it('returns value within [5.0, 7.0] for normal distribution', () => {
    const scores = [5, 6, 7, 8, 6, 7, 5.5, 6.5, 7, 6, 5, 6, 7, 8, 6];
    const threshold = calculateDynamicThreshold(scores);
    expect(threshold).toBeGreaterThanOrEqual(5.0);
    expect(threshold).toBeLessThanOrEqual(7.0);
  });
});

// ─── analyzeQualityTrend ─────────────────────────────────────────────────────

describe('analyzeQualityTrend', () => {
  it('returns stable zeros for empty input', () => {
    const result = analyzeQualityTrend([]);
    expect(result.trend).toBe('stable');
    expect(result.average).toBe(0);
    expect(result.passRate).toBe(0);
  });

  it('detects improving trend when recent > overall by > 0.5', () => {
    const scores = [5, 5, 5, 5, 5, 6, 7, 8, 9, 9, 9, 9, 9, 9, 9];
    const result = analyzeQualityTrend(scores);
    expect(result.trend).toBe('improving');
  });

  it('detects declining trend when recent < overall by > 0.5', () => {
    const scores = [9, 9, 9, 9, 9, 8, 7, 5, 4, 4, 4, 4, 4, 4, 4];
    const result = analyzeQualityTrend(scores);
    expect(result.trend).toBe('declining');
  });

  it('detects stable trend for uniform scores', () => {
    const scores = Array(15).fill(7.0);
    const result = analyzeQualityTrend(scores);
    expect(result.trend).toBe('stable');
  });

  it('calculates passRate correctly', () => {
    const scores = [8, 8, 8, 5, 5]; // 3 pass out of 5
    const result = analyzeQualityTrend(scores, QUALITY_THRESHOLD);
    expect(result.passRate).toBeCloseTo(60);
  });

  it('returns 100% passRate when all scores above threshold', () => {
    const scores = [7, 8, 9, 7.5];
    const result = analyzeQualityTrend(scores);
    expect(result.passRate).toBe(100);
  });
});
