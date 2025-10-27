/**
 * Matching Preferences Component
 * UI for configuring matching priorities
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
          Matching Settings
        </h3>
        {onReset && (
          <button
            onClick={onReset}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Prioritize Schedule */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.prioritizeSchedule || false}
            onChange={() => handleToggle('prioritizeSchedule')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              Prioritize Schedule
            </div>
            <div className="text-sm text-gray-500">
              Emphasize availability overlap
            </div>
          </div>
        </label>

        {/* Prioritize Price */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.prioritizePrice || false}
            onChange={() => handleToggle('prioritizePrice')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              Prioritize Price
            </div>
            <div className="text-sm text-gray-500">
              Emphasize budget-friendly options
            </div>
          </div>
        </label>

        {/* Prioritize Experience */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.prioritizeExperience || false}
            onChange={() => handleToggle('prioritizeExperience')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              Prioritize Experience
            </div>
            <div className="text-sm text-gray-500">
              Emphasize high ratings and reviews
            </div>
          </div>
        </label>

        {/* Exclude Previous Mentors */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={preferences.excludePreviousMentors || false}
            onChange={() => handleToggle('excludePreviousMentors')}
            className="w-5 h-5 rounded border-gray-300 text-[var(--color-brand-green)] focus:ring-[var(--color-brand-green)]"
          />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-[var(--color-brand-green)]">
              Find New Mentors
            </div>
            <div className="text-sm text-gray-500">
              Exclude mentors from previous lessons
            </div>
          </div>
        </label>
      </div>

      {/* Active Settings Display */}
      {Object.values(preferences).some((v) => v) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Active Settings:</div>
          <div className="flex flex-wrap gap-2">
            {preferences.prioritizeSchedule && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Schedule Priority
              </span>
            )}
            {preferences.prioritizePrice && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Price Priority
              </span>
            )}
            {preferences.prioritizeExperience && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Experience Priority
              </span>
            )}
            {preferences.excludePreviousMentors && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                New Mentors Only
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
