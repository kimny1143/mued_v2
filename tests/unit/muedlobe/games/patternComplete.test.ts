import { describe, it, expect, beforeAll } from 'vitest';
import {
  generatePatternQuestions,
  scorePatternComplete,
  type PatternQuestion,
  type PatternResponse,
  type PatternDifficulty,
} from '@/lib/muedlobe/games/patternComplete';

// ========================================
// generatePatternQuestions
// ========================================

describe('generatePatternQuestions', () => {
  let questions: PatternQuestion[];

  beforeAll(() => {
    questions = generatePatternQuestions();
  });

  it('generates exactly 20 questions', () => {
    expect(questions).toHaveLength(20);
  });

  it('has unique sequential ids starting from 0', () => {
    for (let i = 0; i < 20; i++) {
      expect(questions[i].id).toBe(i);
    }
  });

  it('has 5 easy, 5 medium, 5 hard, 5 expert', () => {
    const counts: Record<PatternDifficulty, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
    for (const q of questions) {
      counts[q.difficulty]++;
    }
    expect(counts.easy).toBe(5);
    expect(counts.medium).toBe(5);
    expect(counts.hard).toBe(5);
    expect(counts.expert).toBe(5);
  });

  it('questions are ordered: easy → medium → hard → expert', () => {
    const order: PatternDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    let currentIdx = 0;
    for (const q of questions) {
      const qIdx = order.indexOf(q.difficulty);
      expect(qIdx).toBeGreaterThanOrEqual(currentIdx);
      currentIdx = qIdx;
    }
  });

  it('each question has a 9-cell matrix', () => {
    for (const q of questions) {
      expect(q.matrix).toHaveLength(9);
    }
  });

  it('matrix[8] is always null (missing cell)', () => {
    for (const q of questions) {
      expect(q.matrix[8]).toBeNull();
    }
  });

  it('matrix cells 0-7 are non-null strings', () => {
    for (const q of questions) {
      for (let i = 0; i < 8; i++) {
        expect(typeof q.matrix[i]).toBe('string');
        expect((q.matrix[i] as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('each question has 6 options', () => {
    for (const q of questions) {
      expect(q.options).toHaveLength(6);
    }
  });

  it('correctIndex is valid (0-5)', () => {
    for (const q of questions) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(5);
    }
  });

  it('correct option is a non-empty string', () => {
    for (const q of questions) {
      const correct = q.options[q.correctIndex];
      expect(typeof correct).toBe('string');
      expect(correct.length).toBeGreaterThan(0);
    }
  });

  it('all options are non-empty strings', () => {
    for (const q of questions) {
      for (const opt of q.options) {
        expect(typeof opt).toBe('string');
        expect(opt.length).toBeGreaterThan(0);
      }
    }
  });

  it('generates different questions on multiple calls', () => {
    const q1 = generatePatternQuestions();
    const q2 = generatePatternQuestions();
    // The correct answers should differ (randomized shapes)
    const a1 = q1.map(q => q.options[q.correctIndex]).join(',');
    const a2 = q2.map(q => q.options[q.correctIndex]).join(',');
    expect(a1).not.toBe(a2);
  });
});

// ========================================
// scorePatternComplete
// ========================================

describe('scorePatternComplete', () => {
  function makeResponse(difficulty: PatternDifficulty, correct: boolean): PatternResponse {
    return {
      questionId: 0,
      correct,
      difficulty,
      responseTime: 5000,
      selectedIndex: 0,
    };
  }

  it('all easy correct → score = 5.0', () => {
    const responses = Array.from({ length: 5 }, () => makeResponse('easy', true));
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(5.0);
    expect(result.correctCount).toBe(5);
  });

  it('all medium correct → score = 6.0 (5 × 1.2)', () => {
    const responses = Array.from({ length: 5 }, () => makeResponse('medium', true));
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(6.0);
  });

  it('all hard correct → score = 7.5 (5 × 1.5)', () => {
    const responses = Array.from({ length: 5 }, () => makeResponse('hard', true));
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(7.5);
  });

  it('all expert correct → score = 10.0 (5 × 2.0)', () => {
    const responses = Array.from({ length: 5 }, () => makeResponse('expert', true));
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(10.0);
  });

  it('all 20 correct → score = 28.5', () => {
    const responses = [
      ...Array.from({ length: 5 }, () => makeResponse('easy', true)),   // 5.0
      ...Array.from({ length: 5 }, () => makeResponse('medium', true)), // 6.0
      ...Array.from({ length: 5 }, () => makeResponse('hard', true)),   // 7.5
      ...Array.from({ length: 5 }, () => makeResponse('expert', true)), // 10.0
    ];
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(28.5);
    expect(result.correctCount).toBe(20);
    expect(result.totalQuestions).toBe(20);
  });

  it('all incorrect → score = 0', () => {
    const responses = [
      ...Array.from({ length: 5 }, () => makeResponse('easy', false)),
      ...Array.from({ length: 5 }, () => makeResponse('hard', false)),
    ];
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(0);
    expect(result.correctCount).toBe(0);
  });

  it('difficulty breakdown is correct', () => {
    const responses = [
      makeResponse('easy', true),
      makeResponse('easy', false),
      makeResponse('hard', true),
      makeResponse('hard', true),
      makeResponse('expert', false),
    ];
    const result = scorePatternComplete(responses);
    expect(result.difficultyBreakdown.easy).toEqual({ correct: 1, total: 2 });
    expect(result.difficultyBreakdown.medium).toEqual({ correct: 0, total: 0 });
    expect(result.difficultyBreakdown.hard).toEqual({ correct: 2, total: 2 });
    expect(result.difficultyBreakdown.expert).toEqual({ correct: 0, total: 1 });
  });

  it('empty responses → score = 0', () => {
    const result = scorePatternComplete([]);
    expect(result.totalScore).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.totalQuestions).toBe(0);
  });

  it('mixed correctness', () => {
    const responses = [
      makeResponse('easy', true),     // 1.0
      makeResponse('medium', false),  // 0
      makeResponse('hard', true),     // 1.5
      makeResponse('expert', true),   // 2.0
    ];
    const result = scorePatternComplete(responses);
    expect(result.totalScore).toBe(4.5);
    expect(result.correctCount).toBe(3);
    expect(result.totalQuestions).toBe(4);
  });
});
