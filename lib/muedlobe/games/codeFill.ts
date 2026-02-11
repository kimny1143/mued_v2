/**
 * Code Fill (PS-2) - Game Logic
 *
 * 連合学習・視覚運動速度を測定。
 * 対応表を参照し、数字に対応する記号を選ぶ。
 */

import { gameLog } from './debug';

export const CODE_PAIRS: { digit: number; symbol: string }[] = [
  { digit: 1, symbol: '◇' },
  { digit: 2, symbol: '△' },
  { digit: 3, symbol: '○' },
  { digit: 4, symbol: '☆' },
  { digit: 5, symbol: '✕' },
  { digit: 6, symbol: '□' },
  { digit: 7, symbol: '⬡' },
  { digit: 8, symbol: '◎' },
  { digit: 9, symbol: '⬢' },
];

export const CODE_FILL_TIME_LIMIT_MS = 120_000;

export interface CodeFillTrial {
  digit: number;
  correctSymbol: string;
  /** Shuffled symbol order for button display (prevents position memorization) */
  shuffledSymbols: string[];
  userAnswer: string | null;
  correct: boolean | null;
  responseTime: number | null;
}

export interface CodeFillResult {
  correct: number;
  incorrect: number;
  totalAttempted: number;
  rawScore: number;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate a random trial with shuffled button order */
export function generateCodeFillTrial(): CodeFillTrial {
  const pair = CODE_PAIRS[Math.floor(Math.random() * CODE_PAIRS.length)];
  return {
    digit: pair.digit,
    correctSymbol: pair.symbol,
    shuffledSymbols: shuffle(CODE_PAIRS.map(p => p.symbol)),
    userAnswer: null,
    correct: null,
    responseTime: null,
  };
}

/** Score the completed game */
export function scoreCodeFill(trials: CodeFillTrial[]): CodeFillResult {
  gameLog('CodeFill', 'scoreCodeFill:input', { trialCount: trials.length });
  const answered = trials.filter(t => t.userAnswer !== null);
  let correct = 0;
  let incorrect = 0;

  for (const trial of answered) {
    if (trial.correct) {
      correct++;
    } else {
      incorrect++;
    }
  }

  const result = {
    correct,
    incorrect,
    totalAttempted: answered.length,
    rawScore: Math.max(0, correct - incorrect * 0.5),
  };
  gameLog('CodeFill', 'scoreCodeFill:output', result);
  return result;
}
