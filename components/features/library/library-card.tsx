/**
 * Library Card Component
 * ライブラリカードコンポーネント
 *
 * Displays a single content item in the library
 */

import Link from 'next/link';
import type { UnifiedContent } from '@/types/unified-content';

interface LibraryCardProps {
  content: UnifiedContent;
}

export function LibraryCard({ content }: LibraryCardProps) {
  const sourceColors = {
    note: 'bg-green-100 text-green-800',
    youtube: 'bg-red-100 text-red-800',
    ai_generated: 'bg-purple-100 text-purple-800',
    internal: 'bg-blue-100 text-blue-800',
    partner: 'bg-orange-100 text-orange-800',
  };

  const difficultyColors = {
    beginner: 'bg-emerald-100 text-emerald-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      {content.thumbnail && (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img
            src={content.thumbnail}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceColors[content.source]}`}>
            {content.source}
          </span>
          {content.difficulty && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[content.difficulty]}`}>
              {content.difficulty}
            </span>
          )}
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {content.type}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 line-clamp-2">
          {content.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-3">
          {content.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>{content.author?.name || 'Unknown'}</span>
          <span>{new Date(content.publishedAt).toLocaleDateString()}</span>
        </div>

        {/* Tags */}
        {content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
              >
                #{tag}
              </span>
            ))}
            {content.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded text-xs text-gray-400">
                +{content.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {content.url && (
            <Link
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] text-white rounded-md text-sm font-medium text-center transition-colors"
            >
              View Content
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
