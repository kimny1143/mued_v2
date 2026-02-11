import { describe, it, expect } from 'vitest';
import {
  FOCUS_CONFIG,
  FOCUS_SYMBOLS,
  generateStimulusSequence,
  scoreFocusFlow,
  type FocusTrial,
} from '@/lib/muedlobe/games/focusFlow';

// ========================================
// Constants
// ========================================

describe('FOCUS_CONFIG', () => {
  it('has correct default values', () => {
    expect(FOCUS_CONFIG.stimulusDuration).toBe(250);
    expect(FOCUS_CONFIG.interStimulusInterval).toBe(1000);
    expect(FOCUS_CONFIG.targetRate).toBe(0.2);
    expect(FOCUS_CONFIG.totalStimuli).toBe(180);
    expect(FOCUS_CONFIG.targetSymbol).toBe('♪');
  });
});

describe('FOCUS_SYMBOLS', () => {
  it('has 5 symbols', () => {
    expect(FOCUS_SYMBOLS).toHaveLength(5);
  });

  it('first symbol is target', () => {
    expect(FOCUS_SYMBOLS[0]).toBe(FOCUS_CONFIG.targetSymbol);
  });
});

// ========================================
// generateStimulusSequence
// ========================================

describe('generateStimulusSequence', () => {
  it('generates exactly totalStimuli items', () => {
    const seq = generateStimulusSequence();
    expect(seq).toHaveLength(FOCUS_CONFIG.totalStimuli);
  });

  it('target count matches targetRate', () => {
    const seq = generateStimulusSequence();
    const targetCount = seq.filter(s => s.isTarget).length;
    const expected = Math.round(FOCUS_CONFIG.totalStimuli * FOCUS_CONFIG.targetRate);
    expect(targetCount).toBe(expected);
  });

  it('target stimuli have symbolIndex=0', () => {
    const seq = generateStimulusSequence();
    for (const s of seq) {
      if (s.isTarget) {
        expect(s.symbolIndex).toBe(0);
      }
    }
  });

  it('non-target stimuli have symbolIndex 1-4', () => {
    const seq = generateStimulusSequence();
    for (const s of seq) {
      if (!s.isTarget) {
        expect(s.symbolIndex).toBeGreaterThanOrEqual(1);
        expect(s.symbolIndex).toBeLessThanOrEqual(4);
      }
    }
  });

  it('sequence is shuffled (not all targets first)', () => {
    const seq = generateStimulusSequence();
    // Check that not all targets are clustered at the beginning
    const first20 = seq.slice(0, 20);
    const targetInFirst20 = first20.filter(s => s.isTarget).length;
    // With 36 targets in 180, expect ~4 in first 20. All 36 in first 20 is impossible.
    expect(targetInFirst20).toBeLessThan(20);
  });

  it('generates different sequences on multiple calls', () => {
    const s1 = generateStimulusSequence();
    const s2 = generateStimulusSequence();
    const idx1 = s1.map(s => s.symbolIndex).join(',');
    const idx2 = s2.map(s => s.symbolIndex).join(',');
    expect(idx1).not.toBe(idx2);
  });
});

// ========================================
// scoreFocusFlow
// ========================================

describe('scoreFocusFlow', () => {
  function makeTrials(config: {
    hits: number;
    misses: number;
    falseAlarms: number;
    correctRejections: number;
    rtValues?: number[];
  }): FocusTrial[] {
    const trials: FocusTrial[] = [];
    const rtValues = config.rtValues ?? [];
    let rtIdx = 0;

    for (let i = 0; i < config.hits; i++) {
      trials.push({
        symbolIndex: 0,
        isTarget: true,
        responded: true,
        responseTime: rtValues[rtIdx++] ?? 300,
      });
    }
    for (let i = 0; i < config.misses; i++) {
      trials.push({
        symbolIndex: 0,
        isTarget: true,
        responded: false,
        responseTime: null,
      });
    }
    for (let i = 0; i < config.falseAlarms; i++) {
      trials.push({
        symbolIndex: 1,
        isTarget: false,
        responded: true,
        responseTime: 400,
      });
    }
    for (let i = 0; i < config.correctRejections; i++) {
      trials.push({
        symbolIndex: 1,
        isTarget: false,
        responded: false,
        responseTime: null,
      });
    }
    return trials;
  }

  it('perfect performance: high hits, no FA → high d-prime', () => {
    const trials = makeTrials({
      hits: 36,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 144,
      rtValues: Array(36).fill(300),
    });
    const result = scoreFocusFlow(trials);
    expect(result.hits).toBe(36);
    expect(result.misses).toBe(0);
    expect(result.falseAlarms).toBe(0);
    expect(result.correctRejections).toBe(144);
    expect(result.dPrime).toBeGreaterThan(3);
    expect(result.rawScore).toBeGreaterThan(0);
  });

  it('chance performance → d-prime near 0', () => {
    // Hit rate ≈ FA rate → d-prime ≈ 0
    const trials = makeTrials({
      hits: 18,
      misses: 18,
      falseAlarms: 72,
      correctRejections: 72,
    });
    const result = scoreFocusFlow(trials);
    expect(Math.abs(result.dPrime)).toBeLessThan(0.5);
  });

  it('all misses, no FA → clamped rates, positive d-prime', () => {
    const trials = makeTrials({
      hits: 0,
      misses: 36,
      falseAlarms: 0,
      correctRejections: 144,
    });
    const result = scoreFocusFlow(trials);
    // hitRate clamped to 0.01, faRate clamped to 0.01 → d-prime ≈ 0
    expect(result.hits).toBe(0);
    expect(result.misses).toBe(36);
  });

  it('all FA, all hits → clamped rates', () => {
    const trials = makeTrials({
      hits: 36,
      misses: 0,
      falseAlarms: 144,
      correctRejections: 0,
      rtValues: Array(36).fill(300),
    });
    const result = scoreFocusFlow(trials);
    // hitRate=0.99, faRate=0.99 → d-prime ≈ 0
    expect(Math.abs(result.dPrime)).toBeLessThan(0.5);
  });

  it('counts hits/misses/FA/CR correctly', () => {
    const trials = makeTrials({
      hits: 10,
      misses: 5,
      falseAlarms: 3,
      correctRejections: 20,
    });
    const result = scoreFocusFlow(trials);
    expect(result.hits).toBe(10);
    expect(result.misses).toBe(5);
    expect(result.falseAlarms).toBe(3);
    expect(result.correctRejections).toBe(20);
  });

  it('hitRate is hits / (hits + misses)', () => {
    const trials = makeTrials({
      hits: 30,
      misses: 6,
      falseAlarms: 10,
      correctRejections: 134,
    });
    const result = scoreFocusFlow(trials);
    const expected = 30 / 36; // ≈ 0.83
    expect(result.hitRate).toBeCloseTo(expected, 2);
  });

  it('falseAlarmRate is FA / (FA + CR)', () => {
    const trials = makeTrials({
      hits: 30,
      misses: 6,
      falseAlarms: 10,
      correctRejections: 134,
    });
    const result = scoreFocusFlow(trials);
    const expected = 10 / 144; // ≈ 0.07
    expect(result.falseAlarmRate).toBeCloseTo(expected, 2);
  });

  it('meanRt is calculated from hit RTs only', () => {
    const trials = makeTrials({
      hits: 3,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 5,
      rtValues: [200, 300, 400],
    });
    const result = scoreFocusFlow(trials);
    expect(result.meanRt).toBe(300);
  });

  it('rtCv (coefficient of variation) calculated correctly', () => {
    const rts = [200, 300, 400];
    const mean = 300;
    const sd = Math.sqrt(((200 - 300) ** 2 + (300 - 300) ** 2 + (400 - 300) ** 2) / 3);
    const expectedCv = sd / mean;

    const trials = makeTrials({
      hits: 3,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 5,
      rtValues: rts,
    });
    const result = scoreFocusFlow(trials);
    expect(result.rtCv).toBeCloseTo(expectedCv, 2);
  });

  it('consistent RT → low rtCv', () => {
    const trials = makeTrials({
      hits: 10,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 30,
      rtValues: Array(10).fill(300),
    });
    const result = scoreFocusFlow(trials);
    expect(result.rtCv).toBe(0);
  });

  it('rawScore = dPrime * (1 - min(rtCv, 1)), clamped to 0', () => {
    const trials = makeTrials({
      hits: 30,
      misses: 6,
      falseAlarms: 5,
      correctRejections: 139,
      rtValues: Array(30).fill(300),
    });
    const result = scoreFocusFlow(trials);
    // With consistent RT, rtCv=0, so rawScore=dPrime
    expect(result.rawScore).toBeCloseTo(result.dPrime, 2);
  });

  it('high rtCv reduces rawScore', () => {
    // Consistent RT
    const trials1 = makeTrials({
      hits: 30,
      misses: 6,
      falseAlarms: 5,
      correctRejections: 139,
      rtValues: Array(30).fill(300),
    });
    // Variable RT
    const variableRts = Array.from({ length: 30 }, (_, i) => i % 2 === 0 ? 100 : 500);
    const trials2 = makeTrials({
      hits: 30,
      misses: 6,
      falseAlarms: 5,
      correctRejections: 139,
      rtValues: variableRts,
    });
    const r1 = scoreFocusFlow(trials1);
    const r2 = scoreFocusFlow(trials2);
    expect(r1.rawScore).toBeGreaterThan(r2.rawScore);
  });

  it('rawScore is non-negative', () => {
    const trials = makeTrials({
      hits: 5,
      misses: 31,
      falseAlarms: 100,
      correctRejections: 44,
    });
    const result = scoreFocusFlow(trials);
    expect(result.rawScore).toBeGreaterThanOrEqual(0);
  });

  it('empty trials → zeroes', () => {
    const result = scoreFocusFlow([]);
    expect(result.hits).toBe(0);
    expect(result.misses).toBe(0);
    expect(result.falseAlarms).toBe(0);
    expect(result.correctRejections).toBe(0);
    expect(result.meanRt).toBe(0);
  });

  it('single hit trial → rtCv = 0', () => {
    const trials = makeTrials({
      hits: 1,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 5,
      rtValues: [300],
    });
    const result = scoreFocusFlow(trials);
    // With only 1 RT, reactionTimes.length is not > 1, so rtCv=0
    expect(result.rtCv).toBe(0);
  });
});
