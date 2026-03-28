/**
 * GET /api/lobe/game-config — Game configuration for native apps
 *
 * Returns all game parameters, scoring norms, and content data
 * needed by the native MUEDlobe implementation.
 *
 * Query params:
 *   locale: "ja" | "en" (default: "ja")
 *
 * Auth: Clerk JWT (withAuth)
 */

import { type NextRequest, NextResponse } from 'next/server';

// ========================================
// Game Config Version — increment when data changes
// ========================================

const CONFIG_VERSION = 1;

// ========================================
// Static game data (from lib/muedlobe/games/*.ts)
// ========================================

const TONE_SEQUENCE_CONFIG = {
  tones: [
    { note: 'C4', frequency: 261.63 },
    { note: 'D4', frequency: 293.66 },
    { note: 'E4', frequency: 329.63 },
    { note: 'F4', frequency: 349.23 },
    { note: 'G4', frequency: 392.00 },
    { note: 'A4', frequency: 440.00 },
    { note: 'B4', frequency: 493.88 },
    { note: 'C5', frequency: 523.25 },
  ],
  toneDurationMs: 500,
  toneGapMs: 500,
  modes: [
    { id: 'forward', startLength: 3, maxLength: 12, weight: 1.0 },
    { id: 'backward', startLength: 2, maxLength: 10, weight: 1.2 },
    { id: 'sequencing', startLength: 2, maxLength: 12, weight: 1.3 },
  ],
};

const MENTAL_MATH_CONFIG = {
  levels: [
    { level: 1, timeLimitMs: 10000, weight: 1.0, questionsPerLevel: 3 },
    { level: 2, timeLimitMs: 15000, weight: 1.2, questionsPerLevel: 3 },
    { level: 3, timeLimitMs: 15000, weight: 1.3, questionsPerLevel: 3 },
    { level: 4, timeLimitMs: 20000, weight: 1.5, questionsPerLevel: 3 },
    { level: 5, timeLimitMs: 20000, weight: 1.5, questionsPerLevel: 3 },
    { level: 6, timeLimitMs: 25000, weight: 1.8, questionsPerLevel: 3 },
    { level: 7, timeLimitMs: 30000, weight: 2.0, questionsPerLevel: 3 },
    { level: 8, timeLimitMs: 30000, weight: 2.5, questionsPerLevel: 3 },
  ],
  timeBonusThreshold: 0.5,
  timeBonusMultiplier: 0.5,
  ttsLang: 'ja-JP',
  ttsRate: 0.9,
};

const SYMBOL_MATCH_CONFIG = {
  symbols: [
    '◇', '◆', '☆', '★', '△', '▲', '▽', '▼', '○', '●',
    '□', '■', '◎', '⊕', '⊗', '⊘', '⬡', '⬢', '⊞', '⊠',
  ],
  confusables: {
    '◇': ['◆'], '◆': ['◇'],
    '☆': ['★'], '★': ['☆'],
    '△': ['▲', '▽'], '▲': ['△', '▼'],
    '▽': ['▼', '△'], '▼': ['▽', '▲'],
    '○': ['●', '◎'], '●': ['○', '◎'],
    '□': ['■', '⊞'], '■': ['□', '⊠'],
    '◎': ['⊕', '○'], '⊕': ['◎', '⊗'],
    '⊗': ['⊘', '⊕'], '⊘': ['⊗'],
    '⬡': ['⬢'], '⬢': ['⬡'],
    '⊞': ['⊠', '□'], '⊠': ['⊞', '■'],
  } as Record<string, string[]>,
  targetCount: 2,
  comparisonCount: 5,
  targetPresenceRate: 0.5,
  confusableInjectionRate: 0.5,
  timeLimitMs: 120000,
};

const CODE_FILL_CONFIG = {
  codePairs: [
    { digit: 1, symbol: '◇' },
    { digit: 2, symbol: '△' },
    { digit: 3, symbol: '○' },
    { digit: 4, symbol: '☆' },
    { digit: 5, symbol: '✕' },
    { digit: 6, symbol: '□' },
    { digit: 7, symbol: '⬡' },
    { digit: 8, symbol: '◎' },
    { digit: 9, symbol: '⬢' },
  ],
  timeLimitMs: 120000,
  incorrectPenalty: 0.5,
};

const WORD_BRIDGE_QUESTIONS_JA = [
  { id: 1, wordA: 'ピアノ', wordB: 'ギター', options: [{ text: '楽器', score: 2 }, { text: '音を出すもの', score: 1 }, { text: '木でできている', score: 0 }, { text: '高い', score: 0 }] },
  { id: 2, wordA: '詩', wordB: '彫刻', options: [{ text: '芸術作品', score: 2 }, { text: '創作物', score: 1 }, { text: '古い', score: 0 }, { text: '学校で習う', score: 0 }] },
  { id: 3, wordA: '種', wordB: '卵', options: [{ text: '生命の起源', score: 2 }, { text: '成長するもの', score: 1 }, { text: '小さい', score: 0 }, { text: '食べられる', score: 0 }] },
  { id: 4, wordA: '山', wordB: '海', options: [{ text: '自然地形', score: 2 }, { text: '大きい', score: 1 }, { text: '旅行先', score: 0 }, { text: '写真で見る', score: 0 }] },
  { id: 5, wordA: '怒り', wordB: '喜び', options: [{ text: '感情', score: 2 }, { text: '人間の状態', score: 1 }, { text: '顔に出る', score: 0 }, { text: '突然起こる', score: 0 }] },
  { id: 6, wordA: '時計', wordB: 'カレンダー', options: [{ text: '時間を示す道具', score: 2 }, { text: '数字がある', score: 1 }, { text: '壁にかける', score: 0 }, { text: '毎日見る', score: 0 }] },
  { id: 7, wordA: '蝶', wordB: '飛行機', options: [{ text: '飛ぶもの', score: 2 }, { text: '羽がある', score: 1 }, { text: '速い', score: 0 }, { text: '外にいる', score: 0 }] },
  { id: 8, wordA: '民主主義', wordB: '独裁', options: [{ text: '政治体制', score: 2 }, { text: '国の仕組み', score: 1 }, { text: '難しい', score: 0 }, { text: 'ニュースで聞く', score: 0 }] },
  { id: 9, wordA: '記憶', wordB: '想像', options: [{ text: '心的機能', score: 2 }, { text: '頭の中で起こる', score: 1 }, { text: '目に見えない', score: 0 }, { text: '人間だけのもの', score: 0 }] },
  { id: 10, wordA: '報酬', wordB: '罰', options: [{ text: '行動の結果', score: 2 }, { text: 'しつけの手段', score: 1 }, { text: '学校にある', score: 0 }, { text: '嬉しいか悲しい', score: 0 }] },
  { id: 11, wordA: '始まり', wordB: '終わり', options: [{ text: '時間的境界', score: 2 }, { text: '対になる概念', score: 1 }, { text: '区切り', score: 0 }, { text: '物語にある', score: 0 }] },
  { id: 12, wordA: '敵', wordB: '味方', options: [{ text: '関係性の分類', score: 2 }, { text: '人間関係', score: 1 }, { text: '戦いに関係する', score: 0 }, { text: 'スポーツにいる', score: 0 }] },
];

const WORD_BRIDGE_QUESTIONS_EN = [
  { id: 1, wordA: 'Piano', wordB: 'Guitar', options: [{ text: 'Musical instrument', score: 2 }, { text: 'Makes sound', score: 1 }, { text: 'Made of wood', score: 0 }, { text: 'Expensive', score: 0 }] },
  { id: 2, wordA: 'Poetry', wordB: 'Sculpture', options: [{ text: 'Work of art', score: 2 }, { text: 'Creative expression', score: 1 }, { text: 'Old', score: 0 }, { text: 'Studied in school', score: 0 }] },
  { id: 3, wordA: 'Seed', wordB: 'Egg', options: [{ text: 'Origin of life', score: 2 }, { text: 'Something that grows', score: 1 }, { text: 'Small', score: 0 }, { text: 'Edible', score: 0 }] },
  { id: 4, wordA: 'Mountain', wordB: 'Ocean', options: [{ text: 'Natural landform', score: 2 }, { text: 'Vast in scale', score: 1 }, { text: 'Travel destination', score: 0 }, { text: 'Seen in photos', score: 0 }] },
  { id: 5, wordA: 'Anger', wordB: 'Joy', options: [{ text: 'Emotion', score: 2 }, { text: 'Human state', score: 1 }, { text: 'Shows on your face', score: 0 }, { text: 'Comes suddenly', score: 0 }] },
  { id: 6, wordA: 'Clock', wordB: 'Calendar', options: [{ text: 'Time-keeping tool', score: 2 }, { text: 'Has numbers', score: 1 }, { text: 'Hangs on a wall', score: 0 }, { text: 'Checked daily', score: 0 }] },
  { id: 7, wordA: 'Butterfly', wordB: 'Airplane', options: [{ text: 'Something that flies', score: 2 }, { text: 'Has wings', score: 1 }, { text: 'Fast', score: 0 }, { text: 'Found outdoors', score: 0 }] },
  { id: 8, wordA: 'Democracy', wordB: 'Dictatorship', options: [{ text: 'Political system', score: 2 }, { text: 'Way of governing', score: 1 }, { text: 'Complicated', score: 0 }, { text: 'Heard in the news', score: 0 }] },
  { id: 9, wordA: 'Memory', wordB: 'Imagination', options: [{ text: 'Mental faculty', score: 2 }, { text: 'Happens in your mind', score: 1 }, { text: 'Invisible', score: 0 }, { text: 'Unique to humans', score: 0 }] },
  { id: 10, wordA: 'Reward', wordB: 'Punishment', options: [{ text: 'Consequence of action', score: 2 }, { text: 'Means of discipline', score: 1 }, { text: 'Exists in school', score: 0 }, { text: 'Happy or sad', score: 0 }] },
  { id: 11, wordA: 'Beginning', wordB: 'End', options: [{ text: 'Temporal boundary', score: 2 }, { text: 'Opposing concept', score: 1 }, { text: 'A dividing point', score: 0 }, { text: 'Found in stories', score: 0 }] },
  { id: 12, wordA: 'Enemy', wordB: 'Ally', options: [{ text: 'Category of relationship', score: 2 }, { text: 'Interpersonal role', score: 1 }, { text: 'Related to conflict', score: 0 }, { text: 'Found in sports', score: 0 }] },
];

const WORD_BRIDGE_CONFIG_JA = {
  questions: WORD_BRIDGE_QUESTIONS_JA,
  maxScorePerQuestion: 2,
  totalQuestions: 12,
};

const WORD_BRIDGE_CONFIG_EN = {
  questions: WORD_BRIDGE_QUESTIONS_EN,
  maxScorePerQuestion: 2,
  totalQuestions: 12,
};

const PATTERN_COMPLETE_CONFIG = {
  shapes: ['●', '▲', '■', '◆', '★', '○', '△', '□', '◇', '☆'],
  shapePairs: [
    { filled: '●', outlined: '○' },
    { filled: '▲', outlined: '△' },
    { filled: '■', outlined: '□' },
    { filled: '◆', outlined: '◇' },
    { filled: '★', outlined: '☆' },
  ],
  difficulties: [
    { id: 'easy', questionCount: 5, weight: 1.0 },
    { id: 'medium', questionCount: 5, weight: 1.2 },
    { id: 'hard', questionCount: 5, weight: 1.5 },
    { id: 'expert', questionCount: 5, weight: 2.0 },
  ],
};

const FOCUS_FLOW_CONFIG = {
  targetSymbol: '♪',
  distractorSymbols: ['♩', '♫', '♬', '𝄞'],
  stimulusDurationMs: 250,
  interStimulusIntervalMs: 1000,
  totalStimuli: 180,
  targetRate: 0.2,
  feedbackToneHz: 880,
  feedbackDurationMs: 80,
  feedbackGain: 0.15,
};

const SCORING_CONFIG = {
  norms: {
    wm: { mean: 16, sd: 5 },
    ps: { mean: 35, sd: 15 },
    vc: { mean: 15, sd: 5 },
    pr: { mean: 12, sd: 5 },
    att: { mean: 2.5, sd: 0.8 },
  },
  scoreRange: { min: 0, max: 100 },
  scoreMean: 50,
  scoreSd: 15,
  significantDifferenceThreshold: 15,
};

const GAME_ORDER = [
  'toneSequence', 'mentalMath', 'symbolMatch', 'codeFill',
  'wordBridge', 'patternComplete', 'focusFlow',
];

// ========================================
// Handler
// ========================================

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ja';

  // Word Bridge questions are locale-dependent
  const wordBridgeConfig = locale === 'ja'
    ? WORD_BRIDGE_CONFIG_JA
    : WORD_BRIDGE_CONFIG_EN;

  const config = {
    version: CONFIG_VERSION,
    locale,
    games: {
      toneSequence: TONE_SEQUENCE_CONFIG,
      mentalMath: MENTAL_MATH_CONFIG,
      symbolMatch: SYMBOL_MATCH_CONFIG,
      codeFill: CODE_FILL_CONFIG,
      wordBridge: wordBridgeConfig,
      patternComplete: PATTERN_COMPLETE_CONFIG,
      focusFlow: FOCUS_FLOW_CONFIG,
    },
    scoring: SCORING_CONFIG,
    gameOrder: GAME_ORDER,
  };

  return NextResponse.json(
    { success: true, data: config },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}
