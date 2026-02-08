import { describe, it, expect } from 'vitest';
import { calculateCompositeScores } from '@/lib/muedlobe/scoring/compositeScorer';
import type { GameResult } from '@/types/muedlobe';

function makeResults(overrides: Partial<Record<string, Partial<GameResult>>> = {}): GameResult[] {
  const defaults: Record<string, GameResult> = {
    'tone-sequence': {
      gameType: 'tone-sequence',
      rawScore: 10,
      rawData: { forwardSpan: 5, backwardSpan: 4, sequencingSpan: 3 },
      completedAt: '2026-01-01T00:00:00Z',
    },
    'mental-math': {
      gameType: 'mental-math',
      rawScore: 0,
      rawData: { totalScore: 15, correctCount: 10, totalQuestions: 24 },
      completedAt: '2026-01-01T00:00:00Z',
    },
    'symbol-match': {
      gameType: 'symbol-match',
      rawScore: 25,
      rawData: { correct: 28, incorrect: 3, totalAttempted: 31 },
      completedAt: '2026-01-01T00:00:00Z',
    },
    'code-fill': {
      gameType: 'code-fill',
      rawScore: 20,
      rawData: { correct: 22, incorrect: 4, totalAttempted: 26 },
      completedAt: '2026-01-01T00:00:00Z',
    },
    'word-bridge': {
      gameType: 'word-bridge',
      rawScore: 0,
      rawData: { totalScore: 18, maxScore: 24, questionsAnswered: 12 },
      completedAt: '2026-01-01T00:00:00Z',
    },
    'pattern-complete': {
      gameType: 'pattern-complete',
      rawScore: 0,
      rawData: { totalScore: 12, correctCount: 10, totalQuestions: 20, difficultyBreakdown: {} },
      completedAt: '2026-01-01T00:00:00Z',
    },
    'focus-flow': {
      gameType: 'focus-flow',
      rawScore: 2.5,
      rawData: { dPrime: 3.0, rtCv: 0.2, hitRate: 0.95, falseAlarmRate: 0.05 },
      completedAt: '2026-01-01T00:00:00Z',
    },
  };

  for (const [key, value] of Object.entries(overrides)) {
    defaults[key] = { ...defaults[key], ...value } as GameResult;
  }

  return Object.values(defaults);
}

describe('compositeScorer', () => {
  it('calculates WM as weighted sum of tone-sequence and mental-math', () => {
    const results = makeResults();
    const { scores } = calculateCompositeScores(results);

    // WM = 10 * 0.6 + 15 * 0.4 = 6 + 6 = 12
    expect(scores.wm).toBe(12);
  });

  it('calculates PS as average of symbol-match and code-fill', () => {
    const results = makeResults();
    const { scores } = calculateCompositeScores(results);

    // PS = 25 * 0.5 + 20 * 0.5 = 12.5 + 10 = 22.5
    expect(scores.ps).toBe(22.5);
  });

  it('uses totalScore from rawData for VC', () => {
    const results = makeResults();
    const { scores } = calculateCompositeScores(results);

    expect(scores.vc).toBe(18);
  });

  it('uses totalScore from rawData for PR', () => {
    const results = makeResults();
    const { scores } = calculateCompositeScores(results);

    expect(scores.pr).toBe(12);
  });

  it('uses rawScore directly for ATT', () => {
    const results = makeResults();
    const { scores } = calculateCompositeScores(results);

    expect(scores.att).toBe(2.5);
  });

  it('throws when a game is missing', () => {
    const results = makeResults();
    const incomplete = results.filter((r) => r.gameType !== 'focus-flow');

    expect(() => calculateCompositeScores(incomplete)).toThrow('Missing game result: focus-flow');
  });

  it('populates rawData structure correctly', () => {
    const results = makeResults();
    const { rawData } = calculateCompositeScores(results);

    expect(rawData.wm.forwardSpan).toBe(5);
    expect(rawData.wm.backwardSpan).toBe(4);
    expect(rawData.wm.sequencingSpan).toBe(3);
    expect(rawData.wm.mentalMathScore).toBe(15);
    expect(rawData.ps.symbolMatchScore).toBe(25);
    expect(rawData.ps.codeFillScore).toBe(20);
    expect(rawData.att.dPrime).toBe(3.0);
    expect(rawData.att.hitRate).toBe(0.95);
  });

  it('handles zero scores', () => {
    const results = makeResults({
      'tone-sequence': { rawScore: 0, rawData: { forwardSpan: 0, backwardSpan: 0, sequencingSpan: 0 } },
      'mental-math': { rawData: { totalScore: 0 } },
      'symbol-match': { rawScore: 0 },
      'code-fill': { rawScore: 0 },
      'word-bridge': { rawData: { totalScore: 0 } },
      'pattern-complete': { rawData: { totalScore: 0 } },
      'focus-flow': { rawScore: 0, rawData: { dPrime: 0, rtCv: 0, hitRate: 0, falseAlarmRate: 0 } },
    });

    const { scores } = calculateCompositeScores(results);
    expect(scores.wm).toBe(0);
    expect(scores.ps).toBe(0);
    expect(scores.vc).toBe(0);
    expect(scores.pr).toBe(0);
    expect(scores.att).toBe(0);
  });
});
