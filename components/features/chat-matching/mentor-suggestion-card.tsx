/**
 * Mentor Suggestion Card Component
 * Inline mentor card for chat-based matching
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MentorSuggestionCardProps } from '@/types/chat-matching';

export function MentorSuggestionCard({
  suggestion,
  onSelect,
  isCompact = false,
  showDetailedScore = false,
}: MentorSuggestionCardProps) {
  const { mentor, matchResult, reasonSummary, isTopPick } = suggestion;
  const matchPercentage = matchResult.score.totalScore;

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all hover:shadow-md ${
        isTopPick
          ? 'border-[var(--color-brand-green)] bg-gradient-to-br from-green-50 to-white'
          : 'border-gray-200 hover:border-gray-300'
      } ${isCompact ? 'p-4' : 'p-5'}`}
    >
      {/* Top Pick Badge */}
      {isTopPick && (
        <div className="mb-3">
          <Badge className="bg-[var(--color-brand-green)] text-white border-0 px-3 py-1">
            ✨ トップピック
          </Badge>
        </div>
      )}

      {/* Header: Avatar + Name + Match % */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        {mentor.imageUrl ? (
          <img
            src={mentor.imageUrl}
            alt={mentor.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {mentor.name.charAt(0)}
          </div>
        )}

        {/* Name and Rating */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base text-gray-900 truncate">
            {mentor.name}
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center">
              <span className="text-yellow-500 mr-1">★</span>
              <span className="font-medium">{mentor.rating.toFixed(1)}</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              {mentor.totalReviews}件のレビュー
            </span>
          </div>
        </div>

        {/* Match Percentage */}
        <div className="text-right flex-shrink-0">
          <div
            className={`text-2xl font-bold ${
              isTopPick ? 'text-[var(--color-brand-green)]' : 'text-blue-600'
            }`}
          >
            {matchPercentage}
          </div>
          <div className="text-xs text-gray-500">マッチ度</div>
        </div>
      </div>

      {/* AI Reason Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 leading-relaxed">{reasonSummary}</p>
      </div>

      {/* Key Match Points */}
      {!isCompact && matchResult.score.reasoning.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-1">
            {matchResult.score.reasoning.slice(0, 3).map((reason, idx) => (
              <li key={idx} className="text-xs text-gray-600 flex items-start">
                <span className="text-[var(--color-brand-green)] mr-1.5 flex-shrink-0">
                  ✓
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div>
          <span className="text-lg font-bold text-gray-900">
            ¥{mentor.pricePerHour.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">/時間</span>
        </div>

        <Button
          onClick={() => onSelect(mentor)}
          variant="primary"
          size="sm"
          className="px-4"
        >
          詳細を見る
        </Button>
      </div>

      {/* Detailed Score (Optional) */}
      {showDetailedScore && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">詳細スコア:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">スキルレベル:</span>
              <span className="font-medium">
                {matchResult.score.breakdown.skillLevelMatch}/25
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">学習目標:</span>
              <span className="font-medium">
                {matchResult.score.breakdown.goalAlignment}/20
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">スケジュール:</span>
              <span className="font-medium">
                {matchResult.score.breakdown.scheduleOverlap}/20
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">価格:</span>
              <span className="font-medium">
                {matchResult.score.breakdown.priceCompatibility}/15
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
