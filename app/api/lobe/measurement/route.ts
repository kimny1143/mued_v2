/**
 * POST /api/lobe/measurement
 * Save a game measurement result.
 * If all 7 games are now complete, auto-calculate cognitive profile.
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { GAME_ORDER } from '@/lib/muedlobe/constants';
import { calculateAndSaveProfile } from '@/lib/muedlobe/scoring/profileService';
import type { GameResult } from '@/types/muedlobe';

const measurementSchema = z.object({
  gameType: z.string(),
  rawData: z.record(z.unknown()),
  calculatedScore: z.record(z.unknown()).optional(),
});

export const POST = withAuthResolved(async ({ clerkUserId, request }) => {
  try {
    const body = await request.json();
    const parsed = measurementSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.message);
    }

    const { gameType, rawData, calculatedScore } = parsed.data;

    const record = await cognitiveProfileRepository.addMeasurement({
      userId: clerkUserId,
      gameType,
      rawData,
      calculatedScore,
    });

    // Check if all 7 games are now complete
    let profileCalculated = false;
    const allMeasurements = await cognitiveProfileRepository.findMeasurementsByUserId(clerkUserId);

    const completedGameTypes = new Set(allMeasurements.map((m) => m.gameType));
    const allGamesComplete = GAME_ORDER.every((g) => completedGameTypes.has(g));

    if (allGamesComplete) {
      try {
        // Build GameResult[] from latest measurement per game type
        const latestByGame = new Map<string, typeof allMeasurements[number]>();
        for (const m of allMeasurements) {
          const existing = latestByGame.get(m.gameType);
          if (!existing || (m.measuredAt && existing.measuredAt && m.measuredAt > existing.measuredAt)) {
            latestByGame.set(m.gameType, m);
          }
        }

        const gameResults: GameResult[] = GAME_ORDER.map((gt) => {
          const m = latestByGame.get(gt)!;
          const score = m.calculatedScore as Record<string, unknown> | null;
          return {
            gameType: gt,
            rawScore: Number((score?.rawScore ?? score?.totalScore ?? 0)),
            rawData: m.rawData as Record<string, unknown>,
            completedAt: m.measuredAt?.toISOString() ?? new Date().toISOString(),
          };
        });

        await calculateAndSaveProfile(clerkUserId, gameResults);
        profileCalculated = true;
      } catch (e) {
        // Profile calculation failure should not fail the measurement save
        console.error('[measurement] Profile calculation failed:', e);
      }
    }

    return apiSuccess({ ...record, profileCalculated }, { status: 201 });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Unknown error');
  }
});
