import { describe, it, expect } from 'vitest';
import {
  generateSequence,
  getExpectedAnswer,
  checkAnswer,
  scoreToneSequence,
  TONE_NOTES,
  TONE_MODES,
} from '@/lib/muedlobe/games/toneSequence';

// ---------------------------------------------------------------------------
// generateSequence
// ---------------------------------------------------------------------------
describe('generateSequence', () => {
  it('returns an array of the requested length', () => {
    for (const len of [1, 3, 5, 8, 12]) {
      expect(generateSequence(len)).toHaveLength(len);
    }
  });

  it('returns an empty array when length is 0', () => {
    expect(generateSequence(0)).toEqual([]);
  });

  it('all indices are within valid range 0..7', () => {
    // Generate a long sequence to increase coverage of the random range
    const seq = generateSequence(200);
    for (const idx of seq) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(TONE_NOTES.length); // 8
    }
  });

  it('all values are integers', () => {
    const seq = generateSequence(50);
    for (const idx of seq) {
      expect(Number.isInteger(idx)).toBe(true);
    }
  });

  it('produces varied output (not all identical) over many calls', () => {
    // Statistical: 200 random draws from 0-7 should not all be the same
    const seq = generateSequence(200);
    const unique = new Set(seq);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// getExpectedAnswer
// ---------------------------------------------------------------------------
describe('getExpectedAnswer', () => {
  // ---- forward mode ----
  describe('forward mode', () => {
    it('returns a copy of the original sequence', () => {
      const seq = [0, 3, 5, 7];
      const result = getExpectedAnswer(seq, 'forward');
      expect(result).toEqual([0, 3, 5, 7]);
    });

    it('does not mutate the original sequence', () => {
      const seq = [1, 2, 3];
      const result = getExpectedAnswer(seq, 'forward');
      result[0] = 99;
      expect(seq[0]).toBe(1);
    });

    it('returns a different reference (shallow copy)', () => {
      const seq = [4, 5, 6];
      expect(getExpectedAnswer(seq, 'forward')).not.toBe(seq);
    });
  });

  // ---- backward mode ----
  describe('backward mode', () => {
    it('returns the reversed sequence', () => {
      expect(getExpectedAnswer([0, 1, 2, 3], 'backward')).toEqual([3, 2, 1, 0]);
    });

    it('handles a single-element sequence', () => {
      expect(getExpectedAnswer([5], 'backward')).toEqual([5]);
    });

    it('handles a two-element sequence', () => {
      expect(getExpectedAnswer([7, 0], 'backward')).toEqual([0, 7]);
    });

    it('does not mutate the original sequence', () => {
      const seq = [1, 2, 3];
      getExpectedAnswer(seq, 'backward');
      expect(seq).toEqual([1, 2, 3]);
    });
  });

  // ---- sequencing mode ----
  describe('sequencing mode', () => {
    it('returns the sequence sorted ascending by index', () => {
      expect(getExpectedAnswer([5, 2, 7, 0], 'sequencing')).toEqual([0, 2, 5, 7]);
    });

    it('already sorted sequence is returned as-is', () => {
      expect(getExpectedAnswer([0, 1, 2, 3], 'sequencing')).toEqual([0, 1, 2, 3]);
    });

    it('handles a single-element sequence', () => {
      expect(getExpectedAnswer([4], 'sequencing')).toEqual([4]);
    });

    it('does not mutate the original sequence', () => {
      const seq = [3, 1, 2];
      getExpectedAnswer(seq, 'sequencing');
      expect(seq).toEqual([3, 1, 2]);
    });
  });

  // ---- duplicate notes ----
  describe('with duplicate notes', () => {
    const seqWithDupes = [2, 5, 2, 7, 5];

    it('forward preserves duplicates in order', () => {
      expect(getExpectedAnswer(seqWithDupes, 'forward')).toEqual([2, 5, 2, 7, 5]);
    });

    it('backward reverses including duplicates', () => {
      expect(getExpectedAnswer(seqWithDupes, 'backward')).toEqual([5, 7, 2, 5, 2]);
    });

    it('sequencing sorts with duplicates grouped', () => {
      expect(getExpectedAnswer(seqWithDupes, 'sequencing')).toEqual([2, 2, 5, 5, 7]);
    });
  });

  // ---- empty sequence edge case ----
  describe('empty sequence', () => {
    it('forward returns empty', () => {
      expect(getExpectedAnswer([], 'forward')).toEqual([]);
    });
    it('backward returns empty', () => {
      expect(getExpectedAnswer([], 'backward')).toEqual([]);
    });
    it('sequencing returns empty', () => {
      expect(getExpectedAnswer([], 'sequencing')).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// checkAnswer
// ---------------------------------------------------------------------------
describe('checkAnswer', () => {
  it('returns true when answers match exactly', () => {
    expect(checkAnswer([0, 1, 2], [0, 1, 2])).toBe(true);
  });

  it('returns false when answers differ', () => {
    expect(checkAnswer([0, 1, 2], [0, 2, 1])).toBe(false);
  });

  it('returns false when user answer is shorter', () => {
    expect(checkAnswer([0, 1], [0, 1, 2])).toBe(false);
  });

  it('returns false when user answer is longer', () => {
    expect(checkAnswer([0, 1, 2, 3], [0, 1, 2])).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(checkAnswer([], [])).toBe(true);
  });

  it('returns false when empty vs non-empty', () => {
    expect(checkAnswer([], [1])).toBe(false);
    expect(checkAnswer([1], [])).toBe(false);
  });

  it('returns true for single matching element', () => {
    expect(checkAnswer([7], [7])).toBe(true);
  });

  it('returns false for single mismatched element', () => {
    expect(checkAnswer([6], [7])).toBe(false);
  });

  it('handles duplicate values correctly', () => {
    expect(checkAnswer([2, 2, 3], [2, 2, 3])).toBe(true);
    expect(checkAnswer([2, 3, 2], [2, 2, 3])).toBe(false);
  });

  it('handles long matching sequences', () => {
    const seq = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3];
    expect(checkAnswer([...seq], [...seq])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scoreToneSequence
// ---------------------------------------------------------------------------
describe('scoreToneSequence', () => {
  it('computes rawScore with correct weights (1.0, 1.2, 1.3)', () => {
    const result = scoreToneSequence(5, 4, 3);
    // 5*1.0 + 4*1.2 + 3*1.3 = 5 + 4.8 + 3.9 = 13.7
    expect(result.rawScore).toBeCloseTo(13.7);
  });

  it('returns all span values in the result', () => {
    const result = scoreToneSequence(3, 2, 4);
    expect(result.forwardSpan).toBe(3);
    expect(result.backwardSpan).toBe(2);
    expect(result.sequencingSpan).toBe(4);
  });

  it('handles zero spans', () => {
    const result = scoreToneSequence(0, 0, 0);
    expect(result.rawScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Constants / Config sanity checks
// ---------------------------------------------------------------------------
describe('TONE_NOTES', () => {
  it('has 8 notes (C4 through C5)', () => {
    expect(TONE_NOTES).toHaveLength(8);
  });

  it('frequencies are in ascending order', () => {
    for (let i = 1; i < TONE_NOTES.length; i++) {
      expect(TONE_NOTES[i].freq).toBeGreaterThan(TONE_NOTES[i - 1].freq);
    }
  });
});

describe('TONE_MODES', () => {
  it('defines 3 modes', () => {
    expect(TONE_MODES).toHaveLength(3);
  });

  it('contains forward, backward, and sequencing', () => {
    const modes = TONE_MODES.map(m => m.mode);
    expect(modes).toContain('forward');
    expect(modes).toContain('backward');
    expect(modes).toContain('sequencing');
  });
});

// ---------------------------------------------------------------------------
// Integration: generateSequence + getExpectedAnswer + checkAnswer
// ---------------------------------------------------------------------------
describe('end-to-end flow', () => {
  it('forward: generated sequence passes check when repeated verbatim', () => {
    const seq = generateSequence(5);
    const expected = getExpectedAnswer(seq, 'forward');
    expect(checkAnswer([...expected], expected)).toBe(true);
  });

  it('backward: reversed user input matches expected', () => {
    const seq = [3, 1, 4, 1, 5];
    const expected = getExpectedAnswer(seq, 'backward');
    expect(expected).toEqual([5, 1, 4, 1, 3]);
    expect(checkAnswer([5, 1, 4, 1, 3], expected)).toBe(true);
  });

  it('sequencing: sorted user input matches expected', () => {
    const seq = [7, 0, 3, 0, 5];
    const expected = getExpectedAnswer(seq, 'sequencing');
    expect(expected).toEqual([0, 0, 3, 5, 7]);
    expect(checkAnswer([0, 0, 3, 5, 7], expected)).toBe(true);
  });

  it('wrong answer is rejected in full flow', () => {
    const seq = generateSequence(4);
    const expected = getExpectedAnswer(seq, 'forward');
    const wrong = [...expected];
    wrong[0] = (wrong[0] + 1) % 8; // flip one element
    expect(checkAnswer(wrong, expected)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Answer verification - full simulation
// ---------------------------------------------------------------------------
describe('Answer verification - full simulation', () => {
  /**
   * Helper: simulates a full round - generate expected answer for a known
   * sequence + mode, then check if a given user answer is correct.
   */
  function simulate(
    sequence: number[],
    mode: 'forward' | 'backward' | 'sequencing',
    userAnswer: number[],
  ): boolean {
    const expected = getExpectedAnswer(sequence, mode);
    return checkAnswer(userAnswer, expected);
  }

  // =========================================================================
  // 1. Forward mode simulation (5+ cases)
  // =========================================================================
  describe('Forward mode simulation', () => {
    it('sequence [0,1,2] → user taps [0,1,2] → CORRECT', () => {
      expect(simulate([0, 1, 2], 'forward', [0, 1, 2])).toBe(true);
    });

    it('sequence [0,1,2] → user taps [2,1,0] (backward order) → INCORRECT', () => {
      expect(simulate([0, 1, 2], 'forward', [2, 1, 0])).toBe(false);
    });

    it('sequence [7,3,5,1] → user taps [7,3,5,1] → CORRECT', () => {
      expect(simulate([7, 3, 5, 1], 'forward', [7, 3, 5, 1])).toBe(true);
    });

    it('sequence [7,3,5,1] → user taps [1,3,5,7] (sorted) → INCORRECT', () => {
      expect(simulate([7, 3, 5, 1], 'forward', [1, 3, 5, 7])).toBe(false);
    });

    it('sequence [4,4,4] → user taps [4,4,4] → CORRECT (all same)', () => {
      expect(simulate([4, 4, 4], 'forward', [4, 4, 4])).toBe(true);
    });

    it('single note [6] → user taps [6] → CORRECT', () => {
      expect(simulate([6], 'forward', [6])).toBe(true);
    });

    it('sequence [0,7,3,2,6,1,5,4] (8 notes) → exact replay → CORRECT', () => {
      const seq = [0, 7, 3, 2, 6, 1, 5, 4];
      expect(simulate(seq, 'forward', [0, 7, 3, 2, 6, 1, 5, 4])).toBe(true);
    });

    it('sequence [0,7,3,2,6,1,5,4] → one note wrong → INCORRECT', () => {
      expect(simulate([0, 7, 3, 2, 6, 1, 5, 4], 'forward', [0, 7, 3, 2, 6, 1, 5, 3])).toBe(false);
    });
  });

  // =========================================================================
  // 2. Backward mode simulation (10+ cases - primary focus)
  // =========================================================================
  describe('Backward mode simulation', () => {
    it('sequence [0,1,2] (C4,D4,E4) → expected backward [2,1,0] → user taps [2,1,0] → CORRECT', () => {
      const seq = [0, 1, 2];
      const expected = getExpectedAnswer(seq, 'backward');
      expect(expected).toEqual([2, 1, 0]);
      expect(simulate(seq, 'backward', [2, 1, 0])).toBe(true);
    });

    it('sequence [0,1,2] → user taps [0,1,2] (forward order) → INCORRECT', () => {
      expect(simulate([0, 1, 2], 'backward', [0, 1, 2])).toBe(false);
    });

    it('sequence [5,3] → expected backward [3,5] → user taps [3,5] → CORRECT', () => {
      const expected = getExpectedAnswer([5, 3], 'backward');
      expect(expected).toEqual([3, 5]);
      expect(simulate([5, 3], 'backward', [3, 5])).toBe(true);
    });

    it('sequence [5,3] → user taps [5,3] (forward) → INCORRECT', () => {
      expect(simulate([5, 3], 'backward', [5, 3])).toBe(false);
    });

    it('sequence [7,0,4,2] → backward is [2,4,0,7] → CORRECT', () => {
      const expected = getExpectedAnswer([7, 0, 4, 2], 'backward');
      expect(expected).toEqual([2, 4, 0, 7]);
      expect(simulate([7, 0, 4, 2], 'backward', [2, 4, 0, 7])).toBe(true);
    });

    it('sequence [7,0,4,2] → user taps [7,0,4,2] (forward) → INCORRECT', () => {
      expect(simulate([7, 0, 4, 2], 'backward', [7, 0, 4, 2])).toBe(false);
    });

    it('sequence with duplicates [3,3,1] → backward [1,3,3] → CORRECT', () => {
      const expected = getExpectedAnswer([3, 3, 1], 'backward');
      expect(expected).toEqual([1, 3, 3]);
      expect(simulate([3, 3, 1], 'backward', [1, 3, 3])).toBe(true);
    });

    it('sequence with duplicates [3,3,1] → user taps [3,1,3] → INCORRECT', () => {
      expect(simulate([3, 3, 1], 'backward', [3, 1, 3])).toBe(false);
    });

    it('all same notes [4,4,4] → backward [4,4,4] → CORRECT (same as forward)', () => {
      const expected = getExpectedAnswer([4, 4, 4], 'backward');
      expect(expected).toEqual([4, 4, 4]);
      expect(simulate([4, 4, 4], 'backward', [4, 4, 4])).toBe(true);
    });

    it('single note [6] → backward [6] → CORRECT', () => {
      const expected = getExpectedAnswer([6], 'backward');
      expect(expected).toEqual([6]);
      expect(simulate([6], 'backward', [6])).toBe(true);
    });

    it('long sequence (8 notes) [0,7,3,2,6,1,5,4] → backward [4,5,1,6,2,3,7,0] → CORRECT', () => {
      const seq = [0, 7, 3, 2, 6, 1, 5, 4];
      const expected = getExpectedAnswer(seq, 'backward');
      expect(expected).toEqual([4, 5, 1, 6, 2, 3, 7, 0]);
      expect(simulate(seq, 'backward', [4, 5, 1, 6, 2, 3, 7, 0])).toBe(true);
    });

    it('long sequence (10 notes) backward verification', () => {
      const seq = [2, 0, 7, 1, 5, 3, 6, 4, 0, 7];
      const expected = getExpectedAnswer(seq, 'backward');
      expect(expected).toEqual([7, 0, 4, 6, 3, 5, 1, 7, 0, 2]);
      expect(simulate(seq, 'backward', [7, 0, 4, 6, 3, 5, 1, 7, 0, 2])).toBe(true);
    });

    it('wrong answer close but off by one note in the middle', () => {
      // sequence [0,1,2,3,4] → backward [4,3,2,1,0]
      // user taps [4,3,3,1,0] — index 2 is 3 instead of 2
      expect(simulate([0, 1, 2, 3, 4], 'backward', [4, 3, 3, 1, 0])).toBe(false);
    });

    it('wrong answer that is the sequencing order instead of backward', () => {
      // sequence [5,2,7,3] → backward [3,7,2,5], sequencing [2,3,5,7]
      // user taps the sequencing order
      expect(simulate([5, 2, 7, 3], 'backward', [2, 3, 5, 7])).toBe(false);
    });

    it('palindrome sequence backward equals forward', () => {
      // [1,3,5,3,1] reversed is [1,3,5,3,1] — same!
      const seq = [1, 3, 5, 3, 1];
      const expected = getExpectedAnswer(seq, 'backward');
      expect(expected).toEqual([1, 3, 5, 3, 1]);
      expect(simulate(seq, 'backward', [1, 3, 5, 3, 1])).toBe(true);
    });

    it('two-element sequence where both elements are the same', () => {
      expect(simulate([2, 2], 'backward', [2, 2])).toBe(true);
    });
  });

  // =========================================================================
  // 3. Sequencing mode simulation (5+ cases)
  // =========================================================================
  describe('Sequencing mode simulation', () => {
    it('sequence [5,2,7,3] → expected sorted [2,3,5,7] → user taps [2,3,5,7] → CORRECT', () => {
      const expected = getExpectedAnswer([5, 2, 7, 3], 'sequencing');
      expect(expected).toEqual([2, 3, 5, 7]);
      expect(simulate([5, 2, 7, 3], 'sequencing', [2, 3, 5, 7])).toBe(true);
    });

    it('sequence [5,2,7,3] → user taps [3,7,2,5] → INCORRECT', () => {
      expect(simulate([5, 2, 7, 3], 'sequencing', [3, 7, 2, 5])).toBe(false);
    });

    it('sequence with duplicates [3,1,3] → expected [1,3,3] → CORRECT', () => {
      const expected = getExpectedAnswer([3, 1, 3], 'sequencing');
      expect(expected).toEqual([1, 3, 3]);
      expect(simulate([3, 1, 3], 'sequencing', [1, 3, 3])).toBe(true);
    });

    it('already sorted sequence [0,1,2,3] → expected [0,1,2,3] → CORRECT', () => {
      const expected = getExpectedAnswer([0, 1, 2, 3], 'sequencing');
      expect(expected).toEqual([0, 1, 2, 3]);
      expect(simulate([0, 1, 2, 3], 'sequencing', [0, 1, 2, 3])).toBe(true);
    });

    it('reverse sorted [7,6,5,4] → expected [4,5,6,7] → CORRECT', () => {
      const expected = getExpectedAnswer([7, 6, 5, 4], 'sequencing');
      expect(expected).toEqual([4, 5, 6, 7]);
      expect(simulate([7, 6, 5, 4], 'sequencing', [4, 5, 6, 7])).toBe(true);
    });

    it('user taps in backward order instead of sorted → INCORRECT', () => {
      // sequence [5,2,7,3] → backward [3,7,2,5], sorted [2,3,5,7]
      expect(simulate([5, 2, 7, 3], 'sequencing', [3, 7, 2, 5])).toBe(false);
    });

    it('single element [4] → sorted [4] → CORRECT', () => {
      expect(simulate([4], 'sequencing', [4])).toBe(true);
    });

    it('all same notes [6,6,6,6] → sorted [6,6,6,6] → CORRECT', () => {
      expect(simulate([6, 6, 6, 6], 'sequencing', [6, 6, 6, 6])).toBe(true);
    });

    it('long sequence sorted correctly', () => {
      const seq = [7, 0, 3, 1, 6, 2, 5, 4];
      const expected = getExpectedAnswer(seq, 'sequencing');
      expect(expected).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(simulate(seq, 'sequencing', [0, 1, 2, 3, 4, 5, 6, 7])).toBe(true);
    });
  });

  // =========================================================================
  // 4. Cross-mode confusion tests
  // =========================================================================
  describe('Cross-mode confusion tests', () => {
    const testSequence = [5, 2, 7, 3];
    // forward answer: [5,2,7,3]
    // backward answer: [3,7,2,5]
    // sequencing answer: [2,3,5,7]

    it('forward answer is WRONG for backward mode', () => {
      const forwardAnswer = getExpectedAnswer(testSequence, 'forward');
      const backwardExpected = getExpectedAnswer(testSequence, 'backward');
      expect(checkAnswer(forwardAnswer, backwardExpected)).toBe(false);
    });

    it('backward answer is WRONG for forward mode', () => {
      const backwardAnswer = getExpectedAnswer(testSequence, 'backward');
      const forwardExpected = getExpectedAnswer(testSequence, 'forward');
      expect(checkAnswer(backwardAnswer, forwardExpected)).toBe(false);
    });

    it('backward answer is WRONG for sequencing mode', () => {
      const backwardAnswer = getExpectedAnswer(testSequence, 'backward');
      const sequencingExpected = getExpectedAnswer(testSequence, 'sequencing');
      expect(checkAnswer(backwardAnswer, sequencingExpected)).toBe(false);
    });

    it('sequencing answer is WRONG for forward mode', () => {
      const sequencingAnswer = getExpectedAnswer(testSequence, 'sequencing');
      const forwardExpected = getExpectedAnswer(testSequence, 'forward');
      expect(checkAnswer(sequencingAnswer, forwardExpected)).toBe(false);
    });

    it('sequencing answer is WRONG for backward mode', () => {
      const sequencingAnswer = getExpectedAnswer(testSequence, 'sequencing');
      const backwardExpected = getExpectedAnswer(testSequence, 'backward');
      expect(checkAnswer(sequencingAnswer, backwardExpected)).toBe(false);
    });

    it('forward answer is WRONG for sequencing mode', () => {
      const forwardAnswer = getExpectedAnswer(testSequence, 'forward');
      const sequencingExpected = getExpectedAnswer(testSequence, 'sequencing');
      expect(checkAnswer(forwardAnswer, sequencingExpected)).toBe(false);
    });

    // Additional cross-mode with a different sequence
    it('cross-mode confusion with sequence [1,0,3,2]', () => {
      const seq = [1, 0, 3, 2];
      const fwd = getExpectedAnswer(seq, 'forward');    // [1,0,3,2]
      const bwd = getExpectedAnswer(seq, 'backward');    // [2,3,0,1]
      const seqMode = getExpectedAnswer(seq, 'sequencing'); // [0,1,2,3]

      // All three should be different
      expect(checkAnswer(fwd, bwd)).toBe(false);
      expect(checkAnswer(fwd, seqMode)).toBe(false);
      expect(checkAnswer(bwd, seqMode)).toBe(false);

      // Each should only match its own mode
      expect(simulate(seq, 'forward', fwd)).toBe(true);
      expect(simulate(seq, 'backward', bwd)).toBe(true);
      expect(simulate(seq, 'sequencing', seqMode)).toBe(true);
    });

    it('edge case: sorted sequence where forward === sequencing (but not backward)', () => {
      const seq = [0, 1, 2, 3];
      const fwd = getExpectedAnswer(seq, 'forward');      // [0,1,2,3]
      const bwd = getExpectedAnswer(seq, 'backward');      // [3,2,1,0]
      const seqMode = getExpectedAnswer(seq, 'sequencing'); // [0,1,2,3]

      // forward and sequencing happen to be the same for sorted input
      expect(checkAnswer(fwd, seqMode)).toBe(true);
      // but backward is different
      expect(checkAnswer(bwd, fwd)).toBe(false);
      expect(checkAnswer(bwd, seqMode)).toBe(false);
    });

    it('edge case: reverse sorted where backward === sequencing', () => {
      // sequence [3,2,1,0] → forward [3,2,1,0], backward [0,1,2,3], sequencing [0,1,2,3]
      const seq = [3, 2, 1, 0];
      const fwd = getExpectedAnswer(seq, 'forward');
      const bwd = getExpectedAnswer(seq, 'backward');
      const seqMode = getExpectedAnswer(seq, 'sequencing');

      expect(fwd).toEqual([3, 2, 1, 0]);
      expect(bwd).toEqual([0, 1, 2, 3]);
      expect(seqMode).toEqual([0, 1, 2, 3]);

      // backward and sequencing happen to be the same for reverse-sorted input
      expect(checkAnswer(bwd, seqMode)).toBe(true);
      // forward is different from both
      expect(checkAnswer(fwd, bwd)).toBe(false);
    });
  });

  // =========================================================================
  // 5. Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('partial answer (too short) should be false - forward', () => {
      const seq = [0, 1, 2, 3];
      const expected = getExpectedAnswer(seq, 'forward');
      expect(checkAnswer([0, 1, 2], expected)).toBe(false);
    });

    it('partial answer (too short) should be false - backward', () => {
      const seq = [0, 1, 2, 3];
      const expected = getExpectedAnswer(seq, 'backward');
      expect(checkAnswer([3, 2], expected)).toBe(false);
    });

    it('partial answer (too short) should be false - sequencing', () => {
      const seq = [5, 2, 7, 3];
      const expected = getExpectedAnswer(seq, 'sequencing');
      expect(checkAnswer([2, 3, 5], expected)).toBe(false);
    });

    it('extra notes (too long) should be false - forward', () => {
      const seq = [0, 1, 2];
      const expected = getExpectedAnswer(seq, 'forward');
      expect(checkAnswer([0, 1, 2, 3], expected)).toBe(false);
    });

    it('extra notes (too long) should be false - backward', () => {
      const seq = [0, 1, 2];
      const expected = getExpectedAnswer(seq, 'backward');
      expect(checkAnswer([2, 1, 0, 5], expected)).toBe(false);
    });

    it('extra notes (too long) should be false - sequencing', () => {
      const seq = [3, 1, 2];
      const expected = getExpectedAnswer(seq, 'sequencing');
      expect(checkAnswer([1, 2, 3, 4], expected)).toBe(false);
    });

    it('empty answer should be false for non-empty sequence - forward', () => {
      const expected = getExpectedAnswer([0, 1, 2], 'forward');
      expect(checkAnswer([], expected)).toBe(false);
    });

    it('empty answer should be false for non-empty sequence - backward', () => {
      const expected = getExpectedAnswer([0, 1, 2], 'backward');
      expect(checkAnswer([], expected)).toBe(false);
    });

    it('empty answer should be false for non-empty sequence - sequencing', () => {
      const expected = getExpectedAnswer([0, 1, 2], 'sequencing');
      expect(checkAnswer([], expected)).toBe(false);
    });

    it('completely wrong answer (no notes match) - backward', () => {
      // sequence [0,1,2] → backward [2,1,0]
      // user taps [5,6,7] — nothing matches
      expect(simulate([0, 1, 2], 'backward', [5, 6, 7])).toBe(false);
    });

    it('answer with correct notes but swapped pair - backward', () => {
      // sequence [0,1,2,3] → backward [3,2,1,0]
      // user taps [3,1,2,0] — middle pair swapped
      expect(simulate([0, 1, 2, 3], 'backward', [3, 1, 2, 0])).toBe(false);
    });

    it('answer with one extra duplicate note', () => {
      // sequence [1,2,3] → backward [3,2,1]
      // user taps [3,2,1,1] — extra note
      expect(simulate([1, 2, 3], 'backward', [3, 2, 1, 1])).toBe(false);
    });
  });
});
