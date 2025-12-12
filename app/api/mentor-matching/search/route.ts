/**
 * Mentor Search API
 * POST /api/mentor-matching/search
 *
 * Searches for mentors based on extracted user needs and returns ranked results
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/api-response';
import { createChatCompletion } from '@/lib/openai';
import { userRepository } from '@/lib/repositories/users.repository';
import { calculateMatchScore } from '@/lib/matching-algorithm';
import type {
  MentorSearchResponse,
  MentorSuggestion,
} from '@/types/chat-matching';
import type {
  StudentProfile,
  MentorProfile,
  LearningGoal,
  MusicGenre,
  SkillLevel,
} from '@/types/matching';
import { logger } from '@/lib/utils/logger';

// ========================================
// Request Validation Schema
// ========================================

const mentorSearchRequestSchema = z.object({
  sessionId: z.string().uuid(),
  criteria: z.object({
    instrument: z.string().optional(), // e.g., "ギター", "ピアノ", "Pro Tools"
    skillLevel: z.string().optional(),
    learningGoals: z.array(z.string()).optional(),
    genres: z.array(z.string()).optional(),
    priceRange: z
      .object({
        min: z.number(),
        max: z.number(),
      })
      .optional(),
    availability: z.array(z.string()).optional(),
  }),
  limit: z.number().min(1).max(10).optional().default(5),
});

// ========================================
// Helper Functions
// ========================================

/**
 * Convert search criteria to StudentProfile for matching algorithm
 */
function criteriaToStudentProfile(
  userId: string,
  criteria: z.infer<typeof mentorSearchRequestSchema>['criteria']
): StudentProfile {
  // Map learning goal strings to LearningGoal enum
  const goalMap: Record<string, LearningGoal> = {
    technique_improvement: 'technique_improvement',
    repertoire_expansion: 'repertoire_expansion',
    music_theory: 'music_theory',
    performance_preparation: 'performance_preparation',
    composition: 'composition',
    improvisation: 'improvisation',
    exam_preparation: 'exam_preparation',
  };

  const learningGoals: LearningGoal[] = (criteria.learningGoals || [])
    .map((goal) => goalMap[goal])
    .filter((g): g is LearningGoal => g !== undefined);

  // Map genre strings to MusicGenre enum
  const genreMap: Record<string, MusicGenre> = {
    classical: 'classical',
    jazz: 'jazz',
    pop: 'pop',
    rock: 'rock',
    folk: 'folk',
    contemporary: 'contemporary',
    world_music: 'world_music',
  };

  const preferredGenres: MusicGenre[] = (criteria.genres || [])
    .map((genre) => genreMap[genre])
    .filter((g): g is MusicGenre => g !== undefined);

  return {
    id: userId,
    skillLevel: (criteria.skillLevel as SkillLevel) || 'beginner',
    learningGoals,
    learningStyle: [], // Not captured in chat flow yet
    preferredGenres,
    availableTimeSlots: [], // TODO: Parse from availability
    priceRange: criteria.priceRange || { min: 0, max: 10000 },
  };
}

/**
 * Convert User entity to MentorProfile
 * Uses user.skills from database for instrument matching
 */
function userToMentorProfile(user: {
  id: string;
  name?: string | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  skills?: string[] | null;
}): MentorProfile {
  // Extract skills/instruments from user profile
  const skills: string[] = user.skills || [];

  // Map skills to genres for matching algorithm
  // This allows matching "ギター" in criteria to mentor skills
  const genres = skills.length > 0 ? skills : ['general'];

  return {
    id: user.id,
    name: user.name || 'Unknown Mentor',
    imageUrl: user.profileImageUrl ?? undefined,
    bio: user.bio ?? undefined,
    skillLevel: 'advanced',
    specializations: skills.includes('guitar') || skills.includes('ギター')
      ? ['technique_improvement', 'repertoire_expansion']
      : ['technique_improvement'],
    teachingStyles: ['visual', 'auditory'],
    genres: genres as MusicGenre[], // Use actual skills for matching
    availableTimeSlots: [],
    pricePerHour: 5000,
    rating: 4.5,
    totalReviews: 10,
    responseRate: 0.95,
    successfulMatches: 20,
  };
}

/**
 * Generate AI-powered reason summary for a match
 */
async function generateReasonSummary(
  studentProfile: StudentProfile,
  mentor: MentorProfile,
  matchScore: number,
  reasoning: string[]
): Promise<string> {
  const prompt = `以下のメンターが生徒にマッチした理由を1-2文で簡潔に説明してください。フレンドリーで励ます口調で。

生徒のニーズ:
- スキルレベル: ${studentProfile.skillLevel}
- 学習目標: ${studentProfile.learningGoals.join(', ') || '未指定'}
- 希望ジャンル: ${studentProfile.preferredGenres.join(', ') || '未指定'}
- 予算: ${studentProfile.priceRange.min}円〜${studentProfile.priceRange.max}円/時

メンター情報:
- 名前: ${mentor.name}
- スキルレベル: ${mentor.skillLevel}
- 専門分野: ${mentor.specializations.join(', ')}
- 得意ジャンル: ${mentor.genres.join(', ')}
- 料金: ${mentor.pricePerHour}円/時
- 評価: ${mentor.rating}点 (${mentor.totalReviews}件)

マッチング理由:
${reasoning.join('\n')}

マッチングスコア: ${matchScore}点/100点

説明（1-2文）:`;

  try {
    const { completion } = await createChatCompletion(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-5-mini',
        maxTokens: 150,
      }
    );

    return completion.choices[0]?.message.content || reasoning.join('、');
  } catch (error) {
    logger.warn('[generateReasonSummary] Failed to generate AI summary', {
      error,
    });
    // Fallback to simple joining
    return reasoning.slice(0, 2).join('、') + '。';
  }
}

// ========================================
// POST Handler
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = mentorSearchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(
        'Invalid request format',
        validationResult.error.errors
      );
    }

    const { sessionId, criteria, limit } = validationResult.data;

    logger.info('[POST /api/mentor-matching/search] Searching mentors', {
      userId: internalUserId,
      sessionId,
      criteria,
      limit,
    });

    // Fetch available mentors from database
    const mentorUsers = await userRepository.findMentors(50); // Get larger pool for better matching

    if (mentorUsers.length === 0) {
      logger.warn('[POST /api/mentor-matching/search] No mentors found');
      return apiSuccess<MentorSearchResponse>({
        mentors: [],
        totalFound: 0,
        searchQuality: 0,
      });
    }

    // Convert users to MentorProfile
    let mentors: MentorProfile[] = mentorUsers.map(userToMentorProfile);

    // Pre-filter by instrument if specified
    // This ensures "ギター" request only shows guitar mentors
    if (criteria.instrument) {
      const instrumentLower = criteria.instrument.toLowerCase();
      const instrumentAliases: Record<string, string[]> = {
        'ギター': ['ギター', 'guitar', 'エレキギター', 'アコースティックギター'],
        'ピアノ': ['ピアノ', 'piano', 'キーボード'],
        'ベース': ['ベース', 'bass'],
        'pro tools': ['pro tools', 'protools', 'dtm', 'daw', 'ミックス', 'マスタリング'],
      };

      // Find matching aliases
      let matchTerms = [instrumentLower];
      for (const aliases of Object.values(instrumentAliases)) {
        if (aliases.some(a => instrumentLower.includes(a.toLowerCase()))) {
          matchTerms = aliases.map(a => a.toLowerCase());
          break;
        }
      }

      mentors = mentors.filter((mentor) => {
        const mentorSkills = mentor.genres.map(g => g.toLowerCase());
        return matchTerms.some(term =>
          mentorSkills.some(skill => skill.includes(term) || term.includes(skill))
        );
      });

      logger.info('[POST /api/mentor-matching/search] Filtered by instrument', {
        instrument: criteria.instrument,
        matchTerms,
        mentorsAfterFilter: mentors.length,
      });
    }

    // Convert criteria to StudentProfile
    const studentProfile = criteriaToStudentProfile(internalUserId, criteria);

    // Calculate match scores for all mentors
    const matchResults = mentors.map((mentor) => {
      const score = calculateMatchScore(studentProfile, mentor);
      return {
        mentor,
        score,
        isRecommended: score.totalScore >= 80,
        isPerfectMatch: score.totalScore >= 90,
      };
    });

    // Sort by score descending
    matchResults.sort((a, b) => b.score.totalScore - a.score.totalScore);

    // Filter by minimum score threshold
    // If instrument filter was applied, lower threshold since instrument match is already verified
    const MIN_MATCH_SCORE = criteria.instrument ? 30 : 70;
    const qualifiedMatches = matchResults.filter(
      (m) => m.score.totalScore >= MIN_MATCH_SCORE
    );

    // Take top N from qualified matches only
    const topMatches = qualifiedMatches.slice(0, limit);

    logger.info('[POST /api/mentor-matching/search] Filtering results', {
      totalCandidates: matchResults.length,
      qualifiedAbove70: qualifiedMatches.length,
      topScore: matchResults[0]?.score.totalScore || 0,
    });

    // Generate AI reason summaries for top matches (in parallel)
    const mentorSuggestions: MentorSuggestion[] = await Promise.all(
      topMatches.map(async (match, index) => {
        const reasonSummary = await generateReasonSummary(
          studentProfile,
          match.mentor,
          match.score.totalScore,
          match.score.reasoning
        );

        return {
          mentor: match.mentor,
          matchResult: match,
          reasonSummary,
          isTopPick: index === 0 && match.score.totalScore >= 80,
        };
      })
    );

    // Calculate search quality (average score of top matches)
    const searchQuality =
      topMatches.length > 0
        ? topMatches.reduce((sum, m) => sum + m.score.totalScore, 0) /
          topMatches.length /
          100
        : 0;

    logger.info('[POST /api/mentor-matching/search] Search completed', {
      totalFound: matchResults.length,
      returned: mentorSuggestions.length,
      searchQuality: searchQuality.toFixed(2),
      topScore: topMatches[0]?.score.totalScore || 0,
    });

    const response: MentorSearchResponse = {
      mentors: mentorSuggestions,
      totalFound: matchResults.length,
      searchQuality,
    };

    return apiSuccess(response);
  } catch (error) {
    logger.error('[POST /api/mentor-matching/search] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return apiValidationError('Invalid request', error.errors);
    }

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});

// ========================================
// GET Handler (Health Check)
// ========================================

export const GET = withAuthResolved(async () => {
  return apiSuccess({
    status: 'ok',
    endpoint: '/api/mentor-matching/search',
    description: 'Search and rank mentors based on user criteria',
    features: [
      'Rule-based matching algorithm',
      'AI-generated match explanations',
      'Score-based ranking',
      'Configurable result limit',
    ],
  });
});
