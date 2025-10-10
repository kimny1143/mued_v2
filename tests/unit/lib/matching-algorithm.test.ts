/**
 * AI Mentor Matching Algorithm Tests
 * マッチングアルゴリズムの動作確認
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  matchMentors,
  getTopMatches,
} from '@/lib/matching-algorithm';
import type { StudentProfile, MentorProfile } from '@/types/matching';

describe('AI Mentor Matching Algorithm', () => {
  // テスト用の生徒プロフィール
  const sampleStudent: StudentProfile = {
    id: 'student-001',
    skillLevel: 'intermediate',
    learningGoals: ['technique_improvement', 'repertoire_expansion'],
    learningStyle: ['visual', 'auditory'],
    preferredGenres: ['classical', 'jazz'],
    availableTimeSlots: [
      { day: 'monday', startHour: 18, endHour: 21 },
      { day: 'wednesday', startHour: 18, endHour: 21 },
    ],
    priceRange: { min: 3000, max: 8000 },
    previousMentorIds: [],
  };

  // テスト用のメンタープロフィール
  const perfectMatchMentor: MentorProfile = {
    id: 'mentor-001',
    name: 'Perfect Match Mentor',
    skillLevel: 'advanced', // 生徒より1レベル上
    specializations: ['technique_improvement', 'repertoire_expansion'], // 完全一致
    teachingStyles: ['visual', 'auditory'],
    genres: ['classical', 'jazz'], // 完全一致
    availableTimeSlots: [
      { day: 'monday', startHour: 17, endHour: 22 }, // 重なり3時間
      { day: 'wednesday', startHour: 16, endHour: 22 }, // 重なり3時間
    ],
    pricePerHour: 5000, // 範囲内
    rating: 4.9,
    totalReviews: 50,
    responseRate: 0.98,
    successfulMatches: 100,
  };

  const goodMatchMentor: MentorProfile = {
    id: 'mentor-002',
    name: 'Good Match Mentor',
    skillLevel: 'advanced',
    specializations: ['technique_improvement', 'music_theory'],
    teachingStyles: ['visual'],
    genres: ['classical', 'pop'],
    availableTimeSlots: [
      { day: 'monday', startHour: 19, endHour: 21 }, // 重なり2時間
    ],
    pricePerHour: 6000,
    rating: 4.5,
    totalReviews: 20,
    responseRate: 0.90,
    successfulMatches: 40,
  };

  const poorMatchMentor: MentorProfile = {
    id: 'mentor-003',
    name: 'Poor Match Mentor',
    skillLevel: 'beginner', // スキルレベルが低い
    specializations: ['composition'], // 目標が合わない
    teachingStyles: ['reading_writing'],
    genres: ['rock', 'pop'], // ジャンルが合わない
    availableTimeSlots: [
      { day: 'tuesday', startHour: 10, endHour: 12 }, // スケジュールが合わない
    ],
    pricePerHour: 15000, // 予算外
    rating: 3.0,
    totalReviews: 5,
    responseRate: 0.60,
    successfulMatches: 10,
  };

  describe('calculateMatchScore', () => {
    it('should give high score to perfect match mentor', () => {
      const score = calculateMatchScore(sampleStudent, perfectMatchMentor);

      expect(score.totalScore).toBeGreaterThanOrEqual(90); // パーフェクトマッチ
      expect(score.breakdown.skillLevelMatch).toBeGreaterThanOrEqual(20);
      expect(score.breakdown.goalAlignment).toBeGreaterThanOrEqual(18);
      expect(score.breakdown.scheduleOverlap).toBeGreaterThanOrEqual(18);
      expect(score.breakdown.priceCompatibility).toBeGreaterThanOrEqual(12);
      expect(score.reasoning.length).toBeGreaterThan(0);
    });

    it('should give medium score to good match mentor', () => {
      const score = calculateMatchScore(sampleStudent, goodMatchMentor);

      expect(score.totalScore).toBeGreaterThanOrEqual(60);
      expect(score.totalScore).toBeLessThan(90);
    });

    it('should give low score to poor match mentor', () => {
      const score = calculateMatchScore(sampleStudent, poorMatchMentor);

      expect(score.totalScore).toBeLessThan(40);
    });

    it('should exclude previous mentors when preference is set', () => {
      const studentWithHistory: StudentProfile = {
        ...sampleStudent,
        previousMentorIds: ['mentor-001'],
      };

      const score = calculateMatchScore(
        studentWithHistory,
        perfectMatchMentor,
        { excludePreviousMentors: true }
      );

      expect(score.totalScore).toBe(0);
      expect(score.reasoning).toContain('過去に受講済みのメンター');
    });

    it('should provide detailed reasoning for matches', () => {
      const score = calculateMatchScore(sampleStudent, perfectMatchMentor);

      expect(score.reasoning).toBeInstanceOf(Array);
      expect(score.reasoning.length).toBeGreaterThan(0);
      expect(score.reasoning.some((r) => r.includes('スキルレベル'))).toBe(true);
    });
  });

  describe('matchMentors', () => {
    const mentors = [perfectMatchMentor, goodMatchMentor, poorMatchMentor];

    it('should sort mentors by match score (descending)', () => {
      const results = matchMentors(sampleStudent, mentors);

      expect(results.length).toBe(3);
      expect(results[0].mentor.id).toBe('mentor-001'); // Perfect match first
      expect(results[0].score.totalScore).toBeGreaterThanOrEqual(
        results[1].score.totalScore
      );
      expect(results[1].score.totalScore).toBeGreaterThanOrEqual(
        results[2].score.totalScore
      );
    });

    it('should correctly identify perfect matches', () => {
      const results = matchMentors(sampleStudent, mentors);

      const perfectMatches = results.filter((r) => r.isPerfectMatch);
      expect(perfectMatches.length).toBeGreaterThan(0);
      expect(perfectMatches[0].score.totalScore).toBeGreaterThanOrEqual(90);
    });

    it('should correctly identify recommended mentors', () => {
      const results = matchMentors(sampleStudent, mentors);

      const recommended = results.filter((r) => r.isRecommended);
      expect(recommended.length).toBeGreaterThan(0);
      recommended.forEach((r) => {
        expect(r.score.totalScore).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe('getTopMatches', () => {
    const mentors = Array.from({ length: 20 }, (_, i) => ({
      ...goodMatchMentor,
      id: `mentor-${i.toString().padStart(3, '0')}`,
      name: `Mentor ${i}`,
      pricePerHour: 4000 + i * 500,
      rating: 3.5 + (i % 10) * 0.1,
    }));

    it('should return top N mentors', () => {
      const topN = 5;
      const results = getTopMatches(sampleStudent, mentors, topN);

      expect(results.length).toBe(topN);
    });

    it('should return mentors sorted by score', () => {
      const results = getTopMatches(sampleStudent, mentors, 10);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score.totalScore).toBeGreaterThanOrEqual(
          results[i + 1].score.totalScore
        );
      }
    });

    it('should handle empty mentor list', () => {
      const results = getTopMatches(sampleStudent, [], 5);
      expect(results).toEqual([]);
    });
  });

  describe('Matching Preferences', () => {
    it('should prioritize schedule when preference is set', () => {
      const scoreWithoutPref = calculateMatchScore(
        sampleStudent,
        perfectMatchMentor
      );
      const scoreWithPref = calculateMatchScore(
        sampleStudent,
        perfectMatchMentor,
        { prioritizeSchedule: true }
      );

      // スケジュール優先時はスコアが上がる
      expect(scoreWithPref.totalScore).toBeGreaterThanOrEqual(
        scoreWithoutPref.totalScore
      );
    });

    it('should prioritize price when preference is set', () => {
      const mentorInBudget: MentorProfile = {
        ...perfectMatchMentor,
        pricePerHour: 5000, // 範囲内
      };
      const mentorOutOfBudget: MentorProfile = {
        ...perfectMatchMentor,
        pricePerHour: 15000, // 範囲外
      };

      const scoreInBudget = calculateMatchScore(
        sampleStudent,
        mentorInBudget,
        { prioritizePrice: true }
      );
      const scoreOutOfBudget = calculateMatchScore(
        sampleStudent,
        mentorOutOfBudget,
        { prioritizePrice: true }
      );

      expect(scoreInBudget.totalScore).toBeGreaterThan(
        scoreOutOfBudget.totalScore
      );
    });
  });
});
