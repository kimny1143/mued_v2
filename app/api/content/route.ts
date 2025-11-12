/**
 * Content API Endpoint
 * コンテンツAPIエンドポイント
 *
 * Unified content fetching endpoint for Library
 */

import { getContainer, TYPES } from '@/lib/di';
import type { ContentFetcherRegistry } from '@/lib/content';
import type { ContentSource, ContentFetchParams } from '@/types/unified-content';
import { NoteContentFetcher } from '@/lib/plugins/note/note-content-fetcher';
import { withAuth } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/api-response';

// Initialize plugins on cold start
let pluginsInitialized = false;

async function initializePlugins() {
  if (pluginsInitialized) return;

  try {
    const container = getContainer();
    const registry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

    // Create and register note.com fetcher directly
    const noteFetcher = new NoteContentFetcher();
    registry.register('note', noteFetcher);

    console.log('[ContentAPI] note.com fetcher registered successfully');
    pluginsInitialized = true;
  } catch (error) {
    console.error('[ContentAPI] Failed to initialize plugins:', error);
    throw error;
  }
}

/**
 * GET /api/content
 * Fetch content from registered sources
 */
export const GET = withAuth(async ({ request }) => {
  try {
    // Initialize plugins if needed
    await initializePlugins();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') as ContentSource | 'all' | null;
    const type = searchParams.get('type') as ContentFetchParams['type'];
    const category = searchParams.get('category') || undefined;
    const difficulty = searchParams.get('difficulty') as ContentFetchParams['difficulty'];
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') as ContentFetchParams['sortBy']) || 'date';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const params: ContentFetchParams = {
      source: source || 'all',
      type,
      category,
      difficulty,
      tags,
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    };

    // Get container and registry
    const container = getContainer();
    const fetcherRegistry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

    // Fetch content
    let result;
    if (source && source !== 'all') {
      result = await fetcherRegistry.fetch(source, params);
    } else {
      result = await fetcherRegistry.fetchAll(params);
    }

    return apiSuccess(result);
  } catch (error) {
    console.error('[ContentAPI] Error:', error);
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});

/**
 * POST /api/content
 * Handle content-related actions
 */
export const POST = withAuth(async ({ request }) => {
  try {
    const body = await request.json();

    if (body.action === 'list-sources') {
      // Initialize plugins if needed
      await initializePlugins();

      const container = getContainer();
      const fetcherRegistry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

      const sources = fetcherRegistry.listSources();

      return apiSuccess({ sources });
    }

    if (body.action === 'health-check') {
      // Initialize plugins if needed
      await initializePlugins();

      const container = getContainer();
      const fetcherRegistry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

      const health = await fetcherRegistry.healthCheckAll();

      return apiSuccess({ health });
    }

    return apiValidationError('Unknown action');
  } catch (error) {
    console.error('[ContentAPI] Error:', error);
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});
