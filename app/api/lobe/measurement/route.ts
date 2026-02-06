/**
 * POST /api/lobe/measurement
 * Save a game measurement result
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';

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

    return apiSuccess(record, { status: 201 });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Unknown error');
  }
});
