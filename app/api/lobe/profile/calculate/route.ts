/**
 * POST /api/lobe/profile/calculate
 * Calculate and save cognitive profile from 7 game results
 */

import { z } from 'zod';
import { boundedArray } from "@/lib/validation/bounded-array";
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import {
  calculateAndSaveProfile,
  validateGameResults,
} from '@/lib/muedlobe/scoring/profileService';
import { GAME_ORDER } from '@/lib/muedlobe/constants';
import type { GameResult, GameType } from '@/types/muedlobe';

const gameResultSchema = z.object({
  gameType: z.enum(GAME_ORDER as [string, ...string[]]) as z.ZodType<GameType>,
  rawScore: z.number(),
  rawData: z.record(z.unknown()),
  completedAt: z.string(),
});

// ★At most 50: GAME_ORDER has 7 games, one result each.
const requestSchema = z.object({
  gameResults: boundedArray(gameResultSchema, { max: 50 }),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.message);
    }

    const { gameResults } = parsed.data;

    // Validate all 7 games are present
    const validation = validateGameResults(gameResults as GameResult[]);
    if (!validation.valid) {
      return apiValidationError(
        `Missing game results: ${validation.missing.join(', ')}`
      );
    }

    const profile = await calculateAndSaveProfile(
      userId,
      gameResults as GameResult[]
    );

    return apiSuccess(profile, { status: 201 });
  } catch (error) {
    return apiServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
