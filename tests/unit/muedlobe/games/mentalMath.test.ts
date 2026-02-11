import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateMathQuestions,
  scoreMentalMath,
  type MathQuestion,
  type MathResponse,
} from '@/lib/muedlobe/games/mentalMath';

// ========================================
// generateMathQuestions
// ========================================

describe('generateMathQuestions', () => {
  let questions: MathQuestion[];

  // Generate once (randomized, but we verify structural properties)
  beforeAll(() => {
    questions = generateMathQuestions();
  });

  it('generates exactly 24 questions', () => {
    expect(questions).toHaveLength(24);
  });

  it('has unique sequential ids starting from 0', () => {
    for (let i = 0; i < 24; i++) {
      expect(questions[i].id).toBe(i);
    }
  });

  it('has 3 questions per level (8 levels)', () => {
    for (let level = 1; level <= 8; level++) {
      const count = questions.filter(q => q.level === level).length;
      expect(count).toBe(3);
    }
  });

  it('level 1: single-digit results', () => {
    const l1 = questions.filter(q => q.level === 1);
    for (const q of l1) {
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(18); // max: 9+9
      expect(q.timeLimit).toBe(10_000);
    }
  });

  it('level 2: two-digit addition/subtraction', () => {
    const l2 = questions.filter(q => q.level === 2);
    for (const q of l2) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.timeLimit).toBe(15_000);
    }
  });

  it('level 3: multiplication results', () => {
    const l3 = questions.filter(q => q.level === 3);
    for (const q of l3) {
      expect(q.answer).toBeGreaterThanOrEqual(9);  // min: 3×3
      expect(q.answer).toBeLessThanOrEqual(81);     // max: 9×9
      expect(q.timeLimit).toBe(15_000);
    }
  });

  it('level 4: compound operations', () => {
    const l4 = questions.filter(q => q.level === 4);
    for (const q of l4) {
      expect(q.timeLimit).toBe(20_000);
      // a(10-25) + b(3-12) - c(2-8) → min=10+3-8=5, max=25+12-2=35
      expect(q.answer).toBeGreaterThanOrEqual(5);
      expect(q.answer).toBeLessThanOrEqual(35);
    }
  });

  it('level 5: word problems', () => {
    const l5 = questions.filter(q => q.level === 5);
    for (const q of l5) {
      expect(q.timeLimit).toBe(20_000);
      expect(q.answer).toBeGreaterThan(0);
    }
  });

  it('level 6: multi-step operations', () => {
    const l6 = questions.filter(q => q.level === 6);
    for (const q of l6) {
      expect(q.timeLimit).toBe(25_000);
    }
  });

  it('level 7: proportional reasoning', () => {
    const l7 = questions.filter(q => q.level === 7);
    for (const q of l7) {
      expect(q.timeLimit).toBe(30_000);
      expect(q.answer).toBeGreaterThan(0);
    }
  });

  it('level 8: multi-variable tracking', () => {
    const l8 = questions.filter(q => q.level === 8);
    for (const q of l8) {
      expect(q.timeLimit).toBe(30_000);
    }
  });

  it('all questions have non-empty text and display', () => {
    for (const q of questions) {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.display.length).toBeGreaterThan(0);
    }
  });

  it('all answers are finite numbers', () => {
    for (const q of questions) {
      expect(Number.isFinite(q.answer)).toBe(true);
    }
  });

  it('questions are ordered by level', () => {
    for (let i = 1; i < questions.length; i++) {
      expect(questions[i].level).toBeGreaterThanOrEqual(questions[i - 1].level);
    }
  });

  it('generates different questions on multiple calls (randomized)', () => {
    const q1 = generateMathQuestions();
    const q2 = generateMathQuestions();
    // At least some answers should differ (probabilistic but virtually certain)
    const answers1 = q1.map(q => q.answer);
    const answers2 = q2.map(q => q.answer);
    const allSame = answers1.every((a, i) => a === answers2[i]);
    expect(allSame).toBe(false);
  });
});

// ========================================
// Answer correctness verification
// display の数式を独立パースし、answer と一致するか検証。
// 生成ロジックのバグ（answer が式と不一致）を検出する。
// ========================================

describe('answer correctness (display vs answer)', () => {
  // Run multiple generations to catch randomized edge cases
  const RUNS = 5;

  /** Parse "a OP b" style display (levels 1-2) */
  function evalSimple(display: string): number {
    if (display.includes(' + ')) {
      const [a, b] = display.split(' + ').map(Number);
      return a + b;
    }
    if (display.includes(' - ')) {
      const [a, b] = display.split(' - ').map(Number);
      return a - b;
    }
    throw new Error(`Cannot parse: ${display}`);
  }

  /** Parse "a × b" (level 3) */
  function evalMul(display: string): number {
    const [a, b] = display.split(' × ').map(Number);
    return a * b;
  }

  /** Parse "a + b - c" (level 4) */
  function evalCompound(display: string): number {
    // "a + b - c"
    const match = display.match(/^(\d+) \+ (\d+) - (\d+)$/);
    if (!match) throw new Error(`Cannot parse L4: ${display}`);
    return Number(match[1]) + Number(match[2]) - Number(match[3]);
  }

  for (let run = 0; run < RUNS; run++) {
    const questions = generateMathQuestions();

    describe(`run ${run + 1}`, () => {
      it('level 1: display matches answer', () => {
        for (const q of questions.filter(q => q.level === 1)) {
          expect(q.answer).toBe(evalSimple(q.display));
        }
      });

      it('level 2: display matches answer', () => {
        for (const q of questions.filter(q => q.level === 2)) {
          expect(q.answer).toBe(evalSimple(q.display));
        }
      });

      it('level 3: display matches answer', () => {
        for (const q of questions.filter(q => q.level === 3)) {
          expect(q.answer).toBe(evalMul(q.display));
        }
      });

      it('level 4: display matches answer', () => {
        for (const q of questions.filter(q => q.level === 4)) {
          expect(q.answer).toBe(evalCompound(q.display));
        }
      });

      it('level 5: word problem answers are positive integers', () => {
        for (const q of questions.filter(q => q.level === 5)) {
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThan(0);
        }
      });

      it('level 6: multi-step display matches answer', () => {
        for (const q of questions.filter(q => q.level === 6)) {
          const d = q.display;

          if (d.startsWith('(')) {
            // "(a + b) × c - d"
            const m = d.match(/^\((\d+) \+ (\d+)\) × (\d+) - (\d+)$/);
            if (m) {
              const expected = (Number(m[1]) + Number(m[2])) * Number(m[3]) - Number(m[4]);
              expect(q.answer).toBe(expected);
              continue;
            }
          }

          if (d.includes('÷')) {
            // "a × b ÷ c + d"
            const m = d.match(/^(\d+) × (\d+) ÷ (\d+) \+ (\d+)$/);
            if (m) {
              const expected = Number(m[1]) * Number(m[2]) / Number(m[3]) + Number(m[4]);
              expect(q.answer).toBe(expected);
              continue;
            }
          }

          // "a × b + c - d"
          const m = d.match(/^(\d+) × (\d+) \+ (\d+) - (\d+)$/);
          if (m) {
            const expected = Number(m[1]) * Number(m[2]) + Number(m[3]) - Number(m[4]);
            expect(q.answer).toBe(expected);
            continue;
          }

          throw new Error(`Unrecognized L6 display: ${d}`);
        }
      });

      it('level 6: division produces integer (no rounding errors)', () => {
        for (const q of questions.filter(q => q.level === 6)) {
          expect(Number.isInteger(q.answer)).toBe(true);
        }
      });

      it('level 7: answers are positive integers', () => {
        for (const q of questions.filter(q => q.level === 7)) {
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThan(0);
        }
      });

      it('level 7: percentage problem produces integer', () => {
        // The 3rd L7 problem is percentage: original - original*percent/100
        // original is multiple of 10, percent is 20/30/40 → always integer
        const l7 = questions.filter(q => q.level === 7);
        const percentQ = l7[2]; // 3rd problem
        expect(Number.isInteger(percentQ.answer)).toBe(true);
      });

      it('level 8: multi-variable answers are integers', () => {
        for (const q of questions.filter(q => q.level === 8)) {
          expect(Number.isInteger(q.answer)).toBe(true);
        }
      });

      it('level 8: display formula matches answer', () => {
        const l8 = questions.filter(q => q.level === 8);

        // Problem 1: "A=aMult*B, B=C+bOffset, C=c → A=?"
        const d1 = l8[0].display;
        const m1 = d1.match(/A=(\d+)B, B=C\+(\d+), C=(\d+)/);
        if (m1) {
          const c = Number(m1[3]);
          const bOffset = Number(m1[2]);
          const aMult = Number(m1[1]);
          expect(l8[0].answer).toBe(aMult * (c + bOffset));
        }

        // Problem 2: "X+Y=sum, X=mult*Y → X=?"
        const d2 = l8[1].display;
        const m2 = d2.match(/X\+Y=(\d+), X=(\d+)Y/);
        if (m2) {
          const sum = Number(m2[1]);
          const mult = Number(m2[2]);
          // X = mult*Y, X+Y = sum → mult*Y + Y = sum → Y = sum/(mult+1) → X = mult*Y
          const y = sum / (mult + 1);
          expect(l8[1].answer).toBe(mult * y);
        }

        // Problem 3: "P=Q-diff, Q=mult*R, R=val → P=?"
        const d3 = l8[2].display;
        const m3 = d3.match(/P=Q-(\d+), Q=(\d+)R, R=(\d+)/);
        if (m3) {
          const diff = Number(m3[1]);
          const mult = Number(m3[2]);
          const r = Number(m3[3]);
          expect(l8[2].answer).toBe(mult * r - diff);
        }
      });
    });
  }
});

// ========================================
// scoreMentalMath
// ========================================

describe('scoreMentalMath', () => {
  function makeResponse(level: number, correct: boolean, responseTime: number): MathResponse {
    return {
      questionId: 0,
      correct,
      level,
      responseTime,
      timeLimit: level <= 2 ? 10_000 : 20_000,
      userAnswer: correct ? 42 : null,
    };
  }

  it('all correct level 1 → weighted score', () => {
    const responses: MathResponse[] = Array.from({ length: 3 }, () =>
      makeResponse(1, true, 8000) // 8s out of 10s limit
    );
    const result = scoreMentalMath(responses);
    // base=1.0, timeRatio=8000/10000=0.8, no time bonus
    expect(result.totalScore).toBe(3.0);
    expect(result.correctCount).toBe(3);
    expect(result.totalQuestions).toBe(3);
  });

  it('all incorrect → score = 0', () => {
    const responses: MathResponse[] = Array.from({ length: 5 }, () =>
      makeResponse(1, false, 5000)
    );
    const result = scoreMentalMath(responses);
    expect(result.totalScore).toBe(0);
    expect(result.correctCount).toBe(0);
  });

  it('time bonus applies when responseTime <= 50% of timeLimit', () => {
    const response = makeResponse(1, true, 4000); // 4s out of 10s → ratio=0.4
    response.timeLimit = 10_000;
    const result = scoreMentalMath([response]);
    // base=1.0, timeRatio=0.4, timeBonus=(0.5-0.4)*0.5=0.05
    expect(result.totalScore).toBe(1.05);
  });

  it('no time bonus when responseTime > 50% of timeLimit', () => {
    const response = makeResponse(1, true, 6000); // 6s out of 10s → ratio=0.6
    response.timeLimit = 10_000;
    const result = scoreMentalMath([response]);
    expect(result.totalScore).toBe(1.0); // base only
  });

  it('higher levels have higher weights', () => {
    const l1 = makeResponse(1, true, 8000);
    l1.timeLimit = 10_000;
    const l8 = makeResponse(8, true, 25000);
    l8.timeLimit = 30_000;
    const r1 = scoreMentalMath([l1]);
    const r8 = scoreMentalMath([l8]);
    expect(r8.totalScore).toBeGreaterThan(r1.totalScore);
  });

  it('level 8 weight is 2.5', () => {
    const response = makeResponse(8, true, 20000);
    response.timeLimit = 30_000;
    // timeRatio=20000/30000=0.667, no bonus
    const result = scoreMentalMath([response]);
    expect(result.totalScore).toBe(2.5);
  });

  it('max time bonus at instant response', () => {
    const response = makeResponse(1, true, 0);
    response.timeLimit = 10_000;
    // timeRatio=0, timeBonus=(0.5-0)*0.5=0.25
    const result = scoreMentalMath([response]);
    expect(result.totalScore).toBe(1.25);
  });

  it('empty responses → score = 0', () => {
    const result = scoreMentalMath([]);
    expect(result.totalScore).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.totalQuestions).toBe(0);
  });

  it('mixed correct and incorrect', () => {
    const responses: MathResponse[] = [
      makeResponse(1, true, 8000),   // 1.0
      makeResponse(2, false, 5000),  // 0
      makeResponse(3, true, 12000),  // 1.3 (timeRatio=0.8, no bonus)
    ];
    responses[0].timeLimit = 10_000;
    responses[1].timeLimit = 15_000;
    responses[2].timeLimit = 15_000;
    const result = scoreMentalMath(responses);
    expect(result.totalScore).toBe(2.3);
    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(3);
  });

  it('responses are preserved in result', () => {
    const responses: MathResponse[] = [makeResponse(1, true, 5000)];
    const result = scoreMentalMath(responses);
    expect(result.responses).toBe(responses);
  });
});
