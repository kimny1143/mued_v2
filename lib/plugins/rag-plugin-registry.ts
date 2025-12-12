/**
 * RAG Plugin Registry and Factory Pattern Implementation
 * Phase 2: RAG観測とデータ管理用の拡張プラグインシステム
 *
 * Note: This is a simplified implementation for Phase 2 RAG metrics.
 * It complements the existing plugin-registry.ts
 */

import { logger } from '@/lib/utils/logger';

// RAG-specific plugin capabilities
export interface RagPluginCapabilities {
  list: boolean;      // Can list content items
  search: boolean;    // Can search content
  filter: boolean;    // Supports filtering
  fetch: boolean;     // Can fetch individual items
  transform: boolean; // Can transform content format
}

// Content item interface for RAG
export interface RagContentItem {
  id: string;
  title: string;
  content: string;
  type: 'material' | 'note_article' | 'document' | 'generated';
  sourceUrl?: string;
  metadata?: {
    author?: string;
    tags?: string[];
    license?: string;
    confidence?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Search parameters for RAG queries
export interface RagSearchParams {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tags?: string[];
  };
}

// RAG Content fetcher interface
export interface IRagContentFetcher {
  // Core methods
  list(limit?: number, offset?: number): Promise<RagContentItem[]>;
  search(params: RagSearchParams): Promise<RagContentItem[]>;
  fetch(id: string): Promise<RagContentItem | null>;

  // Optional methods
  filter?(criteria: Record<string, unknown>): Promise<RagContentItem[]>;
  transform?(content: RagContentItem, format: string): Promise<unknown>;

  // Health check for monitoring
  healthCheck(): Promise<{ healthy: boolean; message?: string; latencyMs?: number }>;
}

// RAG Plugin descriptor
export interface RagPluginDescriptor {
  name: string;
  source: string;
  version: string;
  fetcher: IRagContentFetcher;
  capabilities: RagPluginCapabilities;
  config?: Record<string, unknown>;
  apiEndpoint?: string;
  apiKeyEnvVar?: string;
}

/**
 * RAG Plugin Registry - Simplified registry for Phase 2 content sources
 */
export class RagPluginRegistry {
  private static instance: RagPluginRegistry;
  private plugins = new Map<string, RagPluginDescriptor>();
  private healthStatuses = new Map<string, { healthy: boolean; lastCheck: Date; message?: string }>();

  private constructor() {}

  static getInstance(): RagPluginRegistry {
    if (!RagPluginRegistry.instance) {
      RagPluginRegistry.instance = new RagPluginRegistry();
    }
    return RagPluginRegistry.instance;
  }

  /**
   * Register a RAG plugin
   */
  register(source: string, descriptor: RagPluginDescriptor): void {
    if (this.plugins.has(source)) {
      logger.warn(`[RAG Registry] Overwriting existing plugin: ${source}`);
    }

    this.plugins.set(source, descriptor);
    logger.debug(`[RAG Registry] ✅ Registered: ${descriptor.name} v${descriptor.version}`);
  }

  /**
   * Get plugin by source
   */
  get(source: string): RagPluginDescriptor | undefined {
    return this.plugins.get(source);
  }

  /**
   * Get all plugins
   */
  getAll(): RagPluginDescriptor[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check plugin health
   */
  async checkHealth(source: string): Promise<{ healthy: boolean; message?: string }> {
    const plugin = this.plugins.get(source);
    if (!plugin) {
      return { healthy: false, message: 'Plugin not found' };
    }

    try {
      const health = await plugin.fetcher.healthCheck();
      this.healthStatuses.set(source, {
        healthy: health.healthy,
        lastCheck: new Date(),
        message: health.message
      });
      return health;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Health check failed';
      this.healthStatuses.set(source, {
        healthy: false,
        lastCheck: new Date(),
        message
      });
      return { healthy: false, message };
    }
  }

  /**
   * Get health status (cached)
   */
  getHealthStatus(source: string): { healthy: boolean; lastCheck: Date; message?: string } | undefined {
    return this.healthStatuses.get(source);
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.plugins.clear();
    this.healthStatuses.clear();
  }
}

/**
 * RAG Plugin Factory - Creates standard RAG plugin implementations
 */
export class RagPluginFactory {
  private registry = RagPluginRegistry.getInstance();

  /**
   * Register Note.com plugin for RAG
   */
  registerNotePlugin(config?: { apiKey?: string; baseUrl?: string }): void {
    // Simplified mock implementation for Phase 2
    const fetcher: IRagContentFetcher = {
      async list(limit = 10, offset = 0): Promise<RagContentItem[]> {
        // This would connect to actual Note.com API
        logger.debug(`[Note Plugin] Fetching list: limit=${limit}, offset=${offset}`);
        return [];
      },

      async search(params: RagSearchParams): Promise<RagContentItem[]> {
        logger.debug(`[Note Plugin] Searching: query="${params.query}"`);
        return [];
      },

      async fetch(id: string): Promise<RagContentItem | null> {
        logger.debug(`[Note Plugin] Fetching item: id=${id}`);
        return null;
      },

      async healthCheck() {
        // Check if Note.com API is reachable
        const startTime = Date.now();
        try {
          // Mock health check - replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            healthy: true,
            message: 'Note.com API is reachable',
            latencyMs: Date.now() - startTime
          };
        } catch {
          // Error details not needed for mock implementation
          return {
            healthy: false,
            message: 'Note.com API is not reachable',
            latencyMs: Date.now() - startTime
          };
        }
      }
    };

    this.registry.register('note', {
      name: 'Note.com Integration',
      source: 'note',
      version: '1.0.0',
      fetcher,
      capabilities: {
        list: true,
        search: true,
        filter: true,
        fetch: true,
        transform: false
      },
      config,
      apiEndpoint: 'https://note.com/api/v2',
      apiKeyEnvVar: 'NOTE_API_KEY'
    });
  }

  /**
   * Register local materials plugin for RAG
   */
  registerLocalPlugin(config?: { basePath?: string }): void {
    // Simplified mock implementation for Phase 2
    const fetcher: IRagContentFetcher = {
      async list(limit = 10, offset = 0): Promise<RagContentItem[]> {
        logger.debug(`[Local Plugin] Listing materials: limit=${limit}, offset=${offset}`);
        return [];
      },

      async search(params: RagSearchParams): Promise<RagContentItem[]> {
        logger.debug(`[Local Plugin] Searching materials: query="${params.query}"`);
        return [];
      },

      async fetch(id: string): Promise<RagContentItem | null> {
        logger.debug(`[Local Plugin] Fetching material: id=${id}`);
        return null;
      },

      async filter(criteria: Record<string, unknown>): Promise<RagContentItem[]> {
        logger.debug(`[Local Plugin] Filtering materials:`, criteria);
        return [];
      },

      async transform(content: RagContentItem, format: string): Promise<unknown> {
        logger.debug(`[Local Plugin] Transforming content to ${format}`);
        return content;
      },

      async healthCheck() {
        return {
          healthy: true,
          message: 'Local storage is accessible',
          latencyMs: 5
        };
      }
    };

    this.registry.register('local', {
      name: 'Local Materials',
      source: 'local',
      version: '1.0.0',
      fetcher,
      capabilities: {
        list: true,
        search: true,
        filter: true,
        fetch: true,
        transform: true
      },
      config
    });
  }

  /**
   * Initialize standard plugins
   */
  initializeStandardPlugins(): void {
    this.registerNotePlugin();
    this.registerLocalPlugin();
    logger.debug('[RAG Factory] Standard plugins initialized');
  }

  /**
   * Aggregate content from multiple sources
   */
  async aggregateContent(
    sources: string[],
    params?: RagSearchParams
  ): Promise<RagContentItem[]> {
    const results: RagContentItem[] = [];

    for (const source of sources) {
      const plugin = this.registry.get(source);
      if (!plugin) {
        logger.warn(`[RAG Factory] Plugin "${source}" not found`);
        continue;
      }

      try {
        const items = params
          ? await plugin.fetcher.search(params)
          : await plugin.fetcher.list();

        results.push(...items);
      } catch (error) {
        logger.error(`[RAG Factory] Error fetching from "${source}":`, error);
      }
    }

    // Sort by updated date (newest first)
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return results;
  }

  /**
   * Run health checks on all registered plugins
   */
  async healthCheckAll(): Promise<Map<string, { healthy: boolean; message?: string }>> {
    const results = new Map<string, { healthy: boolean; message?: string }>();
    const plugins = this.registry.getAll();

    for (const plugin of plugins) {
      const health = await this.registry.checkHealth(plugin.source);
      results.set(plugin.source, health);
    }

    return results;
  }
}

// Export singleton instances
export const ragPluginRegistry = RagPluginRegistry.getInstance();
export const ragPluginFactory = new RagPluginFactory();

// Initialize on module load (can be disabled for testing)
if (process.env.NODE_ENV !== 'test') {
  ragPluginFactory.initializeStandardPlugins();
}