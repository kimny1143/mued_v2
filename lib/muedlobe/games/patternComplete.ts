/**
 * Pattern Complete (PR-1) - Game Logic
 *
 * 知覚推理を測定。
 * 3×3マトリクスの右下欠損パターンを6択で補完。
 * Raven's Matrices 風。
 *
 * 20問: easy 5, medium 5, hard 5, expert 5
 * hard/expert は毎問異なる変換ルールを使用（ルール学習転移を防止）
 */

import { gameLog } from './debug';

export type PatternDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface PatternQuestion {
  id: number;
  difficulty: PatternDifficulty;
  /** 3×3 matrix cells (index 0-7 filled, index 8 is missing) */
  matrix: (string | null)[];
  /** 6 options, one correct */
  options: string[];
  correctIndex: number;
}

export interface PatternResponse {
  questionId: number;
  correct: boolean;
  difficulty: PatternDifficulty;
  responseTime: number;
  selectedIndex: number;
}

export interface PatternCompleteResult {
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  difficultyBreakdown: Record<PatternDifficulty, { correct: number; total: number }>;
}

const DIFFICULTY_WEIGHTS: Record<PatternDifficulty, number> = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
  expert: 2.0,
};

const SHAPES = ['●', '▲', '■', '◆', '★', '○', '△', '□', '◇', '☆'];

const SHAPE_PAIRS: [string, string][] = [
  ['●', '○'], ['▲', '△'], ['■', '□'], ['◆', '◇'], ['★', '☆'],
];

// ========================================
// Helpers
// ========================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** Build 3×3 matrix with (2,2) = null */
function buildMatrix(cellFn: (row: number, col: number) => string): (string | null)[] {
  const matrix: (string | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      matrix.push(r === 2 && c === 2 ? null : cellFn(r, c));
    }
  }
  return matrix;
}

/** Generate plausible 2D distractors (shape × quantity) */
function build2DDistractors(
  correctShape: string,
  correctQty: number,
  shapes: string[],
  qtys: number[],
): Set<string> {
  const set = new Set<string>();
  for (const s of shapes) {
    for (const q of qtys) {
      if (s !== correctShape || q !== correctQty) {
        set.add(s.repeat(q));
      }
    }
  }
  return set;
}

/** Generate plausible 3D distractors (shape × quantity × fill) */
function build3DDistractors(
  correctShape: string,
  partnerShape: string,
  correctQty: number,
  allPairs: [string, string][],
  qtys: number[],
): Set<string> {
  const set = new Set<string>();
  // Wrong fill
  set.add(partnerShape.repeat(correctQty));
  // Wrong qty (correct + partner fill)
  for (const q of qtys) {
    if (q !== correctQty) {
      set.add(correctShape.repeat(q));
      set.add(partnerShape.repeat(q));
    }
  }
  // Wrong shape pair entirely
  for (const [f, o] of allPairs) {
    if (f !== correctShape && f !== partnerShape) {
      set.add(f.repeat(correctQty));
      set.add(o.repeat(correctQty));
    }
  }
  return set;
}

/** Build 6 shuffled options from a distractor set */
function finalizeOptions(correct: string, distractorSet: Set<string>): string[] {
  const distractors = shuffle(Array.from(distractorSet).filter(d => d !== correct));
  const selected = [correct, ...distractors.slice(0, 5)];
  while (selected.length < 6) {
    const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    if (!selected.includes(s)) selected.push(s);
  }
  return shuffle(selected);
}

// ========================================
// Question Generator
// ========================================

export function generatePatternQuestions(): PatternQuestion[] {
  const questions: PatternQuestion[] = [];
  let id = 0;

  for (let i = 0; i < 5; i++) questions.push(generateEasy(id++, i));
  for (let i = 0; i < 5; i++) questions.push(generateMedium(id++, i));
  // Each hard/expert question uses a DIFFERENT rule
  const hardGens = [generateHard0, generateHard1, generateHard2, generateHard3, generateHard4];
  const expertGens = [generateExpert0, generateExpert1, generateExpert2, generateExpert3, generateExpert4];
  for (let i = 0; i < 5; i++) questions.push(hardGens[i](id++));
  for (let i = 0; i < 5; i++) questions.push(expertGens[i](id++));

  return questions;
}

// ========================================
// Easy: Progression (same rule type, different shapes)
// ========================================

function generateEasy(id: number, variant: number): PatternQuestion {
  const shape = SHAPES[variant % SHAPES.length];
  const matrix = buildMatrix((r, c) => shape.repeat(c + 1));
  const correct = shape.repeat(3);
  const distractors = build2DDistractors(shape, 3, [shape, ...pickN(SHAPES.filter(s => s !== shape), 2)], [1, 2, 3, 4]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'easy', matrix, options, correctIndex: options.indexOf(correct) };
}

// ========================================
// Medium: Addition (Row0 + Row1 = Row2, same rule type)
// ========================================

function generateMedium(id: number, variant: number): PatternQuestion {
  const shapeA = SHAPES[variant % SHAPES.length];
  const shapeB = SHAPES[(variant + 1) % SHAPES.length];

  const row2Val = shapeA + shapeB;
  const matrix: (string | null)[] = [
    shapeA, shapeB, shapeA,
    shapeB, shapeA, shapeB,
    shapeA + shapeB, shapeB + shapeA, null,
  ];

  const distractors = new Set<string>([
    shapeB + shapeA, shapeA + shapeA, shapeB + shapeB, shapeA, shapeB,
  ]);
  for (const s of SHAPES.slice(0, 4)) {
    if (s !== shapeA && s !== shapeB) distractors.add(s + shapeA);
  }
  const options = finalizeOptions(row2Val, distractors);
  return { id, difficulty: 'medium', matrix, options, correctIndex: options.indexOf(row2Val) };
}

// ========================================
// Hard: 5 different 2D transformation rules
// ========================================

/**
 * Hard 0: Column=shape, Row=non-monotonic quantity
 * ルール: 列が形を決め、行が数量を決めるが、数量が非単調（例: 2,1,3）
 */
function generateHard0(id: number): PatternQuestion {
  const shapes = pickN(SHAPES, 3);
  // Non-monotonic row quantities
  const patterns = [[2, 1, 3], [3, 1, 2], [1, 3, 2], [2, 3, 1]];
  const rowQtys = patterns[Math.floor(Math.random() * patterns.length)];

  const matrix = buildMatrix((r, c) => shapes[c].repeat(rowQtys[r]));
  const correct = shapes[2].repeat(rowQtys[2]);
  const distractors = build2DDistractors(shapes[2], rowQtys[2], shapes, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'hard', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Hard 1: Row=shape, Column=non-monotonic quantity (Hard 0の転置)
 * ルール: 行が形を決め、列が数量を決める
 */
function generateHard1(id: number): PatternQuestion {
  const shapes = pickN(SHAPES, 3);
  const patterns = [[1, 3, 2], [3, 1, 2], [2, 3, 1], [3, 2, 1]];
  const colQtys = patterns[Math.floor(Math.random() * patterns.length)];

  const matrix = buildMatrix((r, c) => shapes[r].repeat(colQtys[c]));
  const correct = shapes[2].repeat(colQtys[2]);
  const distractors = build2DDistractors(shapes[2], colQtys[2], shapes, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'hard', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Hard 2: Column=shape, diagonal quantity
 * ルール: 列が形、数量は対角パターン qty=(r+c)%3+1
 * 行でも列でもなく「対角線」で数量が決まる
 *
 * qty grid:
 *   1 2 3
 *   2 3 1
 *   3 1 [2]
 */
function generateHard2(id: number): PatternQuestion {
  const shapes = pickN(SHAPES, 3);
  const matrix = buildMatrix((r, c) => {
    const qty = (r + c) % 3 + 1;
    return shapes[c].repeat(qty);
  });

  const correctQty = (2 + 2) % 3 + 1; // = 2
  const correct = shapes[2].repeat(correctQty);
  const distractors = build2DDistractors(shapes[2], correctQty, shapes, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'hard', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Hard 3: Rotating shapes + shifting doubled-quantity position
 * ルール: 形が行ごとに右回転、「数量2」のセルも右にシフト
 *
 * Row 0: [A×1, B×2, C×1]   doubled at col 1
 * Row 1: [C×1, A×1, B×2]   doubled at col 2
 * Row 2: [B×2, C×1, A×?]   doubled at col 0 → answer: A×1
 */
function generateHard3(id: number): PatternQuestion {
  const shapes = pickN(SHAPES, 3);
  const shapeMap = [[0, 1, 2], [2, 0, 1], [1, 2, 0]];
  const doubledCol = [1, 2, 0];

  const matrix = buildMatrix((r, c) => {
    const shape = shapes[shapeMap[r][c]];
    const qty = c === doubledCol[r] ? 2 : 1;
    return shape.repeat(qty);
  });

  const correctShape = shapes[shapeMap[2][2]]; // shapes[0]
  const correctQty = 2 === doubledCol[2] ? 2 : 1; // col 2 ≠ 0 → 1
  const correct = correctShape.repeat(correctQty);
  const distractors = build2DDistractors(correctShape, correctQty, shapes, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'hard', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Hard 4: Column=shape, Latin square quantities
 * ルール: 列が形を決め、数量は列ごとに独立したパターン（ラテン方格）
 *
 * Col 0 qtys: [1, 3, 2]
 * Col 1 qtys: [3, 2, 1]
 * Col 2 qtys: [2, 1, ?→3]
 * 各行・各列に{1,2,3}が1回ずつ出現
 */
function generateHard4(id: number): PatternQuestion {
  const shapes = pickN(SHAPES, 3);
  const qtyMap = [[1, 3, 2], [3, 2, 1], [2, 1, 3]]; // [col][row]

  const matrix = buildMatrix((r, c) => shapes[c].repeat(qtyMap[c][r]));
  const correctQty = qtyMap[2][2]; // 3
  const correct = shapes[2].repeat(correctQty);
  const distractors = build2DDistractors(shapes[2], correctQty, shapes, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'hard', matrix, options, correctIndex: options.indexOf(correct) };
}

// ========================================
// Expert: 5 different 3D transformation rules
// (shape pair × quantity × filled/outline)
// ========================================

/**
 * Expert 0: Col=shapePair, Row=qty[1,2,3], fill=(r+c)%2
 * ルール: 列がペア、行が数量、塗りが対角交互
 */
function generateExpert0(id: number): PatternQuestion {
  const pairs = pickN(SHAPE_PAIRS, 3);
  const rowQtys = [1, 2, 3];

  const matrix = buildMatrix((r, c) => {
    const fill = (r + c) % 2;
    return pairs[c][fill].repeat(rowQtys[r]);
  });

  const correctFill = (2 + 2) % 2; // 0
  const correctShape = pairs[2][correctFill];
  const partnerShape = pairs[2][1 - correctFill];
  const correctQty = rowQtys[2]; // 3
  const correct = correctShape.repeat(correctQty);
  const distractors = build3DDistractors(correctShape, partnerShape, correctQty, pairs, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'expert', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Expert 1: Row=shapePair, Col=qty[1,3,2], fill=(r+c)%2
 * ルール: Expert 0の転置版。行がペア、列が数量
 */
function generateExpert1(id: number): PatternQuestion {
  const pairs = pickN(SHAPE_PAIRS, 3);
  const colQtys = [1, 3, 2];

  const matrix = buildMatrix((r, c) => {
    const fill = (r + c) % 2;
    return pairs[r][fill].repeat(colQtys[c]);
  });

  const correctFill = (2 + 2) % 2; // 0
  const correctShape = pairs[2][correctFill];
  const partnerShape = pairs[2][1 - correctFill];
  const correctQty = colQtys[2]; // 2
  const correct = correctShape.repeat(correctQty);
  const distractors = build3DDistractors(correctShape, partnerShape, correctQty, pairs, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'expert', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Expert 2: Col=shapePair, diagonal qty=(r+c)%3+1, fill=r%2
 * ルール: 数量が対角パターン、塗りが行ベース（対角ではない）
 */
function generateExpert2(id: number): PatternQuestion {
  const pairs = pickN(SHAPE_PAIRS, 3);

  const matrix = buildMatrix((r, c) => {
    const fill = r % 2;
    const qty = (r + c) % 3 + 1;
    return pairs[c][fill].repeat(qty);
  });

  const correctFill = 2 % 2; // 0
  const correctQty = (2 + 2) % 3 + 1; // 2
  const correctShape = pairs[2][correctFill];
  const partnerShape = pairs[2][1 - correctFill];
  const correct = correctShape.repeat(correctQty);
  const distractors = build3DDistractors(correctShape, partnerShape, correctQty, pairs, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'expert', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Expert 3: Latin-square shapePairs, Row=qty[2,1,3], fill=(r+c)%2
 * ルール: ペアが行ごとにラテン方格回転。どのペアが(2,2)に来るか推論が必要
 *
 * Row 0: [P0, P1, P2]
 * Row 1: [P2, P0, P1]
 * Row 2: [P1, P2, P0] → answer uses P0
 */
function generateExpert3(id: number): PatternQuestion {
  const pairs = pickN(SHAPE_PAIRS, 3);
  const rowQtys = [2, 1, 3];
  const pairMap = [[0, 1, 2], [2, 0, 1], [1, 2, 0]];

  const matrix = buildMatrix((r, c) => {
    const fill = (r + c) % 2;
    return pairs[pairMap[r][c]][fill].repeat(rowQtys[r]);
  });

  const correctPairIdx = pairMap[2][2]; // 0
  const correctFill = (2 + 2) % 2; // 0
  const correctShape = pairs[correctPairIdx][correctFill];
  const partnerShape = pairs[correctPairIdx][1 - correctFill];
  const correctQty = rowQtys[2]; // 3
  const correct = correctShape.repeat(correctQty);
  const distractors = build3DDistractors(correctShape, partnerShape, correctQty, pairs, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'expert', matrix, options, correctIndex: options.indexOf(correct) };
}

/**
 * Expert 4: Col=shapePair, Row=qty[3,1,2], fill=(r+c+1)%2 (反対角)
 * ルール: 塗りが反対角パターン（Expert 0の対角とは逆位相）
 */
function generateExpert4(id: number): PatternQuestion {
  const pairs = pickN(SHAPE_PAIRS, 3);
  const rowQtys = [3, 1, 2];

  const matrix = buildMatrix((r, c) => {
    const fill = (r + c + 1) % 2; // anti-diagonal
    return pairs[c][fill].repeat(rowQtys[r]);
  });

  const correctFill = (2 + 2 + 1) % 2; // 1
  const correctShape = pairs[2][correctFill];
  const partnerShape = pairs[2][1 - correctFill];
  const correctQty = rowQtys[2]; // 2
  const correct = correctShape.repeat(correctQty);
  const distractors = build3DDistractors(correctShape, partnerShape, correctQty, pairs, [1, 2, 3]);
  const options = finalizeOptions(correct, distractors);
  return { id, difficulty: 'expert', matrix, options, correctIndex: options.indexOf(correct) };
}

// ========================================
// Scoring
// ========================================

export function scorePatternComplete(responses: PatternResponse[]): PatternCompleteResult {
  gameLog('PatternComplete', 'scorePatternComplete:input', { responseCount: responses.length });
  let totalScore = 0;
  const breakdown: Record<PatternDifficulty, { correct: number; total: number }> = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    expert: { correct: 0, total: 0 },
  };

  for (const r of responses) {
    breakdown[r.difficulty].total++;
    if (r.correct) {
      breakdown[r.difficulty].correct++;
      totalScore += DIFFICULTY_WEIGHTS[r.difficulty];
    }
  }

  const result = {
    totalScore: Math.round(totalScore * 100) / 100,
    correctCount: responses.filter(r => r.correct).length,
    totalQuestions: responses.length,
    difficultyBreakdown: breakdown,
  };
  gameLog('PatternComplete', 'scorePatternComplete:output', { totalScore: result.totalScore, correctCount: result.correctCount });
  return result;
}
