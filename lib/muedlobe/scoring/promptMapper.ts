/**
 * Prompt Mapper - Map scores + patterns to Hoo prompt parameters
 *
 * Converts normalized cognitive scores and detected patterns
 * into actionable prompt parameters for the Hoo AI tutor.
 */

import type { Scores, PromptParams, SignificantPattern } from '@/types/muedlobe';

// ========================================
// Types
// ========================================

export interface PromptMapping {
  promptParams: PromptParams;
  specialInstructions: string[];
}

// ========================================
// Score -> PromptParams Mapping
// ========================================

function mapTier<T>(score: number, low: T, mid: T, high: T): T {
  if (score <= 35) return low;
  if (score <= 65) return mid;
  return high;
}

function mapScoresToParams(scores: Scores): PromptParams {
  // WM -> informationDensity, chunkSize
  const informationDensity = mapTier(scores.wm, 'low', 'medium', 'high');
  const chunkSize = mapTier(scores.wm, 'small', 'medium', 'large');

  // PS -> pacing, confirmationFrequency
  const pacing = mapTier(scores.ps, 'slow', 'moderate', 'fast');
  const confirmationFrequency = mapTier(scores.ps, 'frequent', 'occasional', 'minimal');

  // (VC - PR) -> modality
  const vcPrDiff = scores.vc - scores.pr;
  const modality: PromptParams['modality'] =
    vcPrDiff < -30 ? 'visual' :
    vcPrDiff > 30 ? 'verbal' :
    'balanced';

  // PR -> abstractionLevel
  const abstractionLevel = mapTier(scores.pr, 'concrete', 'mixed', 'abstract');

  // ATT -> responseLength
  const responseLength = mapTier(scores.att, 'short', 'moderate', 'flexible');

  return {
    informationDensity,
    chunkSize,
    pacing,
    confirmationFrequency,
    modality,
    abstractionLevel,
    responseLength,
  };
}

// ========================================
// Pattern -> Special Instructions
// ========================================

const PATTERN_INSTRUCTIONS: Record<SignificantPattern, string> = {
  // Pairwise patterns
  high_wm_low_ps:
    'User can hold complex information but processes slowly. Provide rich content with generous time for responses.',
  low_wm_high_ps:
    'User processes quickly but has limited working memory. Break information into small, fast-paced chunks.',
  high_wm_low_vc:
    'Strong memory but weaker verbal skills. Use diagrams, notation, and visual aids over lengthy text explanations.',
  low_wm_high_vc:
    'Strong verbal skills but limited memory. Use clear language with frequent recaps.',
  high_wm_low_pr:
    'Strong memory but weaker pattern recognition. Provide explicit examples before introducing abstract concepts.',
  low_wm_high_pr:
    'Strong pattern recognition but limited memory. Use visual patterns and reduce memorization demands.',
  high_ps_low_vc:
    'Fast processing but weaker verbal skills. Use short, direct language with visual support.',
  low_ps_high_vc:
    'Strong verbal skills but slower processing. Allow ample time; use clear explanations.',
  high_ps_low_pr:
    'Fast processing but weaker abstraction. Keep tasks concrete and step-by-step.',
  low_ps_high_pr:
    'Strong abstraction but slower processing. Allow time to think; present concepts abstractly.',
  high_vc_low_pr:
    'Strong verbal skills but weaker visual/pattern reasoning. Prefer text-based explanations over diagrams.',
  low_vc_high_pr:
    'Strong pattern reasoning but weaker verbal skills. Use diagrams, charts, and visual representations.',

  // Composite types
  architect_type:
    'Architect profile: strong memory and reasoning, deliberate pace. Present complex systems and let them explore structure.',
  performer_type:
    'Performer profile: fast reactions, in-the-moment learner. Use hands-on exercises with immediate feedback.',
  theorist_type:
    'Theorist profile: strong memory and verbal skills. Explain "why" before "how"; provide theoretical frameworks.',
  visualizer_type:
    'Visualizer profile: strong pattern recognition. Lead with visual examples, diagrams, and spatial representations.',
  balanced_type:
    'Balanced profile: no extreme strengths or weaknesses. Use a varied, multi-modal approach.',

  // ATT modifiers
  low_attention_modifier:
    'Low sustained attention. Keep interactions short, use clear checkpoints, and minimize distractions.',
  high_attention_modifier:
    'Strong sustained attention. Can handle longer sessions and deeper exploration without frequent breaks.',
};

function mapPatternsToInstructions(patterns: SignificantPattern[]): string[] {
  return patterns
    .map((p) => PATTERN_INSTRUCTIONS[p])
    .filter(Boolean);
}

// ========================================
// Main
// ========================================

/**
 * Map normalized scores and detected patterns to prompt parameters
 * and special instructions for Hoo.
 */
export function mapToPromptParams(
  scores: Scores,
  patterns: SignificantPattern[]
): PromptMapping {
  return {
    promptParams: mapScoresToParams(scores),
    specialInstructions: mapPatternsToInstructions(patterns),
  };
}
