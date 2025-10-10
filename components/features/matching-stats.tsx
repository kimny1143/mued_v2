/**
 * Matching Stats Component
 * マッチング統計情報を表示
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
        マッチング結果サマリー
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* 対象メンター数 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalMentors}
          </div>
          <div className="text-sm text-gray-600">対象メンター</div>
        </div>

        {/* パーフェクトマッチ */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-[var(--color-brand-green)]">
            {stats.perfectMatchCount}
          </div>
          <div className="text-sm text-gray-600">
            最適なマッチ
            <span className="text-xs text-gray-400 ml-1">(90+)</span>
          </div>
        </div>

        {/* 推奨メンター */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {stats.recommendedCount}
          </div>
          <div className="text-sm text-gray-600">
            おすすめ
            <span className="text-xs text-gray-400 ml-1">(80+)</span>
          </div>
        </div>

        {/* 平均スコア */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.averageScore}
          </div>
          <div className="text-sm text-gray-600">平均スコア</div>
        </div>

        {/* 最高スコア */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.maxScore}
          </div>
          <div className="text-sm text-gray-600">最高スコア</div>
        </div>

        {/* 最低スコア */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.minScore}
          </div>
          <div className="text-sm text-gray-600">最低スコア</div>
        </div>
      </div>

      {/* メッセージ */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        {stats.perfectMatchCount > 0 ? (
          <p className="text-sm text-gray-700">
            ✨ <span className="font-medium">{stats.perfectMatchCount}名</span>
            のメンターがあなたに最適です！
          </p>
        ) : stats.recommendedCount > 0 ? (
          <p className="text-sm text-gray-700">
            💡 <span className="font-medium">{stats.recommendedCount}名</span>
            のメンターをおすすめします
          </p>
        ) : (
          <p className="text-sm text-gray-700">
            検索条件を調整すると、より良いマッチングが見つかるかもしれません
          </p>
        )}
      </div>
    </div>
  );
}
