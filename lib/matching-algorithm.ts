/**
 * AI Mentor Matching Algorithm
 * ルールベースのマッチングシステム (MVP Phase 1)
 */

import type {
  StudentProfile,
  MentorProfile,
  MatchScore,
  MatchResult,
  TimeSlot,
  MatchingPreferences,
} from '@/types/matching';

/**
 * スキルレベルのマッチング度を計算
 * 生徒のレベルに適したメンター（±1レベル）が最適
 */
function calculateSkillLevelMatch(
  studentLevel: string,
  mentorLevel: string
): number {
  const levels = ['beginner', 'intermediate', 'advanced', 'professional'];
  const studentIdx = levels.indexOf(studentLevel);
  const mentorIdx = levels.indexOf(mentorLevel);

  if (studentIdx === -1 || mentorIdx === -1) return 0;

  const diff = Math.abs(studentIdx - mentorIdx);

  // 理想: メンターが生徒より1レベル上
  if (mentorIdx === studentIdx + 1) return 25;
  // 同レベル
  if (diff === 0) return 20;
  // ±1レベル
  if (diff === 1) return 15;
  // ±2レベル
  if (diff === 2) return 8;
  // それ以上の差
  return 0;
}

/**
 * 学習目標の一致度を計算
 */
function calculateGoalAlignment(
  studentGoals: string[],
  mentorSpecializations: string[]
): number {
  if (studentGoals.length === 0) return 10; // デフォルトスコア

  const matchingGoals = studentGoals.filter((goal) =>
    mentorSpecializations.includes(goal)
  );

  const alignmentRate = matchingGoals.length / studentGoals.length;

  return Math.round(alignmentRate * 20);
}

/**
 * スケジュールの重なりを計算
 */
function calculateScheduleOverlap(
  studentSlots: TimeSlot[],
  mentorSlots: TimeSlot[]
): number {
  if (studentSlots.length === 0 || mentorSlots.length === 0) return 0;

  let totalOverlapHours = 0;

  for (const studentSlot of studentSlots) {
    for (const mentorSlot of mentorSlots) {
      if (studentSlot.day === mentorSlot.day) {
        const overlapStart = Math.max(studentSlot.startHour, mentorSlot.startHour);
        const overlapEnd = Math.min(studentSlot.endHour, mentorSlot.endHour);

        if (overlapStart < overlapEnd) {
          totalOverlapHours += overlapEnd - overlapStart;
        }
      }
    }
  }

  // 最低2時間の重なりで満点
  const score = Math.min((totalOverlapHours / 2) * 20, 20);
  return Math.round(score);
}

/**
 * 価格適合性を計算
 */
function calculatePriceCompatibility(
  studentPriceRange: { min: number; max: number },
  mentorPrice: number
): number {
  // メンター価格が範囲内なら満点
  if (mentorPrice >= studentPriceRange.min && mentorPrice <= studentPriceRange.max) {
    return 15;
  }

  // 範囲外の場合、差に応じて減点
  const midpoint = (studentPriceRange.min + studentPriceRange.max) / 2;
  const diff = Math.abs(mentorPrice - midpoint);
  const range = studentPriceRange.max - studentPriceRange.min;

  if (diff <= range * 0.5) return 10;
  if (diff <= range) return 5;
  return 0;
}

/**
 * レビュースコアを計算
 */
function calculateReviewScore(
  rating: number,
  totalReviews: number,
  responseRate: number
): number {
  // レビュー数が少ない場合は信頼性が低い
  const reviewWeight = Math.min(totalReviews / 10, 1); // 10件以上で満点

  // 評価スコア (0-5) → (0-6点)
  const ratingScore = (rating / 5) * 6;

  // レスポンス率スコア (0-1) → (0-4点)
  const responseScore = responseRate * 4;

  const totalScore = (ratingScore + responseScore) * reviewWeight;

  return Math.round(totalScore);
}

/**
 * 音楽ジャンルの一致度を計算
 */
function calculateGenreMatch(
  studentGenres: string[],
  mentorGenres: string[]
): number {
  if (studentGenres.length === 0) return 5; // デフォルトスコア

  const matchingGenres = studentGenres.filter((genre) =>
    mentorGenres.includes(genre)
  );

  const matchRate = matchingGenres.length / studentGenres.length;

  return Math.round(matchRate * 10);
}

/**
 * マッチング理由を生成
 */
function generateMatchingReasons(
  student: StudentProfile,
  mentor: MentorProfile,
  breakdown: MatchScore['breakdown']
): string[] {
  const reasons: string[] = [];

  // スキルレベル
  if (breakdown.skillLevelMatch >= 20) {
    reasons.push(`スキルレベルが適切（生徒: ${student.skillLevel}）`);
  }

  // 学習目標
  const matchingGoals = student.learningGoals.filter((goal) =>
    mentor.specializations.includes(goal)
  );
  if (matchingGoals.length > 0) {
    reasons.push(`専門分野が一致: ${matchingGoals.join(', ')}`);
  }

  // スケジュール
  if (breakdown.scheduleOverlap >= 15) {
    reasons.push('スケジュールの重なりが十分');
  }

  // 価格
  if (breakdown.priceCompatibility >= 12) {
    reasons.push('予算内の価格設定');
  }

  // 評価
  if (mentor.rating >= 4.5 && mentor.totalReviews >= 10) {
    reasons.push(`高評価（★${mentor.rating.toFixed(1)} / ${mentor.totalReviews}件）`);
  }

  // ジャンル
  const matchingGenres = student.preferredGenres.filter((genre) =>
    mentor.genres.includes(genre)
  );
  if (matchingGenres.length > 0) {
    reasons.push(`得意ジャンル: ${matchingGenres.join(', ')}`);
  }

  return reasons;
}

/**
 * メインのマッチングスコア計算関数
 */
export function calculateMatchScore(
  student: StudentProfile,
  mentor: MentorProfile,
  preferences?: MatchingPreferences
): MatchScore {
  // 過去のメンターを除外
  if (
    preferences?.excludePreviousMentors &&
    student.previousMentorIds?.includes(mentor.id)
  ) {
    return {
      mentorId: mentor.id,
      totalScore: 0,
      breakdown: {
        skillLevelMatch: 0,
        goalAlignment: 0,
        scheduleOverlap: 0,
        priceCompatibility: 0,
        reviewScore: 0,
        genreMatch: 0,
      },
      reasoning: ['過去に受講済みのメンター'],
    };
  }

  const breakdown = {
    skillLevelMatch: calculateSkillLevelMatch(student.skillLevel, mentor.skillLevel),
    goalAlignment: calculateGoalAlignment(student.learningGoals, mentor.specializations),
    scheduleOverlap: calculateScheduleOverlap(student.availableTimeSlots, mentor.availableTimeSlots),
    priceCompatibility: calculatePriceCompatibility(student.priceRange, mentor.pricePerHour),
    reviewScore: calculateReviewScore(mentor.rating, mentor.totalReviews, mentor.responseRate),
    genreMatch: calculateGenreMatch(student.preferredGenres, mentor.genres),
  };

  // プリファレンスに基づく重み調整
  let weights = {
    skillLevelMatch: 1.0,
    goalAlignment: 1.0,
    scheduleOverlap: 1.0,
    priceCompatibility: 1.0,
    reviewScore: 1.0,
    genreMatch: 1.0,
  };

  if (preferences?.prioritizeSchedule) {
    weights.scheduleOverlap = 1.5;
  }
  if (preferences?.prioritizePrice) {
    weights.priceCompatibility = 1.5;
  }
  if (preferences?.prioritizeExperience) {
    weights.reviewScore = 1.5;
  }

  const totalScore = Math.round(
    breakdown.skillLevelMatch * weights.skillLevelMatch +
    breakdown.goalAlignment * weights.goalAlignment +
    breakdown.scheduleOverlap * weights.scheduleOverlap +
    breakdown.priceCompatibility * weights.priceCompatibility +
    breakdown.reviewScore * weights.reviewScore +
    breakdown.genreMatch * weights.genreMatch
  );

  const reasoning = generateMatchingReasons(student, mentor, breakdown);

  return {
    mentorId: mentor.id,
    totalScore: Math.min(totalScore, 100), // 最大100点
    breakdown,
    reasoning,
  };
}

/**
 * 複数のメンターとのマッチング結果を取得し、スコア順にソート
 */
export function matchMentors(
  student: StudentProfile,
  mentors: MentorProfile[],
  preferences?: MatchingPreferences
): MatchResult[] {
  const results: MatchResult[] = mentors.map((mentor) => {
    const score = calculateMatchScore(student, mentor, preferences);
    return {
      mentor,
      score,
      isRecommended: score.totalScore >= 80,
      isPerfectMatch: score.totalScore >= 90,
    };
  });

  // スコアの降順でソート
  return results.sort((a, b) => b.score.totalScore - a.score.totalScore);
}

/**
 * トップNのマッチング結果を取得
 */
export function getTopMatches(
  student: StudentProfile,
  mentors: MentorProfile[],
  topN: number = 5,
  preferences?: MatchingPreferences
): MatchResult[] {
  const allMatches = matchMentors(student, mentors, preferences);
  return allMatches.slice(0, topN);
}
