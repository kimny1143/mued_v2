import { describe, it, expect } from 'vitest';
import {
  CODE_PAIRS,
  CODE_FILL_TIME_LIMIT_MS,
  generateCodeFillTrial,
  scoreCodeFill,
  type CodeFillTrial,
} from '@/lib/muedlobe/games/codeFill';

// ========================================
// CODE_PAIRS
// ========================================

describe('CODE_PAIRS', () => {
  it('has 9 pairs (digits 1-9)', () => {
    expect(CODE_PAIRS).toHaveLength(9);
  });

  it('covers digits 1 through 9', () => {
    const digits = CODE_PAIRS.map(p => p.digit).sort();
    expect(digits).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('all symbols are unique', () => {
    const symbols = CODE_PAIRS.map(p => p.symbol);
    expect(new Set(symbols).size).toBe(9);
  });

  it('all symbols are non-empty strings', () => {
    for (const pair of CODE_PAIRS) {
      expect(typeof pair.symbol).toBe('string');
      expect(pair.symbol.length).toBeGreaterThan(0);
    }
  });
});

describe('CODE_FILL_TIME_LIMIT_MS', () => {
  it('is 120 seconds', () => {
    expect(CODE_FILL_TIME_LIMIT_MS).toBe(120_000);
  });
});

// ========================================
// generateCodeFillTrial
// ========================================

describe('generateCodeFillTrial', () => {
  it('returns a trial with valid digit (1-9)', () => {
    const trial = generateCodeFillTrial();
    expect(trial.digit).toBeGreaterThanOrEqual(1);
    expect(trial.digit).toBeLessThanOrEqual(9);
  });

  it('correctSymbol matches the digit in CODE_PAIRS', () => {
    for (let i = 0; i < 20; i++) {
      const trial = generateCodeFillTrial();
      const expected = CODE_PAIRS.find(p => p.digit === trial.digit)!.symbol;
      expect(trial.correctSymbol).toBe(expected);
    }
  });

  it('shuffledSymbols contains all 9 symbols', () => {
    const trial = generateCodeFillTrial();
    expect(trial.shuffledSymbols).toHaveLength(9);
    const allSymbols = CODE_PAIRS.map(p => p.symbol);
    expect(new Set(trial.shuffledSymbols)).toEqual(new Set(allSymbols));
  });

  it('shuffledSymbols contains the correctSymbol', () => {
    const trial = generateCodeFillTrial();
    expect(trial.shuffledSymbols).toContain(trial.correctSymbol);
  });

  it('userAnswer, correct, responseTime are null initially', () => {
    const trial = generateCodeFillTrial();
    expect(trial.userAnswer).toBeNull();
    expect(trial.correct).toBeNull();
    expect(trial.responseTime).toBeNull();
  });
});

// ========================================
// scoreCodeFill
// ========================================

describe('scoreCodeFill', () => {
  function makeTrial(correct: boolean): CodeFillTrial {
    const pair = CODE_PAIRS[0];
    return {
      digit: pair.digit,
      correctSymbol: pair.symbol,
      shuffledSymbols: CODE_PAIRS.map(p => p.symbol),
      userAnswer: correct ? pair.symbol : '△',
      correct,
      responseTime: 1000,
    };
  }

  it('all correct → rawScore = correct count', () => {
    const trials = Array.from({ length: 10 }, () => makeTrial(true));
    const result = scoreCodeFill(trials);
    expect(result.correct).toBe(10);
    expect(result.incorrect).toBe(0);
    expect(result.totalAttempted).toBe(10);
    expect(result.rawScore).toBe(10);
  });

  it('all incorrect → rawScore = correct - incorrect*0.5 (clamped to 0)', () => {
    const trials = Array.from({ length: 10 }, () => makeTrial(false));
    const result = scoreCodeFill(trials);
    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(10);
    expect(result.rawScore).toBe(0); // max(0, 0 - 10*0.5)
  });

  it('mixed: 8 correct + 4 incorrect → rawScore = 8 - 4*0.5 = 6', () => {
    const trials = [
      ...Array.from({ length: 8 }, () => makeTrial(true)),
      ...Array.from({ length: 4 }, () => makeTrial(false)),
    ];
    const result = scoreCodeFill(trials);
    expect(result.correct).toBe(8);
    expect(result.incorrect).toBe(4);
    expect(result.totalAttempted).toBe(12);
    expect(result.rawScore).toBe(6);
  });

  it('unanswered trials are excluded', () => {
    const unanswered: CodeFillTrial = {
      digit: 1,
      correctSymbol: '◇',
      shuffledSymbols: CODE_PAIRS.map(p => p.symbol),
      userAnswer: null,
      correct: null,
      responseTime: null,
    };
    const trials = [makeTrial(true), unanswered, makeTrial(false)];
    const result = scoreCodeFill(trials);
    expect(result.totalAttempted).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.incorrect).toBe(1);
    expect(result.rawScore).toBe(0.5);
  });

  it('empty trials → all zeros', () => {
    const result = scoreCodeFill([]);
    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(0);
    expect(result.totalAttempted).toBe(0);
    expect(result.rawScore).toBe(0);
  });

  it('1 correct + 1 incorrect → rawScore = 0.5', () => {
    const trials = [makeTrial(true), makeTrial(false)];
    const result = scoreCodeFill(trials);
    expect(result.rawScore).toBe(0.5);
  });

  it('rawScore never goes below 0', () => {
    const trials = Array.from({ length: 20 }, () => makeTrial(false));
    const result = scoreCodeFill(trials);
    expect(result.rawScore).toBe(0);
  });
});
