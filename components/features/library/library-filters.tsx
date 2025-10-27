/**
 * Library Filters Component
 * ライブラリフィルターコンポーネント
 *
 * Filter controls for the library
 */

import type { ContentSource } from '@/types/unified-content';

interface FilterState {
  source: ContentSource | 'all';
  search: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  sortBy: 'date' | 'relevance' | 'popularity';
}

interface LibraryFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function LibraryFilters({ filters, onChange }: LibraryFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search content..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
          />
        </div>

        {/* Source */}
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            id="source"
            value={filters.source}
            onChange={(e) => onChange({ ...filters, source: e.target.value as FilterState['source'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
          >
            <option value="all">All Sources</option>
            <option value="note">note.com</option>
            <option value="youtube">YouTube</option>
            <option value="ai_generated">AI Generated</option>
            <option value="internal">Internal</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <select
            id="difficulty"
            value={filters.difficulty || ''}
            onChange={(e) => onChange({ ...filters, difficulty: e.target.value as FilterState['difficulty'] || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
          >
            <option value="date">Latest</option>
            <option value="relevance">Relevance</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>
    </div>
  );
}
