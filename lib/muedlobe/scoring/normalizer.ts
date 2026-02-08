/**
 * Normalizer - Z-score normalization to 0-100 scale
 *
 * Converts composite raw scores to normalized scores
 * using mean=50, SD=15 on a 0-100 scale.
 */

import type { Scores } from '@/types/muedlobe';
import type { CompositeScores } from './compositeScorer';
import { INITIAL_NORMS, SCORE_RANGE, SCORE_MEAN, SCORE_SD } from '../constants';

// ========================================
// Types
// ========================================

type CognitiveVariable = keyof Scores;

interface NormParams {
  mean: number;
  sd: number;
}

// ========================================
// Core
// ========================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert a single raw score to normalized 0-100 scale.
 *
 * Formula: normalized = clamp(50 + ((raw - mean) / sd) * 15, 0, 100)
 */
export function normalizeScore(raw: number, norm: NormParams): number {
  if (norm.sd === 0) return SCORE_MEAN;

  const zScore = (raw - norm.mean) / norm.sd;
  const normalized = SCORE_MEAN + zScore * SCORE_SD;

  return Math.round(clamp(normalized, SCORE_RANGE.min, SCORE_RANGE.max));
}

/**
 * Normalize all 5 composite raw scores to 0-100 scale.
 */
export function normalizeAllScores(compositeScores: CompositeScores): Scores {
  const variables: CognitiveVariable[] = ['wm', 'ps', 'vc', 'pr', 'att'];

  const result = {} as Scores;
  for (const v of variables) {
    result[v] = normalizeScore(compositeScores[v], INITIAL_NORMS[v]);
  }

  return result;
}
