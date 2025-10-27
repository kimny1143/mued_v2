/**
 * Matching Stats Component
 * Display matching statistics
 */

'use client';

interface MatchingStatsProps {
  stats: {
    totalMentors: number;
    recommendedCount: number;
    perfectMatchCount: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
  };
}

export function MatchingStats({ stats }: MatchingStatsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Matching Results Summary
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Mentors */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalMentors}
          </div>
          <div className="text-sm text-gray-600">Total Mentors</div>
        </div>

        {/* Perfect Matches */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-[var(--color-brand-green)]">
            {stats.perfectMatchCount}
          </div>
          <div className="text-sm text-gray-600">
            Perfect Matches
            <span className="text-xs text-gray-400 ml-1">(90+)</span>
          </div>
        </div>

        {/* Recommended */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {stats.recommendedCount}
          </div>
          <div className="text-sm text-gray-600">
            Recommended
            <span className="text-xs text-gray-400 ml-1">(80+)</span>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.averageScore}
          </div>
          <div className="text-sm text-gray-600">Avg Score</div>
        </div>

        {/* Max Score */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.maxScore}
          </div>
          <div className="text-sm text-gray-600">Max Score</div>
        </div>

        {/* Min Score */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.minScore}
          </div>
          <div className="text-sm text-gray-600">Min Score</div>
        </div>
      </div>

      {/* Message */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        {stats.perfectMatchCount > 0 ? (
          <p className="text-sm text-gray-700">
            ✨ <span className="font-medium">{stats.perfectMatchCount}</span>
            {' '}mentors are perfect matches for you!
          </p>
        ) : stats.recommendedCount > 0 ? (
          <p className="text-sm text-gray-700">
            💡 <span className="font-medium">{stats.recommendedCount}</span>
            {' '}mentors are recommended for you
          </p>
        ) : (
          <p className="text-sm text-gray-700">
            Try adjusting your search criteria to find better matches
          </p>
        )}
      </div>
    </div>
  );
}
