/**
 * GET  /api/lobe/measurement — Get user's measurement progress (which games completed)
 * POST /api/lobe/measurement — Save a game measurement result
 *
 * If all 7 games are complete on POST, auto-calculate cognitive profile.
 */

import { z } from 'zod';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { GAME_ORDER } from '@/lib/muedlobe/constants';
import { calculateAndSaveProfile } from '@/lib/muedlobe/scoring/profileService';
import type { GameResult } from '@/types/muedlobe';

// ========================================
// GET — Measurement progress
// ========================================

export const GET = withAuth(async ({ userId }) => {
  try {
    const measurements = await cognitiveProfileRepository.findMeasurementsByUserId(userId);
    const distinctGameTypes = await cognitiveProfileRepository.findDistinctGameTypesByUserId(userId);

    // Latest measurement per game type
    const latestByGame = new Map<string, typeof measurements[number]>();
    for (const m of measurements) {
      const existing = latestByGame.get(m.gameType);
      if (!existing || (m.measuredAt && existing.measuredAt && m.measuredAt > existing.measuredAt)) {
        latestByGame.set(m.gameType, m);
      }
    }

    const games = GAME_ORDER.map((gameType) => {
      const measurement = latestByGame.get(gameType);
      return {
        gameType,
        completed: distinctGameTypes.includes(gameType),
        latestResult: measurement
          ? {
              id: measurement.id,
              rawData: measurement.rawData,
              calculatedScore: measurement.calculatedScore,
              measuredAt: measurement.measuredAt?.toISOString() ?? null,
            }
          : null,
      };
    });

    return apiSuccess({
      games,
      completedCount: distinctGameTypes.length,
      totalCount: GAME_ORDER.length,
      allComplete: distinctGameTypes.length >= GAME_ORDER.length,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Unknown error');
  }
});

// ========================================
// POST — Save measurement
// ========================================

const measurementSchema = z.object({
  gameType: z.string(),
  rawData: z.record(z.unknown()),
  calculatedScore: z.record(z.unknown()).optional(),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = measurementSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.message);
    }

    const { gameType, rawData, calculatedScore } = parsed.data;

    const record = await cognitiveProfileRepository.addMeasurement({
      userId,
      gameType,
      rawData,
      calculatedScore,
    });

    // Lightweight check: do we have all 7 game types?
    let profileCalculated = false;
    const distinctGameTypes = await cognitiveProfileRepository.findDistinctGameTypesByUserId(userId);
    const allGamesComplete = GAME_ORDER.every((g) => distinctGameTypes.includes(g));

    if (allGamesComplete) {
      try {
        // Only fetch full measurements when we need to build GameResult[]
        const allMeasurements = await cognitiveProfileRepository.findMeasurementsByUserId(userId);

        // Build GameResult[] from latest measurement per game type.
        // Full-version results take priority over shortened versions
        // (onboarding/break mode) to avoid profile degradation.
        const latestByGame = new Map<string, typeof allMeasurements[number]>();
        for (const m of allMeasurements) {
          const rd = m.rawData as Record<string, unknown> | null;
          const isShortened = rd?.isOnboarding === true || rd?.isBreak === true;
          const existing = latestByGame.get(m.gameType);

          if (!existing) {
            latestByGame.set(m.gameType, m);
            continue;
          }

          const existingRd = existing.rawData as Record<string, unknown> | null;
          const existingIsShortened = existingRd?.isOnboarding === true || existingRd?.isBreak === true;

          if (existingIsShortened && !isShortened) {
            // Current is full version, existing is shortened → prefer full
            latestByGame.set(m.gameType, m);
          } else if (existingIsShortened === isShortened) {
            // Same type → prefer latest
            if (m.measuredAt && existing.measuredAt && m.measuredAt > existing.measuredAt) {
              latestByGame.set(m.gameType, m);
            }
          }
          // else: existing is full, current is shortened → keep existing
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

        await calculateAndSaveProfile(userId, gameResults);
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
