import { describe, it, expect } from 'vitest';
import {
  WORD_BRIDGE_QUESTIONS,
  shuffleOptions,
  scoreWordBridge,
  type WordBridgeTrial,
  type WordBridgeQuestion,
} from '@/lib/muedlobe/games/wordBridge';

// ========================================
// WORD_BRIDGE_QUESTIONS
// ========================================

describe('WORD_BRIDGE_QUESTIONS', () => {
  it('has exactly 12 questions', () => {
    expect(WORD_BRIDGE_QUESTIONS).toHaveLength(12);
  });

  it('each question has unique id', () => {
    const ids = WORD_BRIDGE_QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(12);
  });

  it('each question has wordA and wordB', () => {
    for (const q of WORD_BRIDGE_QUESTIONS) {
      expect(q.wordA).toBeTruthy();
      expect(q.wordB).toBeTruthy();
    }
  });

  it('each question has 4 options', () => {
    for (const q of WORD_BRIDGE_QUESTIONS) {
      expect(q.options).toHaveLength(4);
    }
  });

  it('each question has exactly one score=2 option (best answer)', () => {
    for (const q of WORD_BRIDGE_QUESTIONS) {
      const best = q.options.filter(o => o.score === 2);
      expect(best).toHaveLength(1);
    }
  });

  it('each question has exactly one score=1 option (partial answer)', () => {
    for (const q of WORD_BRIDGE_QUESTIONS) {
      const partial = q.options.filter(o => o.score === 1);
      expect(partial).toHaveLength(1);
    }
  });

  it('each question has exactly two score=0 options (wrong answers)', () => {
    for (const q of WORD_BRIDGE_QUESTIONS) {
      const wrong = q.options.filter(o => o.score === 0);
      expect(wrong).toHaveLength(2);
    }
  });

  it('all option texts are non-empty strings', () => {
    for (const q of WORD_BRIDGE_QUESTIONS) {
      for (const o of q.options) {
        expect(typeof o.text).toBe('string');
        expect(o.text.length).toBeGreaterThan(0);
      }
    }
  });
});

// ========================================
// shuffleOptions
// ========================================

describe('shuffleOptions', () => {
  it('returns same question structure with shuffled options', () => {
    const q = WORD_BRIDGE_QUESTIONS[0];
    const shuffled = shuffleOptions(q);
    expect(shuffled.id).toBe(q.id);
    expect(shuffled.wordA).toBe(q.wordA);
    expect(shuffled.wordB).toBe(q.wordB);
    expect(shuffled.options).toHaveLength(4);
  });

  it('preserves all option texts and scores', () => {
    const q = WORD_BRIDGE_QUESTIONS[0];
    const shuffled = shuffleOptions(q);
    const originalTexts = new Set(q.options.map(o => o.text));
    const shuffledTexts = new Set(shuffled.options.map(o => o.text));
    expect(shuffledTexts).toEqual(originalTexts);
  });

  it('does not mutate original question', () => {
    const q = WORD_BRIDGE_QUESTIONS[0];
    const originalOrder = q.options.map(o => o.text);
    shuffleOptions(q);
    expect(q.options.map(o => o.text)).toEqual(originalOrder);
  });
});

// ========================================
// scoreWordBridge
// ========================================

describe('scoreWordBridge', () => {
  it('scores all-best answers as 24/24', () => {
    const trials: WordBridgeTrial[] = WORD_BRIDGE_QUESTIONS.map(q => ({
      questionId: q.id,
      selectedScore: 2,
      responseTime: 3000,
    }));
    const result = scoreWordBridge(trials);
    expect(result.totalScore).toBe(24);
    expect(result.maxScore).toBe(24);
    expect(result.questionsAnswered).toBe(12);
  });

  it('scores all-partial answers as 12/24', () => {
    const trials: WordBridgeTrial[] = WORD_BRIDGE_QUESTIONS.map(q => ({
      questionId: q.id,
      selectedScore: 1,
      responseTime: 3000,
    }));
    const result = scoreWordBridge(trials);
    expect(result.totalScore).toBe(12);
    expect(result.maxScore).toBe(24);
  });

  it('scores all-wrong answers as 0/24', () => {
    const trials: WordBridgeTrial[] = WORD_BRIDGE_QUESTIONS.map(q => ({
      questionId: q.id,
      selectedScore: 0,
      responseTime: 3000,
    }));
    const result = scoreWordBridge(trials);
    expect(result.totalScore).toBe(0);
    expect(result.maxScore).toBe(24);
  });

  it('handles mixed scores correctly', () => {
    const trials: WordBridgeTrial[] = [
      { questionId: 1, selectedScore: 2, responseTime: 2000 },
      { questionId: 2, selectedScore: 1, responseTime: 3000 },
      { questionId: 3, selectedScore: 0, responseTime: 4000 },
      { questionId: 4, selectedScore: 2, responseTime: 2500 },
    ];
    const result = scoreWordBridge(trials);
    expect(result.totalScore).toBe(5); // 2+1+0+2
    expect(result.questionsAnswered).toBe(4);
  });

  it('excludes unanswered (null) trials from score', () => {
    const trials: WordBridgeTrial[] = [
      { questionId: 1, selectedScore: 2, responseTime: 2000 },
      { questionId: 2, selectedScore: null, responseTime: null },
      { questionId: 3, selectedScore: 2, responseTime: 3000 },
    ];
    const result = scoreWordBridge(trials);
    expect(result.totalScore).toBe(4);
    expect(result.questionsAnswered).toBe(2);
  });

  it('returns 0 for empty trials', () => {
    const result = scoreWordBridge([]);
    expect(result.totalScore).toBe(0);
    expect(result.questionsAnswered).toBe(0);
    expect(result.maxScore).toBe(24);
  });

  it('returns maxScore always as 24', () => {
    const trials: WordBridgeTrial[] = [
      { questionId: 1, selectedScore: 2, responseTime: 1000 },
    ];
    const result = scoreWordBridge(trials);
    expect(result.maxScore).toBe(24);
  });
});

// ========================================
// Individual question correctness verification
// ========================================

describe('question correctness', () => {
  const expectedBestAnswers: Record<number, string> = {
    1: '楽器',
    2: '芸術作品',
    3: '生命の起源',
    4: '自然地形',
    5: '感情',
    6: '時間を示す道具',
    7: '飛ぶもの',
    8: '政治体制',
    9: '心的機能',
    10: '行動の結果',
    11: '時間的境界',
    12: '関係性の分類',
  };

  for (const q of WORD_BRIDGE_QUESTIONS) {
    it(`Q${q.id}: "${q.wordA}" & "${q.wordB}" → best answer is "${expectedBestAnswers[q.id]}"`, () => {
      const best = q.options.find(o => o.score === 2);
      expect(best).toBeDefined();
      expect(best!.text).toBe(expectedBestAnswers[q.id]);
    });
  }
});
