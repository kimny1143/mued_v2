/**
 * Mental Math (WM-2) - Game Logic
 *
 * ワーキングメモリを測定。
 * 音声提示の暗算問題を8レベル×3問=計24問。
 */

import { gameLog } from './debug';

export interface MathQuestion {
  id: number;
  level: number;
  text: string;       // 読み上げ用テキスト
  display: string;    // 表示用（回答後に見せる）
  answer: number;
  timeLimit: number;  // ms
}

export interface MathResponse {
  questionId: number;
  correct: boolean;
  level: number;
  responseTime: number;
  timeLimit: number;
  userAnswer: number | null;
}

export interface MentalMathResult {
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  responses: MathResponse[];
}

const LEVEL_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.3,
  4: 1.5,
  5: 1.5,
  6: 1.8,
  7: 2.0,
  8: 2.5,
};

const LEVEL_TIME_LIMITS: Record<number, number> = {
  1: 10_000,
  2: 15_000,
  3: 15_000,
  4: 20_000,
  5: 20_000,
  6: 25_000,
  7: 30_000,
  8: 30_000,
};

/** Generate all 24 questions (8 levels × 3) */
export function generateMathQuestions(): MathQuestion[] {
  const questions: MathQuestion[] = [];
  let id = 0;

  // Level 1: Single-digit addition/subtraction
  for (let i = 0; i < 3; i++) {
    const a = randInt(2, 9);
    const b = randInt(1, a - 1);
    const isAdd = Math.random() > 0.5;
    if (isAdd) {
      questions.push({
        id: id++, level: 1,
        text: `${a} たす ${b} は？`,
        display: `${a} + ${b}`,
        answer: a + b,
        timeLimit: LEVEL_TIME_LIMITS[1],
      });
    } else {
      questions.push({
        id: id++, level: 1,
        text: `${a} ひく ${b} は？`,
        display: `${a} - ${b}`,
        answer: a - b,
        timeLimit: LEVEL_TIME_LIMITS[1],
      });
    }
  }

  // Level 2: Two-digit addition/subtraction
  for (let i = 0; i < 3; i++) {
    const a = randInt(11, 49);
    const b = randInt(11, 30);
    const isAdd = Math.random() > 0.5;
    if (isAdd) {
      questions.push({
        id: id++, level: 2,
        text: `${a} たす ${b} は？`,
        display: `${a} + ${b}`,
        answer: a + b,
        timeLimit: LEVEL_TIME_LIMITS[2],
      });
    } else {
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      questions.push({
        id: id++, level: 2,
        text: `${big} ひく ${small} は？`,
        display: `${big} - ${small}`,
        answer: big - small,
        timeLimit: LEVEL_TIME_LIMITS[2],
      });
    }
  }

  // Level 3: Multiplication/Division
  for (let i = 0; i < 3; i++) {
    const a = randInt(3, 9);
    const b = randInt(3, 9);
    questions.push({
      id: id++, level: 3,
      text: `${a} かける ${b} は？`,
      display: `${a} × ${b}`,
      answer: a * b,
      timeLimit: LEVEL_TIME_LIMITS[3],
    });
  }

  // Level 4: Compound operations
  for (let i = 0; i < 3; i++) {
    const a = randInt(10, 25);
    const b = randInt(3, 12);
    const c = randInt(2, 8);
    questions.push({
      id: id++, level: 4,
      text: `${a} たす ${b} ひく ${c} は？`,
      display: `${a} + ${b} - ${c}`,
      answer: a + b - c,
      timeLimit: LEVEL_TIME_LIMITS[4],
    });
  }

  // Level 5: Word problems (short)
  const wordProblems = generateWordProblems();
  for (let i = 0; i < 3; i++) {
    questions.push({
      id: id++, level: 5,
      ...wordProblems[i],
      timeLimit: LEVEL_TIME_LIMITS[5],
    });
  }

  // Level 6: Multi-step compound operations (3-4 steps)
  const level6 = generateMultiStepProblems();
  for (let i = 0; i < 3; i++) {
    questions.push({
      id: id++, level: 6,
      ...level6[i],
      timeLimit: LEVEL_TIME_LIMITS[6],
    });
  }

  // Level 7: Proportional reasoning
  const level7 = generateProportionalProblems();
  for (let i = 0; i < 3; i++) {
    questions.push({
      id: id++, level: 7,
      ...level7[i],
      timeLimit: LEVEL_TIME_LIMITS[7],
    });
  }

  // Level 8: Multi-variable tracking
  const level8 = generateMultiVariableProblems();
  for (let i = 0; i < 3; i++) {
    questions.push({
      id: id++, level: 8,
      ...level8[i],
      timeLimit: LEVEL_TIME_LIMITS[8],
    });
  }

  return questions;
}

function generateWordProblems(): { text: string; display: string; answer: number }[] {
  const a1 = randInt(3, 8);
  const a2 = randInt(2, 6);
  const b1 = randInt(10, 20);
  const b2 = randInt(3, 7);
  const c1 = randInt(5, 9);
  const c2 = randInt(2, 4);

  return [
    {
      text: `りんごが${a1}個とみかんが${a2}個、合わせていくつ？`,
      display: `りんご${a1}個 + みかん${a2}個`,
      answer: a1 + a2,
    },
    {
      text: `${b1}枚のカードから${b2}枚使ったら、残りは何枚？`,
      display: `${b1}枚 - ${b2}枚`,
      answer: b1 - b2,
    },
    {
      text: `${c1}人に${c2}個ずつ配ると、全部でいくつ必要？`,
      display: `${c1}人 × ${c2}個`,
      answer: c1 * c2,
    },
  ];
}

/** Level 6: Multi-step compound (3-4 operations chained) */
function generateMultiStepProblems(): { text: string; display: string; answer: number }[] {
  const problems: { text: string; display: string; answer: number }[] = [];

  // Problem 1: a × b + c - d
  const a1 = randInt(3, 7), b1 = randInt(4, 8), c1 = randInt(10, 20), d1 = randInt(5, 15);
  const ans1 = a1 * b1 + c1 - d1;
  problems.push({
    text: `${a1} かける ${b1} たす ${c1} ひく ${d1} は？`,
    display: `${a1} × ${b1} + ${c1} - ${d1}`,
    answer: ans1,
  });

  // Problem 2: (a + b) × c - d
  const a2 = randInt(5, 12), b2 = randInt(3, 8), c2 = randInt(2, 5), d2 = randInt(5, 15);
  const ans2 = (a2 + b2) * c2 - d2;
  problems.push({
    text: `${a2} たす ${b2} の合計を ${c2} 倍して、${d2} を引くと？`,
    display: `(${a2} + ${b2}) × ${c2} - ${d2}`,
    answer: ans2,
  });

  // Problem 3: a × b ÷ c + d (ensure divisible)
  const c3 = randInt(2, 5);
  const a3 = randInt(3, 8);
  const b3 = c3 * randInt(2, 4); // ensure b3 is divisible by c3
  const d3 = randInt(5, 15);
  const ans3 = a3 * b3 / c3 + d3;
  problems.push({
    text: `${a3} かける ${b3} を ${c3} で割って ${d3} を足すと？`,
    display: `${a3} × ${b3} ÷ ${c3} + ${d3}`,
    answer: ans3,
  });

  return problems;
}

/** Level 7: Proportional / inverse-proportional reasoning */
function generateProportionalProblems(): { text: string; display: string; answer: number }[] {
  const problems: { text: string; display: string; answer: number }[] = [];

  // Problem 1: Direct proportion
  const workers1 = randInt(3, 6);
  const days1 = randInt(4, 8);
  const workers2 = randInt(2, 4);
  // workers1 * days1 = workers2 * answer => answer = workers1 * days1 / workers2
  // Ensure divisible
  const totalWork = workers1 * days1;
  const adjustedWorkers2 = totalWork % workers2 === 0 ? workers2 : workers1; // fallback to ensure clean division
  const ans1 = totalWork / adjustedWorkers2;
  problems.push({
    text: `${workers1}人で${days1}日かかる仕事を、${adjustedWorkers2}人でやると何日？`,
    display: `${workers1}人×${days1}日 → ${adjustedWorkers2}人で？日`,
    answer: ans1,
  });

  // Problem 2: Rate comparison
  const rate = randInt(3, 8);
  const quantity = randInt(5, 12);
  const totalCost = rate * quantity;
  const newQuantity = randInt(7, 15);
  const ans2 = rate * newQuantity;
  problems.push({
    text: `${quantity}個で${totalCost}円の品物があります。同じ単価で${newQuantity}個買うといくら？`,
    display: `${quantity}個=${totalCost}円 → ${newQuantity}個=？円`,
    answer: ans2,
  });

  // Problem 3: Percentage reasoning
  const original = randInt(4, 12) * 10; // e.g., 40-120
  const percent = randInt(2, 4) * 10;   // 20%, 30%, 40%
  const reduction = original * percent / 100;
  const ans3 = original - reduction;
  problems.push({
    text: `${original}円の商品が${percent}%引きになりました。いくら？`,
    display: `${original}円 - ${percent}% = ？`,
    answer: ans3,
  });

  return problems;
}

/** Level 8: Multi-variable tracking (A = f(B), B = f(C), solve for A) */
function generateMultiVariableProblems(): { text: string; display: string; answer: number }[] {
  const problems: { text: string; display: string; answer: number }[] = [];

  // Problem 1: A = 3B, B = C + 5, C = 2. What is A?
  const c1 = randInt(2, 5);
  const bOffset = randInt(3, 7);
  const aMult = randInt(2, 4);
  const b1 = c1 + bOffset;
  const a1 = aMult * b1;
  problems.push({
    text: `AはBの${aMult}倍、BはCより${bOffset}大きい。Cが${c1}のとき、Aはいくつ？`,
    display: `A=${aMult}B, B=C+${bOffset}, C=${c1} → A=?`,
    answer: a1,
  });

  // Problem 2: X + Y = sum, X = mult × Y. What is X?
  const y2 = randInt(3, 8);
  const mult2 = randInt(2, 4);
  const x2 = mult2 * y2;
  const sum2 = x2 + y2;
  problems.push({
    text: `XとYの合計は${sum2}で、XはYの${mult2}倍です。Xはいくつ？`,
    display: `X+Y=${sum2}, X=${mult2}Y → X=?`,
    answer: x2,
  });

  // Problem 3: Three-chain: P = Q - diff, Q = R × mult, R = val
  const r3 = randInt(3, 6);
  const mult3 = randInt(2, 4);
  const diff3 = randInt(3, 8);
  const q3 = r3 * mult3;
  const p3 = q3 - diff3;
  problems.push({
    text: `PはQより${diff3}小さく、QはRの${mult3}倍。Rが${r3}のとき、Pはいくつ？`,
    display: `P=Q-${diff3}, Q=${mult3}R, R=${r3} → P=?`,
    answer: p3,
  });

  return problems;
}

/** Score the completed game */
export function scoreMentalMath(responses: MathResponse[]): MentalMathResult {
  gameLog('MentalMath', 'scoreMentalMath:input', { responseCount: responses.length });
  let totalScore = 0;

  for (const r of responses) {
    if (r.correct) {
      const base = LEVEL_WEIGHTS[r.level] ?? 1.0;
      const timeRatio = r.responseTime / r.timeLimit;
      const timeBonus = timeRatio <= 0.5 ? (0.5 - timeRatio) * 0.5 : 0;
      totalScore += base + timeBonus;
    }
  }

  const result = {
    totalScore: Math.round(totalScore * 100) / 100,
    correctCount: responses.filter(r => r.correct).length,
    totalQuestions: responses.length,
    responses,
  };
  gameLog('MentalMath', 'scoreMentalMath:output', { totalScore: result.totalScore, correctCount: result.correctCount });
  return result;
}

/** Speak text using Web Speech API */
export function speakText(text: string, lang: string = 'ja-JP'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
