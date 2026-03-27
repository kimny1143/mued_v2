/**
 * User Profile API
 *
 * GET  /api/muednote/profile — Get or generate user profile
 * PATCH /api/muednote/profile — Apply user corrections to profile
 */

import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/api-response';
import { userProfileRepository } from '@/lib/repositories/user-profiles.repository';
import { profileGeneratorService } from '@/lib/services/profile-generator.service';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// ========================================
// GET — Retrieve profile (generate if missing)
// ========================================

export const GET = withAuthResolved(async ({ internalUserId, clerkUserId }) => {
  try {
    let profile = await userProfileRepository.findByUserId(internalUserId);

    if (!profile) {
      // Auto-generate on first access
      logger.info('[GET /api/muednote/profile] No profile found, generating', { clerkUserId });
      const profileData = await profileGeneratorService.generateFullProfile(clerkUserId, internalUserId);

      profile = await userProfileRepository.findByUserId(internalUserId);

      return apiSuccess({
        profile: profileData,
        isNew: true,
        updateCount: 1,
        updatedAt: profile?.updatedAt?.toISOString() ?? new Date().toISOString(),
      });
    }

    return apiSuccess({
      profile: profile.profileData,
      isNew: false,
      updateCount: profile.updateCount,
      updatedAt: profile.updatedAt?.toISOString() ?? null,
      userCorrections: profile.userCorrections,
    });
  } catch (error) {
    logger.error('[GET /api/muednote/profile] Error', { error });
    return apiServerError(error instanceof Error ? error : new Error('Failed to get profile'));
  }
});

// ========================================
// PATCH — User corrections
// ========================================

const patchSchema = z.object({
  bio: z.string().max(200).nullable().optional(),
  musical: z.object({
    genres: z.array(z.string()).optional(),
    instruments: z.array(z.string()).optional(),
    influences: z.array(z.string()).optional(),
    productionStyle: z.string().max(200).nullable().optional(),
    mixingPreferences: z.string().max(200).nullable().optional(),
  }).optional(),
  creative: z.object({
    focusAreas: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
    growthAreas: z.array(z.string()).optional(),
    workPatterns: z.string().max(200).nullable().optional(),
  }).optional(),
});

export const PATCH = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    const body = await request.json();
    const validation = patchSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError('Invalid profile data', validation.error.errors);
    }

    const updated = await userProfileRepository.applyUserCorrections(
      internalUserId,
      validation.data as Partial<import('@/db/schema/user-profiles').UserProfileData>
    );

    if (!updated) {
      return apiServerError(new Error('Profile not found. GET first to create.'));
    }

    logger.info('[PATCH /api/muednote/profile] User corrections applied', {
      userId: internalUserId,
      correctedFields: Object.keys(validation.data),
    });

    return apiSuccess({
      profile: updated.profileData,
      updateCount: updated.updateCount,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error('[PATCH /api/muednote/profile] Error', { error });
    return apiServerError(error instanceof Error ? error : new Error('Failed to update profile'));
  }
});
