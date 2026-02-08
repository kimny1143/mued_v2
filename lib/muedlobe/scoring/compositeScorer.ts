/**
 * Composite Scorer - 7 games -> 5 cognitive variable raw scores
 *
 * Combines individual game results into composite raw scores
 * for each cognitive variable: WM, PS, VC, PR, ATT
 */

import type { GameResult } from '@/types/muedlobe';
import type {
  WmRawData,
  PsRawData,
  VcRawData,
  PrRawData,
  AttRawData,
} from '@/db/schema/cognitive-profiles';

// ========================================
// Types
// ========================================

export interface CompositeScores {
  wm: number;
  ps: number;
  vc: number;
  pr: number;
  att: number;
}

export interface CompositeRawData {
  wm: WmRawData;
  ps: PsRawData;
  vc: VcRawData;
  pr: PrRawData;
  att: AttRawData;
}

export interface CompositeResult {
  scores: CompositeScores;
  rawData: CompositeRawData;
}

// ========================================
// Helpers
// ========================================

function getGame(results: GameResult[], gameType: string): GameResult {
  const game = results.find((r) => r.gameType === gameType);
  if (!game) {
    throw new Error(`Missing game result: ${gameType}`);
  }
  return game;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

// ========================================
// Main
// ========================================

/**
 * Calculate composite raw scores from 7 game results.
 *
 * WM = toneSequence.rawScore * 0.6 + mentalMath.totalScore * 0.4
 * PS = symbolMatch.rawScore * 0.5 + codeFill.rawScore * 0.5
 * VC = wordBridge.totalScore (single game)
 * PR = patternComplete.totalScore (single game)
 * ATT = focusFlow.rawScore (d'-based, single game)
 */
export function calculateCompositeScores(
  gameResults: GameResult[]
): CompositeResult {
  const toneSeq = getGame(gameResults, 'tone-sequence');
  const mentalMath = getGame(gameResults, 'mental-math');
  const symbolMatch = getGame(gameResults, 'symbol-match');
  const codeFill = getGame(gameResults, 'code-fill');
  const wordBridge = getGame(gameResults, 'word-bridge');
  const patternComplete = getGame(gameResults, 'pattern-complete');
  const focusFlow = getGame(gameResults, 'focus-flow');

  // Composite raw scores
  const wmRaw =
    toneSeq.rawScore * 0.6 +
    num(mentalMath.rawData.totalScore) * 0.4;

  const psRaw =
    symbolMatch.rawScore * 0.5 +
    codeFill.rawScore * 0.5;

  const vcRaw = num(wordBridge.rawData.totalScore, wordBridge.rawScore);
  const prRaw = num(patternComplete.rawData.totalScore, patternComplete.rawScore);
  const attRaw = focusFlow.rawScore;

  // Structured raw data for DB storage
  const rawData: CompositeRawData = {
    wm: {
      forwardSpan: num(toneSeq.rawData.forwardSpan),
      backwardSpan: num(toneSeq.rawData.backwardSpan),
      sequencingSpan: num(toneSeq.rawData.sequencingSpan),
      mentalMathScore: num(mentalMath.rawData.totalScore),
    },
    ps: {
      symbolMatchScore: symbolMatch.rawScore,
      codeFillScore: codeFill.rawScore,
    },
    vc: {
      wordBridgeScore: vcRaw,
      abstractionLevels: {},
    },
    pr: {
      patternCompleteScore: prRaw,
      difficultyBreakdown: (patternComplete.rawData.difficultyBreakdown as Record<string, number>) ?? {},
    },
    att: {
      dPrime: num(focusFlow.rawData.dPrime),
      rtCv: num(focusFlow.rawData.rtCv),
      hitRate: num(focusFlow.rawData.hitRate),
      falseAlarmRate: num(focusFlow.rawData.falseAlarmRate),
    },
  };

  return {
    scores: {
      wm: wmRaw,
      ps: psRaw,
      vc: vcRaw,
      pr: prRaw,
      att: attRaw,
    },
    rawData,
  };
}
