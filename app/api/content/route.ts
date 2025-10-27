/**
 * Content API Endpoint
 * コンテンツAPIエンドポイント
 *
 * Unified content fetching endpoint for Library
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getContainer, TYPES } from '@/lib/di';
import type { ContentFetcherRegistry } from '@/lib/content';
import type { PluginLoader } from '@/lib/plugins';
import type { ContentSource, ContentFetchParams } from '@/types/unified-content';

// Initialize plugins on cold start
let pluginsInitialized = false;

async function initializePlugins() {
  if (pluginsInitialized) return;

  try {
    const container = getContainer();
    const loader = container.get<PluginLoader>(TYPES.PluginLoader);
    const registry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

    // Load note.com plugin
    const notePlugin = await loader.load('@/lib/plugins/note');

    // Register the fetcher
    if (notePlugin.fetcher && typeof notePlugin.fetcher === 'object' && 'fetch' in notePlugin.fetcher) {
      registry.register('note', notePlugin.fetcher as any);
      console.log('[ContentAPI] note.com plugin registered successfully');
    }

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
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ContentAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/content/sources
 * Get list of available content sources
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (body.action === 'list-sources') {
      // Initialize plugins if needed
      await initializePlugins();

      const container = getContainer();
      const fetcherRegistry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

      const sources = fetcherRegistry.listSources();

      return NextResponse.json({
        success: true,
        sources,
      });
    }

    if (body.action === 'health-check') {
      // Initialize plugins if needed
      await initializePlugins();

      const container = getContainer();
      const fetcherRegistry = container.get<ContentFetcherRegistry>(TYPES.ContentFetcherRegistry);

      const health = await fetcherRegistry.healthCheckAll();

      return NextResponse.json({
        success: true,
        health,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[ContentAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
