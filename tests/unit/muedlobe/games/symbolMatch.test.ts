import { describe, it, expect } from 'vitest';
import { generateTrial, scoreSymbolMatch } from '@/lib/muedlobe/games/symbolMatch';
import { SYMBOLS, SYMBOL_MATCH_CONFIG } from '@/lib/muedlobe/constants';
import type { SymbolMatchTrial } from '@/types/muedlobe';

// ========================================
// generateTrial
// ========================================

describe('generateTrial', () => {
  it('returns trial with correct target count', () => {
    const trial = generateTrial();
    expect(trial.targetSymbols).toHaveLength(SYMBOL_MATCH_CONFIG.targetCount);
  });

  it('returns trial with correct comparison count', () => {
    const trial = generateTrial();
    expect(trial.comparisonSymbols).toHaveLength(SYMBOL_MATCH_CONFIG.comparisonCount);
  });

  it('target symbols come from SYMBOLS', () => {
    for (let i = 0; i < 20; i++) {
      const trial = generateTrial();
      for (const s of trial.targetSymbols) {
        expect(SYMBOLS).toContain(s);
      }
    }
  });

  it('comparison symbols come from SYMBOLS', () => {
    for (let i = 0; i < 20; i++) {
      const trial = generateTrial();
      for (const s of trial.comparisonSymbols) {
        expect(SYMBOLS).toContain(s);
      }
    }
  });

  it('target symbols are unique', () => {
    for (let i = 0; i < 20; i++) {
      const trial = generateTrial();
      expect(new Set(trial.targetSymbols).size).toBe(trial.targetSymbols.length);
    }
  });

  it('when hasTarget=true, at least one target appears in comparison', () => {
    // Run many times to get hasTarget=true trials
    for (let i = 0; i < 100; i++) {
      const trial = generateTrial();
      if (trial.hasTarget) {
        const overlap = trial.targetSymbols.some(t =>
          trial.comparisonSymbols.includes(t)
        );
        expect(overlap).toBe(true);
      }
    }
  });

  it('when hasTarget=false, no target appears in comparison', () => {
    for (let i = 0; i < 100; i++) {
      const trial = generateTrial();
      if (!trial.hasTarget) {
        const overlap = trial.targetSymbols.some(t =>
          trial.comparisonSymbols.includes(t)
        );
        expect(overlap).toBe(false);
      }
    }
  });

  it('userAnswer, correct, responseTime are null initially', () => {
    const trial = generateTrial();
    expect(trial.userAnswer).toBeNull();
    expect(trial.correct).toBeNull();
    expect(trial.responseTime).toBeNull();
  });

  it('generates mix of hasTarget true and false over many trials', () => {
    let trueCount = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      if (generateTrial().hasTarget) trueCount++;
    }
    // With targetPresenceRate=0.5, expect roughly 50% ± tolerance
    expect(trueCount).toBeGreaterThan(N * 0.3);
    expect(trueCount).toBeLessThan(N * 0.7);
  });
});

// ========================================
// scoreSymbolMatch
// ========================================

describe('scoreSymbolMatch', () => {
  function makeTrial(hasTarget: boolean, userAnswer: boolean | null): SymbolMatchTrial {
    return {
      targetSymbols: ['◇', '☆'],
      comparisonSymbols: hasTarget ? ['◇', '▲', '○', '□', '⬡'] : ['▲', '○', '□', '⬡', '●'],
      hasTarget,
      userAnswer,
      correct: userAnswer !== null ? userAnswer === hasTarget : null,
      responseTime: userAnswer !== null ? 500 : null,
    };
  }

  it('all correct (10 hits) → rawScore = 10', () => {
    const trials: SymbolMatchTrial[] = [
      ...Array.from({ length: 5 }, () => makeTrial(true, true)),
      ...Array.from({ length: 5 }, () => makeTrial(false, false)),
    ];
    const result = scoreSymbolMatch(trials);
    expect(result.correct).toBe(10);
    expect(result.incorrect).toBe(0);
    expect(result.rawScore).toBe(10);
  });

  it('all incorrect → rawScore = -N', () => {
    const trials: SymbolMatchTrial[] = [
      ...Array.from({ length: 5 }, () => makeTrial(true, false)),
      ...Array.from({ length: 5 }, () => makeTrial(false, true)),
    ];
    const result = scoreSymbolMatch(trials);
    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(10);
    expect(result.rawScore).toBe(-10);
  });

  it('mixed: 7 correct + 3 incorrect → rawScore = 4', () => {
    const trials: SymbolMatchTrial[] = [
      ...Array.from({ length: 4 }, () => makeTrial(true, true)),
      ...Array.from({ length: 3 }, () => makeTrial(false, false)),
      ...Array.from({ length: 2 }, () => makeTrial(true, false)),
      ...Array.from({ length: 1 }, () => makeTrial(false, true)),
    ];
    const result = scoreSymbolMatch(trials);
    expect(result.correct).toBe(7);
    expect(result.incorrect).toBe(3);
    expect(result.rawScore).toBe(4);
    expect(result.totalAttempted).toBe(10);
  });

  it('unanswered trials are excluded', () => {
    const trials: SymbolMatchTrial[] = [
      makeTrial(true, true),
      makeTrial(false, null),
      makeTrial(true, false),
    ];
    const result = scoreSymbolMatch(trials);
    expect(result.totalAttempted).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.incorrect).toBe(1);
    expect(result.rawScore).toBe(0);
  });

  it('empty trials → all zeros', () => {
    const result = scoreSymbolMatch([]);
    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(0);
    expect(result.totalAttempted).toBe(0);
    expect(result.rawScore).toBe(0);
  });
});
