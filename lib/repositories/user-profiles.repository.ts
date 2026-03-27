/**
 * UserProfileRepository — Data access for Hoo's user profiles
 */

import { db } from '@/db/edge';
import { userProfiles, type UserProfileData, type NewUserProfile } from '@/db/schema/user-profiles';
import { eq } from 'drizzle-orm';

export class UserProfileRepository {
  async findByUserId(userId: string) {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return profile ?? null;
  }

  async upsert(userId: string, data: UserProfileData, model?: string) {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({
          profileData: data,
          updateCount: (existing.updateCount ?? 0) + 1,
          generationModel: model ?? existing.generationModel,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(userProfiles)
      .values({
        userId,
        profileData: data,
        generatedBy: 'system',
        generationModel: model,
      } satisfies NewUserProfile)
      .returning();

    return created;
  }

  async applyUserCorrections(userId: string, corrections: Partial<UserProfileData>) {
    const existing = await this.findByUserId(userId);
    if (!existing) return null;

    // Merge corrections into profile data
    const merged = deepMergeProfile(existing.profileData, corrections);

    const [updated] = await db
      .update(userProfiles)
      .set({
        profileData: merged,
        userCorrections: {
          ...(existing.userCorrections as Partial<UserProfileData> ?? {}),
          ...corrections,
        },
        generatedBy: 'user_edit',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return updated;
  }
}

/** Deep merge profile, preferring new values for non-null fields */
function deepMergeProfile(
  base: UserProfileData,
  patch: Partial<UserProfileData>
): UserProfileData {
  return {
    musical: {
      genres: patch.musical?.genres ?? base.musical.genres,
      instruments: patch.musical?.instruments ?? base.musical.instruments,
      influences: patch.musical?.influences ?? base.musical.influences,
      productionStyle: patch.musical?.productionStyle ?? base.musical.productionStyle,
      mixingPreferences: patch.musical?.mixingPreferences ?? base.musical.mixingPreferences,
    },
    creative: {
      focusAreas: patch.creative?.focusAreas ?? base.creative.focusAreas,
      strengths: patch.creative?.strengths ?? base.creative.strengths,
      growthAreas: patch.creative?.growthAreas ?? base.creative.growthAreas,
      workPatterns: patch.creative?.workPatterns ?? base.creative.workPatterns,
    },
    cognitive: {
      summary: patch.cognitive?.summary ?? base.cognitive.summary,
      informationDensity: patch.cognitive?.informationDensity ?? base.cognitive.informationDensity,
      pacing: patch.cognitive?.pacing ?? base.cognitive.pacing,
      abstractionLevel: patch.cognitive?.abstractionLevel ?? base.cognitive.abstractionLevel,
    },
    bio: patch.bio ?? base.bio,
    lastExtractedFromConversation: patch.lastExtractedFromConversation ?? base.lastExtractedFromConversation,
    lastExtractedFromDawLog: patch.lastExtractedFromDawLog ?? base.lastExtractedFromDawLog,
  };
}

export const userProfileRepository = new UserProfileRepository();
