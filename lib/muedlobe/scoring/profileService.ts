/**
 * Profile Service - Orchestrator for cognitive profile calculation
 *
 * Combines compositeScorer -> normalizer -> patternDetector -> promptMapper
 * and saves the result to the database.
 */

import type { GameResult } from '@/types/muedlobe';
import type { CognitiveProfile } from '@/db/schema/cognitive-profiles';
import { GAME_ORDER } from '../constants';
import { calculateCompositeScores } from './compositeScorer';
import { normalizeAllScores } from './normalizer';
import { detectPatterns } from './patternDetector';
import { mapToPromptParams } from './promptMapper';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';

// ========================================
// Validation
// ========================================

/**
 * Validate that all 7 required games are present in the results.
 */
export function validateGameResults(
  gameResults: GameResult[]
): { valid: true } | { valid: false; missing: string[] } {
  const present = new Set(gameResults.map((r) => r.gameType));
  const missing = GAME_ORDER.filter((g) => !present.has(g));

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

// ========================================
// Main
// ========================================

/**
 * Calculate cognitive profile from 7 game results and save to DB.
 *
 * Pipeline:
 * 1. compositeScorer: 7 games -> 5 variable raw scores + rawData
 * 2. normalizer: raw scores -> normalized 0-100 scores
 * 3. patternDetector: normalized scores -> SignificantPattern[]
 * 4. promptMapper: scores + patterns -> PromptParams + specialInstructions
 * 5. repository.upsert: save to DB
 */
export async function calculateAndSaveProfile(
  userId: string,
  gameResults: GameResult[]
): Promise<CognitiveProfile> {
  // 1. Composite scoring
  const { scores: compositeScores, rawData } =
    calculateCompositeScores(gameResults);

  // 2. Normalization
  const normalizedScores = normalizeAllScores(compositeScores);

  // 3. Pattern detection
  const patterns = detectPatterns(normalizedScores);

  // 4. Prompt parameter mapping
  const { promptParams, specialInstructions } = mapToPromptParams(
    normalizedScores,
    patterns
  );

  // 5. Compute VC-PR balance for DB
  const vcPrBalance = (
    (normalizedScores.vc - normalizedScores.pr) / 100
  ).toFixed(2);

  // 6. Save to DB
  const profile = await cognitiveProfileRepository.upsert(userId, {
    wmScore: normalizedScores.wm,
    wmRawData: rawData.wm,
    psScore: normalizedScores.ps,
    psRawData: rawData.ps,
    vcScore: normalizedScores.vc,
    vcRawData: rawData.vc,
    prScore: normalizedScores.pr,
    prRawData: rawData.pr,
    attScore: normalizedScores.att,
    attRawData: rawData.att,
    vcPrBalance,
    significantPatterns: patterns,
    promptParams,
  });

  // 7. Update Hoo configuration with special instructions
  if (specialInstructions.length > 0) {
    await cognitiveProfileRepository.upsertHooConfig(userId, {
      specialInstructions,
      variables: { ...normalizedScores },
    });
  }

  return profile;
}
