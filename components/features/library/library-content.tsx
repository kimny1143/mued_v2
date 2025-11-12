'use client';

/**
 * Library Content Component
 * ライブラリコンテンツコンポーネント
 *
 * Main content browser for Library page
 */

import { useState, useEffect, useCallback } from 'react';
import type { UnifiedContent, ContentFetchResult, ContentSource } from '@/types/unified-content';
import { LibraryCard } from './library-card';
import { LibraryFilters } from './library-filters';
import { LoadingState } from '@/components/ui/loading-state';
import { InlineLoading } from '@/components/ui/loading-spinner';
import { InlineError } from '@/components/ui/error-boundary';
import { useLocale } from '@/lib/i18n/locale-context';
import { useApiClient, getErrorMessage } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

interface FilterState {
  source: ContentSource | 'all';
  search: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  sortBy: 'date' | 'relevance';
  sortOrder: 'asc' | 'desc';
}

export function LibraryContent() {
  const { t } = useLocale();
  const apiClient = useApiClient();
  const [content, setContent] = useState<UnifiedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    source: 'all',
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        source: filters.source,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: '20',
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filters.category) {
        params.category = filters.category;
      }
      if (filters.difficulty) {
        params.difficulty = filters.difficulty;
      }

      const apiResponse = await apiClient.get<{ data: ContentFetchResult }>('/api/content', { params });

      // Handle wrapped API response
      if (apiResponse.success && apiResponse.data?.data) {
        const result: ContentFetchResult = apiResponse.data.data;
        if (result.success && result.content && Array.isArray(result.content)) {
          setContent(result.content);
        } else {
          setError(result.error || 'No content available');
        }
      } else {
        setError('Failed to fetch content');
      }
    } catch (err) {
      logger.error('Error fetching library content:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [apiClient, filters.source, filters.category, filters.difficulty, filters.sortBy, filters.sortOrder, debouncedSearch]);

  // Fetch content when filters change (except search uses debounced value)
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  if (loading && content.length === 0) {
    return <LoadingState message={t.library.loadingContent} />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <LibraryFilters
        filters={filters}
        onChange={setFilters}
      />

      {/* Error State */}
      {error && (
        <InlineError error={error} title={t.library.errorLoading} />
      )}

      {/* Content Grid */}
      {content.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => (
            <LibraryCard key={item.id} content={item} />
          ))}
        </div>
      ) : !loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">{t.library.noContent}</p>
          <p className="text-gray-400 text-sm mt-2">
            {t.library.noContentDesc}
          </p>
        </div>
      ) : null}

      {/* Loading indicator for filter changes */}
      {loading && content.length > 0 && (
        <InlineLoading label={t.library.loadingContent} />
      )}
    </div>
  );
}
