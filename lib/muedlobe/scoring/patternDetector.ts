/**
 * Pattern Detector - Detect cognitive patterns from normalized scores
 *
 * Level 1: Pairwise differences (up to 12 patterns)
 * Level 2: Composite types (5 patterns)
 * ATT modifiers (2 patterns)
 */

import type { Scores, SignificantPattern } from '@/types/muedlobe';
import { SIGNIFICANT_DIFFERENCE_THRESHOLD } from '../constants';

// ========================================
// Types
// ========================================

type ScoreKey = Exclude<keyof Scores, 'att'>;

// ========================================
// Level 1: Pairwise Differences
// ========================================

const PAIRWISE_KEYS: [ScoreKey, ScoreKey][] = [
  ['wm', 'ps'],
  ['wm', 'vc'],
  ['wm', 'pr'],
  ['ps', 'vc'],
  ['ps', 'pr'],
  ['vc', 'pr'],
];

function detectPairwisePatterns(scores: Scores): SignificantPattern[] {
  const patterns: SignificantPattern[] = [];

  for (const [a, b] of PAIRWISE_KEYS) {
    const diff = scores[a] - scores[b];

    if (diff >= SIGNIFICANT_DIFFERENCE_THRESHOLD) {
      patterns.push(`high_${a}_low_${b}` as SignificantPattern);
    } else if (diff <= -SIGNIFICANT_DIFFERENCE_THRESHOLD) {
      patterns.push(`low_${a}_high_${b}` as SignificantPattern);
    }
  }

  return patterns;
}

// ========================================
// Level 2: Composite Types
// ========================================

function detectCompositeTypes(scores: Scores): SignificantPattern[] {
  const patterns: SignificantPattern[] = [];

  // Architect: high WM + low PS + high PR
  if (scores.wm >= 65 && scores.ps <= 50 && scores.pr >= 65) {
    patterns.push('architect_type');
  }

  // Performer: low WM + high PS
  if (scores.wm <= 40 && scores.ps >= 65) {
    patterns.push('performer_type');
  }

  // Theorist: high WM + high VC + low PR
  if (scores.wm >= 65 && scores.vc >= 65 && scores.pr <= 50) {
    patterns.push('theorist_type');
  }

  // Visualizer: high PR + low VC
  if (scores.pr >= 65 && scores.vc <= 50) {
    patterns.push('visualizer_type');
  }

  // Balanced: core 4 scores within 15 of each other (ATT excluded per spec)
  const coreScores = [scores.wm, scores.ps, scores.vc, scores.pr];
  const range = Math.max(...coreScores) - Math.min(...coreScores);
  if (range < SIGNIFICANT_DIFFERENCE_THRESHOLD) {
    patterns.push('balanced_type');
  }

  return patterns;
}

// ========================================
// ATT Modifiers
// ========================================

function detectAttModifiers(scores: Scores): SignificantPattern[] {
  const patterns: SignificantPattern[] = [];

  if (scores.att <= 35) {
    patterns.push('low_attention_modifier');
  }
  if (scores.att >= 65) {
    patterns.push('high_attention_modifier');
  }

  return patterns;
}

// ========================================
// Main
// ========================================

/**
 * Detect all significant patterns from normalized scores.
 * Returns an array of detected patterns (0-19 possible).
 */
export function detectPatterns(scores: Scores): SignificantPattern[] {
  return [
    ...detectPairwisePatterns(scores),
    ...detectCompositeTypes(scores),
    ...detectAttModifiers(scores),
  ];
}
