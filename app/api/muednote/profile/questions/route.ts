/**
 * Profile Questions API
 *
 * GET /api/muednote/profile/questions — Get structured questions for profile building
 * POST /api/muednote/profile/questions — Submit answers to structured questions
 *
 * Returns questions Hoo wants to ask based on what's missing from the user's profile.
 * Replaces free-form chat for profile data collection.
 */

import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/api-response';
import { userProfileRepository } from '@/lib/repositories/user-profiles.repository';
import { profileGeneratorService } from '@/lib/services/profile-generator.service';
import { DEFAULT_PROFILE_DATA, type UserProfileData } from '@/db/schema/user-profiles';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { boundedArray } from "@/lib/validation/bounded-array";

// ========================================
// Question Templates
// ========================================

interface ProfileQuestion {
  id: string;
  category: 'musical' | 'creative' | 'personal';
  field: string;
  question: { en: string; ja: string };
  type: 'text' | 'multi_select' | 'single_select';
  options?: { value: string; label: { en: string; ja: string } }[];
  priority: number; // Lower = ask first
}

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    id: 'genres',
    category: 'musical',
    field: 'musical.genres',
    question: {
      en: 'What genres do you mainly create?',
      ja: '主にどんなジャンルの音楽を作っていますか？',
    },
    type: 'multi_select',
    options: [
      { value: 'pop', label: { en: 'Pop', ja: 'ポップ' } },
      { value: 'rock', label: { en: 'Rock', ja: 'ロック' } },
      { value: 'hip-hop', label: { en: 'Hip Hop', ja: 'ヒップホップ' } },
      { value: 'electronic', label: { en: 'Electronic', ja: 'エレクトロニック' } },
      { value: 'r&b', label: { en: 'R&B', ja: 'R&B' } },
      { value: 'jazz', label: { en: 'Jazz', ja: 'ジャズ' } },
      { value: 'classical', label: { en: 'Classical', ja: 'クラシック' } },
      { value: 'lo-fi', label: { en: 'Lo-Fi', ja: 'Lo-Fi' } },
      { value: 'ambient', label: { en: 'Ambient', ja: 'アンビエント' } },
      { value: 'metal', label: { en: 'Metal', ja: 'メタル' } },
      { value: 'folk', label: { en: 'Folk', ja: 'フォーク' } },
      { value: 'indie', label: { en: 'Indie', ja: 'インディー' } },
    ],
    priority: 1,
  },
  {
    id: 'instruments',
    category: 'musical',
    field: 'musical.instruments',
    question: {
      en: 'What instruments or tools do you use?',
      ja: 'どんな楽器やツールを使っていますか？',
    },
    type: 'multi_select',
    options: [
      { value: 'guitar', label: { en: 'Guitar', ja: 'ギター' } },
      { value: 'bass', label: { en: 'Bass', ja: 'ベース' } },
      { value: 'keys', label: { en: 'Keys/Piano', ja: 'キーボード/ピアノ' } },
      { value: 'drums', label: { en: 'Drums', ja: 'ドラム' } },
      { value: 'vocals', label: { en: 'Vocals', ja: 'ボーカル' } },
      { value: 'synth', label: { en: 'Synthesizer', ja: 'シンセサイザー' } },
      { value: 'sampler', label: { en: 'Sampler/MPC', ja: 'サンプラー/MPC' } },
      { value: 'daw-only', label: { en: 'DAW Only (in the box)', ja: 'DAWのみ' } },
      { value: 'strings', label: { en: 'Strings', ja: '弦楽器' } },
      { value: 'brass', label: { en: 'Brass/Winds', ja: '管楽器' } },
    ],
    priority: 2,
  },
  {
    id: 'influences',
    category: 'musical',
    field: 'musical.influences',
    question: {
      en: 'Who are your musical influences? (artists, producers, composers)',
      ja: '影響を受けたアーティスト・プロデューサー・作曲家は？',
    },
    type: 'text',
    priority: 3,
  },
  {
    id: 'production_style',
    category: 'musical',
    field: 'musical.productionStyle',
    question: {
      en: 'How would you describe your production style in a few words?',
      ja: 'あなたの制作スタイルを一言で表すと？',
    },
    type: 'text',
    priority: 4,
  },
  {
    id: 'focus_areas',
    category: 'creative',
    field: 'creative.focusAreas',
    question: {
      en: 'What aspects of music do you focus on most?',
      ja: '音楽制作で最も意識していることは？',
    },
    type: 'multi_select',
    options: [
      { value: 'harmony', label: { en: 'Harmony/Chords', ja: 'ハーモニー/コード' } },
      { value: 'melody', label: { en: 'Melody', ja: 'メロディ' } },
      { value: 'rhythm', label: { en: 'Rhythm/Groove', ja: 'リズム/グルーブ' } },
      { value: 'mix', label: { en: 'Mixing/Sound Design', ja: 'ミキシング/音作り' } },
      { value: 'emotion', label: { en: 'Emotion/Expression', ja: '感情/表現' } },
      { value: 'structure', label: { en: 'Song Structure', ja: '楽曲構成' } },
    ],
    priority: 5,
  },
  {
    id: 'growth_areas',
    category: 'creative',
    field: 'creative.growthAreas',
    question: {
      en: 'What would you like to improve?',
      ja: '上達したいことは？',
    },
    type: 'text',
    priority: 6,
  },
  {
    id: 'bio',
    category: 'personal',
    field: 'bio',
    question: {
      en: 'Describe yourself as a music creator in one sentence.',
      ja: '音楽クリエイターとしての自分を一文で。',
    },
    type: 'text',
    priority: 7,
  },
];

// ========================================
// GET — Return unanswered questions
// ========================================

export const GET = withAuthResolved(async ({ internalUserId }) => {
  try {
    const profile = await userProfileRepository.findByUserId(internalUserId);
    const profileData = profile?.profileData ?? DEFAULT_PROFILE_DATA;

    // Filter to questions where the profile field is empty/null
    const unanswered = PROFILE_QUESTIONS.filter((q) => {
      const value = getNestedValue(profileData, q.field);
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    }).sort((a, b) => a.priority - b.priority);

    return apiSuccess({
      questions: unanswered,
      totalQuestions: PROFILE_QUESTIONS.length,
      answeredCount: PROFILE_QUESTIONS.length - unanswered.length,
      isComplete: unanswered.length === 0,
    });
  } catch (error) {
    logger.error('[GET /api/muednote/profile/questions] Error', { error });
    return apiServerError(error instanceof Error ? error : new Error('Failed to get questions'));
  }
});

// ========================================
// POST — Submit answers
// ========================================

// ★Bounds: PROFILE_QUESTIONS has 8 entries, so 50 answers and 50 choices per answer are well above
// anything the form can send. boundedArray checks the length before parsing elements.
const answerSchema = z.object({
  answers: boundedArray(z.object({
    questionId: z.string(),
    value: z.union([z.string(), boundedArray(z.string(), { max: 50 })]),
  }), { max: 50 }),
});

export const POST = withAuthResolved(async ({ internalUserId, clerkUserId, request }) => {
  try {
    const body = await request.json();
    const validation = answerSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError('Invalid answers', validation.error.errors);
    }

    // Build profile patch from answers
    const patch: Partial<UserProfileData> = {};

    for (const answer of validation.data.answers) {
      const question = PROFILE_QUESTIONS.find((q) => q.id === answer.questionId);
      if (!question) continue;

      setNestedValue(patch, question.field, answer.value);
    }

    // Get or create profile, then apply patch
    const profile = await userProfileRepository.findByUserId(internalUserId);

    if (!profile) {
      // Generate base profile first
      await profileGeneratorService.generateFullProfile(clerkUserId, internalUserId);
    }

    const updated = await userProfileRepository.applyUserCorrections(internalUserId, patch);

    logger.info('[POST /api/muednote/profile/questions] Answers applied', {
      userId: internalUserId,
      answerCount: validation.data.answers.length,
      fields: validation.data.answers.map((a) => a.questionId),
    });

    return apiSuccess({
      profile: updated?.profileData ?? null,
      appliedCount: validation.data.answers.length,
    });
  } catch (error) {
    logger.error('[POST /api/muednote/profile/questions] Error', { error });
    return apiServerError(error instanceof Error ? error : new Error('Failed to save answers'));
  }
});

// ========================================
// Helpers
// ========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedValue(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}
