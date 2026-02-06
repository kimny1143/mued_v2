/**
 * MUEDlobe - Constants
 */

import type { GameType } from '@/types/muedlobe';

// ========================================
// Score System
// ========================================

export const SCORE_RANGE = { min: 0, max: 100 };
export const SCORE_MEAN = 50;
export const SCORE_SD = 15;
export const SIGNIFICANT_DIFFERENCE_THRESHOLD = 15;

// ========================================
// Game Definitions
// ========================================

export const GAME_ORDER: GameType[] = [
  'tone-sequence',
  'mental-math',
  'symbol-match',
  'code-fill',
  'word-bridge',
  'pattern-complete',
  'focus-flow',
];

export const GAME_META: Record<GameType, {
  id: string;
  name: string;
  nameJa: string;
  variable: string;
  duration: string;
}> = {
  'tone-sequence': {
    id: 'WM-1',
    name: 'Tone Sequence',
    nameJa: '音系列記憶',
    variable: 'WM',
    duration: '3-4 min',
  },
  'mental-math': {
    id: 'WM-2',
    name: 'Mental Math',
    nameJa: 'メンタルマス',
    variable: 'WM',
    duration: '2-3 min',
  },
  'symbol-match': {
    id: 'PS-1',
    name: 'Symbol Match',
    nameJa: 'シンボルマッチ',
    variable: 'PS',
    duration: '2 min',
  },
  'code-fill': {
    id: 'PS-2',
    name: 'Code Fill',
    nameJa: 'コードフィル',
    variable: 'PS',
    duration: '2 min',
  },
  'word-bridge': {
    id: 'VC-1',
    name: 'Word Bridge',
    nameJa: 'ワードブリッジ',
    variable: 'VC',
    duration: '3 min',
  },
  'pattern-complete': {
    id: 'PR-1',
    name: 'Pattern Complete',
    nameJa: 'パターンコンプリート',
    variable: 'PR',
    duration: '3 min',
  },
  'focus-flow': {
    id: 'ATT-1',
    name: 'Focus Flow',
    nameJa: 'フォーカスフロー',
    variable: 'ATT',
    duration: '3-4 min',
  },
};

// ========================================
// Symbol Match (PS-1) Constants
// ========================================

/** 20 abstract SVG symbols for Symbol Match */
export const SYMBOLS = [
  '◇', '☆', '△', '○', '✕',
  '□', '⬡', '◎', '⬢', '▽',
  '◈', '⊕', '⊗', '⊞', '⊠',
  '◆', '★', '▲', '●', '■',
];

export const SYMBOL_MATCH_CONFIG = {
  targetCount: 2,
  comparisonCount: 5,
  targetPresenceRate: 0.5,
  timeLimitMs: 120_000, // 120 seconds
};

// ========================================
// Normalization Norms (Initial estimates, N=1)
// ========================================

export const INITIAL_NORMS = {
  wm: { mean: 12, sd: 4 },
  ps: { mean: 30, sd: 10 },
  vc: { mean: 15, sd: 5 },
  pr: { mean: 10, sd: 4 },
  att: { mean: 2.5, sd: 0.8 },
};
