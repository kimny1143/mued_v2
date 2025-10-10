/**
 * AI Mentor Matching Hook
 * メンターマッチング機能を提供するカスタムフック
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  StudentProfile,
  MentorProfile,
  MatchResult,
  MatchingPreferences,
} from '@/types/matching';
import { getTopMatches, matchMentors } from '@/lib/matching-algorithm';

interface UseMentorMatchingOptions {
  studentProfile: StudentProfile;
  availableMentors: MentorProfile[];
  topN?: number;
  defaultPreferences?: MatchingPreferences;
}

export function useMentorMatching({
  studentProfile,
  availableMentors,
  topN = 5,
  defaultPreferences,
}: UseMentorMatchingOptions) {
  const [preferences, setPreferences] = useState<MatchingPreferences>(
    defaultPreferences || {}
  );
  const [isLoading, setIsLoading] = useState(false);

  // マッチング結果を計算（メモ化）
  const matchResults = useMemo(() => {
    if (!studentProfile || availableMentors.length === 0) {
      return [];
    }

    return matchMentors(studentProfile, availableMentors, preferences);
  }, [studentProfile, availableMentors, preferences]);

  // トップNのマッチング結果
  const topMatches = useMemo(() => {
    return matchResults.slice(0, topN);
  }, [matchResults, topN]);

  // 推奨メンター（スコア80以上）
  const recommendedMentors = useMemo(() => {
    return matchResults.filter((result) => result.isRecommended);
  }, [matchResults]);

  // パーフェクトマッチ（スコア90以上）
  const perfectMatches = useMemo(() => {
    return matchResults.filter((result) => result.isPerfectMatch);
  }, [matchResults]);

  // プリファレンスを更新
  const updatePreferences = useCallback((newPreferences: Partial<MatchingPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPreferences }));
  }, []);

  // プリファレンスをリセット
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences || {});
  }, [defaultPreferences]);

  // 特定のメンターのマッチングスコアを取得
  const getMentorScore = useCallback(
    (mentorId: string): MatchResult | undefined => {
      return matchResults.find((result) => result.mentor.id === mentorId);
    },
    [matchResults]
  );

  // マッチング結果を再計算（強制リフレッシュ）
  const refreshMatches = useCallback(async () => {
    setIsLoading(true);
    // 実際のアプリケーションではAPIコールを行う
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  // 統計情報
  const stats = useMemo(() => {
    const scores = matchResults.map((r) => r.score.totalScore);
    return {
      totalMentors: matchResults.length,
      recommendedCount: recommendedMentors.length,
      perfectMatchCount: perfectMatches.length,
      averageScore: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
    };
  }, [matchResults, recommendedMentors, perfectMatches]);

  return {
    // マッチング結果
    matchResults,
    topMatches,
    recommendedMentors,
    perfectMatches,

    // プリファレンス管理
    preferences,
    updatePreferences,
    resetPreferences,

    // ユーティリティ
    getMentorScore,
    refreshMatches,
    isLoading,

    // 統計情報
    stats,
  };
}

/**
 * 簡易版: トップマッチのみを取得するフック
 */
export function useTopMentorMatches(
  studentProfile: StudentProfile,
  availableMentors: MentorProfile[],
  topN: number = 3
) {
  return useMemo(() => {
    if (!studentProfile || availableMentors.length === 0) {
      return [];
    }

    return getTopMatches(studentProfile, availableMentors, topN);
  }, [studentProfile, availableMentors, topN]);
}
