/**
 * Mentor Match Card Component
 * メンターマッチング結果を表示するカード
 */

'use client';

import type { MatchResult } from '@/types/matching';

interface MentorMatchCardProps {
  matchResult: MatchResult;
  onSelect?: (mentorId: string) => void;
  showDetailedScore?: boolean;
}

export function MentorMatchCard({
  matchResult,
  onSelect,
  showDetailedScore = false,
}: MentorMatchCardProps) {
  const { mentor, score, isPerfectMatch, isRecommended } = matchResult;

  const handleClick = () => {
    if (onSelect) {
      onSelect(mentor.id);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 p-6 transition-all hover:shadow-lg cursor-pointer ${
        isPerfectMatch
          ? 'border-[var(--color-brand-green)] bg-green-50'
          : isRecommended
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      {/* ヘッダー: メンター情報 + マッチスコア */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
            {mentor.name.charAt(0)}
          </div>

          {/* 名前と評価 */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{mentor.name}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-500">★ {mentor.rating.toFixed(1)}</span>
              <span className="text-gray-500">({mentor.totalReviews}件)</span>
            </div>
          </div>
        </div>

        {/* マッチスコア */}
        <div className="text-right">
          <div
            className={`text-3xl font-bold ${
              isPerfectMatch
                ? 'text-[var(--color-brand-green)]'
                : isRecommended
                ? 'text-blue-600'
                : 'text-gray-700'
            }`}
          >
            {score.totalScore}
          </div>
          <div className="text-xs text-gray-500">マッチ度</div>
        </div>
      </div>

      {/* バッジ */}
      <div className="flex gap-2 mb-3">
        {isPerfectMatch && (
          <span className="px-3 py-1 bg-[var(--color-brand-green)] text-white text-xs font-semibold rounded-full">
            ✨ 最適なマッチ
          </span>
        )}
        {isRecommended && !isPerfectMatch && (
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
            おすすめ
          </span>
        )}
      </div>

      {/* マッチング理由 */}
      {score.reasoning.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            マッチング理由:
          </h4>
          <ul className="space-y-1">
            {score.reasoning.map((reason, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start">
                <span className="text-[var(--color-brand-green)] mr-2">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 価格 */}
      <div className="pt-3 border-t border-gray-200">
        <span className="text-lg font-bold text-gray-900">
          ¥{mentor.pricePerHour.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">/時間</span>
      </div>

      {/* 詳細スコア（オプション） */}
      {showDetailedScore && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">
            詳細スコア:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">スキルレベル:</span>
              <span className="font-medium">{score.breakdown.skillLevelMatch}/25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">学習目標:</span>
              <span className="font-medium">{score.breakdown.goalAlignment}/20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">スケジュール:</span>
              <span className="font-medium">{score.breakdown.scheduleOverlap}/20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">価格:</span>
              <span className="font-medium">{score.breakdown.priceCompatibility}/15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">評価:</span>
              <span className="font-medium">{score.breakdown.reviewScore}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ジャンル:</span>
              <span className="font-medium">{score.breakdown.genreMatch}/10</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
