/**
 * Matching Preferences Component
 * マッチングの優先度を設定するUI
 */

'use client';

import type { MatchingPreferences } from '@/types/matching';

interface MatchingPreferencesProps {
  preferences: MatchingPreferences;
  onChange: (preferences: Partial<MatchingPreferences>) => void;
  onReset?: () => void;
}

export function MatchingPreferencesPanel({
  preferences,
  onChange,
  onReset,
}: MatchingPreferencesProps) {
  const handleToggle = (key: keyof MatchingPreferences) => {
    onChange({ [key]: !preferences[key] });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          マッチング設定
        </h3>
        {onReset && (
          <button
            onClick={onReset}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            リセット
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* スケジュール優先 */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.prioritizeSchedule || false}
            onChange={() => handleToggle('prioritizeSchedule')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              スケジュール優先
            </div>
            <div className="text-sm text-gray-500">
              予約可能な時間帯の重なりを重視
            </div>
          </div>
        </label>

        {/* 価格優先 */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.prioritizePrice || false}
            onChange={() => handleToggle('prioritizePrice')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              価格優先
            </div>
            <div className="text-sm text-gray-500">
              予算内の価格帯を重視
            </div>
          </div>
        </label>

        {/* 経験値優先 */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.prioritizeExperience || false}
            onChange={() => handleToggle('prioritizeExperience')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              経験値優先
            </div>
            <div className="text-sm text-gray-500">
              高評価・レビュー数を重視
            </div>
          </div>
        </label>

        {/* 過去のメンター除外 */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.excludePreviousMentors || false}
            onChange={() => handleToggle('excludePreviousMentors')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              新しいメンターを探す
            </div>
            <div className="text-sm text-gray-500">
              過去にレッスンを受けたメンターを除外
            </div>
          </div>
        </label>
      </div>

      {/* アクティブな設定の表示 */}
      {Object.values(preferences).some((v) => v) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">適用中の設定:</div>
          <div className="flex flex-wrap gap-2">
            {preferences.prioritizeSchedule && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                スケジュール優先
              </span>
            )}
            {preferences.prioritizePrice && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                価格優先
              </span>
            )}
            {preferences.prioritizeExperience && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                経験値優先
              </span>
            )}
            {preferences.excludePreviousMentors && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                新メンター優先
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
