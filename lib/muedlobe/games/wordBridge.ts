/**
 * Word Bridge (VC-1) - Game Logic
 *
 * 言語的抽象化・概念形成を測定。
 * 2つの単語の共通点を4択から選ぶ。
 */

import { gameLog } from './debug';

export interface WordBridgeQuestion {
  id: number;
  wordA: string;
  wordB: string;
  options: { text: string; score: number }[];
}

export interface WordBridgeTrial {
  questionId: number;
  selectedScore: number | null;
  responseTime: number | null;
}

export interface WordBridgeResult {
  totalScore: number;
  maxScore: number;
  questionsAnswered: number;
}

export const WORD_BRIDGE_QUESTIONS: WordBridgeQuestion[] = [
  {
    id: 1,
    wordA: 'ピアノ', wordB: 'ギター',
    options: [
      { text: '楽器', score: 2 },
      { text: '音を出すもの', score: 1 },
      { text: '木でできている', score: 0 },
      { text: '高い', score: 0 },
    ],
  },
  {
    id: 2,
    wordA: '詩', wordB: '彫刻',
    options: [
      { text: '芸術作品', score: 2 },
      { text: '創作物', score: 1 },
      { text: '古い', score: 0 },
      { text: '学校で習う', score: 0 },
    ],
  },
  {
    id: 3,
    wordA: '種', wordB: '卵',
    options: [
      { text: '生命の起源', score: 2 },
      { text: '成長するもの', score: 1 },
      { text: '小さい', score: 0 },
      { text: '食べられる', score: 0 },
    ],
  },
  {
    id: 4,
    wordA: '山', wordB: '海',
    options: [
      { text: '自然地形', score: 2 },
      { text: '大きい', score: 1 },
      { text: '旅行先', score: 0 },
      { text: '写真で見る', score: 0 },
    ],
  },
  {
    id: 5,
    wordA: '怒り', wordB: '喜び',
    options: [
      { text: '感情', score: 2 },
      { text: '人間の状態', score: 1 },
      { text: '顔に出る', score: 0 },
      { text: '突然起こる', score: 0 },
    ],
  },
  {
    id: 6,
    wordA: '時計', wordB: 'カレンダー',
    options: [
      { text: '時間を示す道具', score: 2 },
      { text: '数字がある', score: 1 },
      { text: '壁にかける', score: 0 },
      { text: '毎日見る', score: 0 },
    ],
  },
  {
    id: 7,
    wordA: '蝶', wordB: '飛行機',
    options: [
      { text: '飛ぶもの', score: 2 },
      { text: '羽がある', score: 1 },
      { text: '速い', score: 0 },
      { text: '外にいる', score: 0 },
    ],
  },
  {
    id: 8,
    wordA: '民主主義', wordB: '独裁',
    options: [
      { text: '政治体制', score: 2 },
      { text: '国の仕組み', score: 1 },
      { text: '難しい', score: 0 },
      { text: 'ニュースで聞く', score: 0 },
    ],
  },
  {
    id: 9,
    wordA: '記憶', wordB: '想像',
    options: [
      { text: '心的機能', score: 2 },
      { text: '頭の中で起こる', score: 1 },
      { text: '目に見えない', score: 0 },
      { text: '人間だけのもの', score: 0 },
    ],
  },
  {
    id: 10,
    wordA: '報酬', wordB: '罰',
    options: [
      { text: '行動の結果', score: 2 },
      { text: 'しつけの手段', score: 1 },
      { text: '学校にある', score: 0 },
      { text: '嬉しいか悲しい', score: 0 },
    ],
  },
  {
    id: 11,
    wordA: '始まり', wordB: '終わり',
    options: [
      { text: '時間的境界', score: 2 },
      { text: '対になる概念', score: 1 },
      { text: '区切り', score: 0 },
      { text: '物語にある', score: 0 },
    ],
  },
  {
    id: 12,
    wordA: '敵', wordB: '味方',
    options: [
      { text: '関係性の分類', score: 2 },
      { text: '人間関係', score: 1 },
      { text: '戦いに関係する', score: 0 },
      { text: 'スポーツにいる', score: 0 },
    ],
  },
];

/** Shuffle options for a question */
export function shuffleOptions(question: WordBridgeQuestion): WordBridgeQuestion {
  return {
    ...question,
    options: [...question.options].sort(() => Math.random() - 0.5),
  };
}

/** Score the completed game */
export function scoreWordBridge(trials: WordBridgeTrial[]): WordBridgeResult {
  gameLog('WordBridge', 'scoreWordBridge:input', { trialCount: trials.length });
  const answered = trials.filter(t => t.selectedScore !== null);
  const totalScore = answered.reduce((sum, t) => sum + (t.selectedScore ?? 0), 0);

  const result = {
    totalScore,
    maxScore: 24, // 12 questions × 2 points
    questionsAnswered: answered.length,
  };
  gameLog('WordBridge', 'scoreWordBridge:output', result);
  return result;
}
