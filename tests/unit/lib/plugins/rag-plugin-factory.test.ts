/**
 * RAG Plugin Registry and Factory Tests
 * Phase 2: Content source plugin system for RAG metrics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RagPluginRegistry,
  RagPluginFactory,
  type RagPluginDescriptor,
  type RagContentItem,
  type RagSearchParams,
} from '@/lib/plugins/rag-plugin-registry';

describe('RagPluginRegistry', () => {
  let registry: RagPluginRegistry;

  beforeEach(() => {
    registry = RagPluginRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RagPluginRegistry.getInstance();
      const instance2 = RagPluginRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('register()', () => {
    it('should register a plugin', () => {
      const mockPlugin: RagPluginDescriptor = {
        name: 'Test Plugin',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn().mockResolvedValue([]),
          search: vi.fn().mockResolvedValue([]),
          fetch: vi.fn().mockResolvedValue(null),
          healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
        },
        capabilities: {
          list: true,
          search: true,
          filter: false,
          fetch: true,
          transform: false,
        },
      };

      registry.register('test', mockPlugin);

      expect(registry.get('test')).toBe(mockPlugin);
    });

    it('should log warning when overwriting existing plugin', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: true,
          transform: false,
        },
      };

      registry.register('test', plugin);
      registry.register('test', plugin); // Overwrite

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing plugin')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('get()', () => {
    it('should return plugin by source', () => {
      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: true,
          transform: false,
        },
      };

      registry.register('test', plugin);

      expect(registry.get('test')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAll()', () => {
    it('should return all registered plugins', () => {
      const plugin1: RagPluginDescriptor = {
        name: 'Plugin 1',
        source: 'plugin1',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      const plugin2: RagPluginDescriptor = {
        name: 'Plugin 2',
        source: 'plugin2',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: true,
          filter: false,
          fetch: true,
          transform: false,
        },
      };

      registry.register('plugin1', plugin1);
      registry.register('plugin2', plugin2);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(plugin1);
      expect(all).toContain(plugin2);
    });

    it('should return empty array when no plugins registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('checkHealth()', () => {
    it('should check plugin health', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        message: 'All systems operational',
      });

      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: mockHealthCheck,
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('test', plugin);

      const health = await registry.checkHealth('test');

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('All systems operational');
      expect(mockHealthCheck).toHaveBeenCalled();
    });

    it('should return unhealthy for non-existent plugin', async () => {
      const health = await registry.checkHealth('non-existent');

      expect(health.healthy).toBe(false);
      expect(health.message).toBe('Plugin not found');
    });

    it('should handle health check errors', async () => {
      const mockHealthCheck = vi.fn().mockRejectedValue(
        new Error('Connection failed')
      );

      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: mockHealthCheck,
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('test', plugin);

      const health = await registry.checkHealth('test');

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('Connection failed');
    });

    it('should cache health status', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({ healthy: true });

      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: mockHealthCheck,
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('test', plugin);

      await registry.checkHealth('test');

      const cached = registry.getHealthStatus('test');

      expect(cached).toBeDefined();
      expect(cached?.healthy).toBe(true);
      expect(cached?.lastCheck).toBeInstanceOf(Date);
    });
  });

  describe('clear()', () => {
    it('should clear all plugins and health statuses', () => {
      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('test', plugin);
      registry.clear();

      expect(registry.getAll()).toEqual([]);
      expect(registry.get('test')).toBeUndefined();
    });
  });
});

describe('RagPluginFactory', () => {
  let factory: RagPluginFactory;
  let registry: RagPluginRegistry;

  beforeEach(() => {
    factory = new RagPluginFactory();
    registry = RagPluginRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('registerNotePlugin()', () => {
    it('should register note.com plugin', () => {
      factory.registerNotePlugin();

      const plugin = registry.get('note');

      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('Note.com Integration');
      expect(plugin?.source).toBe('note');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should have correct capabilities', () => {
      factory.registerNotePlugin();

      const plugin = registry.get('note');

      expect(plugin?.capabilities.list).toBe(true);
      expect(plugin?.capabilities.search).toBe(true);
      expect(plugin?.capabilities.filter).toBe(true);
      expect(plugin?.capabilities.fetch).toBe(true);
      expect(plugin?.capabilities.transform).toBe(false);
    });

    it('should accept configuration', () => {
      const config = {
        apiKey: 'test-key',
        baseUrl: 'https://custom.note.com',
      };

      factory.registerNotePlugin(config);

      const plugin = registry.get('note');

      expect(plugin?.config).toEqual(config);
    });

    it('should have working health check', async () => {
      factory.registerNotePlugin();

      const plugin = registry.get('note');
      const health = await plugin?.fetcher.healthCheck();

      expect(health?.healthy).toBe(true);
      expect(health?.latencyMs).toBeDefined();
    });
  });

  describe('registerLocalPlugin()', () => {
    it('should register local materials plugin', () => {
      factory.registerLocalPlugin();

      const plugin = registry.get('local');

      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('Local Materials');
      expect(plugin?.source).toBe('local');
    });

    it('should have all capabilities', () => {
      factory.registerLocalPlugin();

      const plugin = registry.get('local');

      expect(plugin?.capabilities.list).toBe(true);
      expect(plugin?.capabilities.search).toBe(true);
      expect(plugin?.capabilities.filter).toBe(true);
      expect(plugin?.capabilities.fetch).toBe(true);
      expect(plugin?.capabilities.transform).toBe(true);
    });

    it('should support filtering', async () => {
      factory.registerLocalPlugin();

      const plugin = registry.get('local');
      const filterFn = plugin?.fetcher.filter;

      expect(filterFn).toBeDefined();

      if (filterFn) {
        const results = await filterFn({ type: 'material' });
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should support content transformation', async () => {
      factory.registerLocalPlugin();

      const plugin = registry.get('local');
      const transformFn = plugin?.fetcher.transform;

      expect(transformFn).toBeDefined();

      if (transformFn) {
        const mockContent: RagContentItem = {
          id: '1',
          title: 'Test',
          content: 'Content',
          type: 'material',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const transformed = await transformFn(mockContent, 'markdown');
        expect(transformed).toBeDefined();
      }
    });
  });

  describe('initializeStandardPlugins()', () => {
    it('should initialize note and local plugins', () => {
      factory.initializeStandardPlugins();

      const note = registry.get('note');
      const local = registry.get('local');

      expect(note).toBeDefined();
      expect(local).toBeDefined();
    });

    it('should log initialization message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      factory.initializeStandardPlugins();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Standard plugins initialized')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('aggregateContent()', () => {
    it('should aggregate content from multiple sources', async () => {
      const mockContent1: RagContentItem = {
        id: '1',
        title: 'Content 1',
        content: 'Test content 1',
        type: 'note_article',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const mockContent2: RagContentItem = {
        id: '2',
        title: 'Content 2',
        content: 'Test content 2',
        type: 'material',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
      };

      const plugin1: RagPluginDescriptor = {
        name: 'Plugin 1',
        source: 'source1',
        version: '1.0.0',
        fetcher: {
          list: vi.fn().mockResolvedValue([mockContent1]),
          search: vi.fn().mockResolvedValue([mockContent1]),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: true,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      const plugin2: RagPluginDescriptor = {
        name: 'Plugin 2',
        source: 'source2',
        version: '1.0.0',
        fetcher: {
          list: vi.fn().mockResolvedValue([mockContent2]),
          search: vi.fn().mockResolvedValue([mockContent2]),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: true,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('source1', plugin1);
      registry.register('source2', plugin2);

      const results = await factory.aggregateContent(['source1', 'source2']);

      expect(results).toHaveLength(2);
      expect(results).toContainEqual(mockContent1);
      expect(results).toContainEqual(mockContent2);
    });

    it('should sort results by updated date (newest first)', async () => {
      const oldContent: RagContentItem = {
        id: '1',
        title: 'Old',
        content: 'Old content',
        type: 'material',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const newContent: RagContentItem = {
        id: '2',
        title: 'New',
        content: 'New content',
        type: 'material',
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10'),
      };

      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn().mockResolvedValue([oldContent, newContent]),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('test', plugin);

      const results = await factory.aggregateContent(['test']);

      expect(results[0]).toEqual(newContent);
      expect(results[1]).toEqual(oldContent);
    });

    it('should handle plugin errors gracefully', async () => {
      const plugin: RagPluginDescriptor = {
        name: 'Failing Plugin',
        source: 'failing',
        version: '1.0.0',
        fetcher: {
          list: vi.fn().mockRejectedValue(new Error('Fetch failed')),
          search: vi.fn(),
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: true,
          search: false,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('failing', plugin);

      const results = await factory.aggregateContent(['failing']);

      expect(results).toEqual([]);
    });

    it('should skip non-existent sources', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const results = await factory.aggregateContent(['non-existent']);

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );

      consoleSpy.mockRestore();
    });

    it('should support search parameters', async () => {
      const mockSearch = vi.fn().mockResolvedValue([]);

      const plugin: RagPluginDescriptor = {
        name: 'Test',
        source: 'test',
        version: '1.0.0',
        fetcher: {
          list: vi.fn(),
          search: mockSearch,
          fetch: vi.fn(),
          healthCheck: vi.fn(),
        },
        capabilities: {
          list: false,
          search: true,
          filter: false,
          fetch: false,
          transform: false,
        },
      };

      registry.register('test', plugin);

      const params: RagSearchParams = {
        query: 'test query',
        limit: 10,
      };

      await factory.aggregateContent(['test'], params);

      expect(mockSearch).toHaveBeenCalledWith(params);
    });
  });

  describe('healthCheckAll()', () => {
    it('should run health checks on all plugins', async () => {
      factory.initializeStandardPlugins();

      const results = await factory.healthCheckAll();

      expect(results.size).toBe(2); // note and local
      expect(results.get('note')).toBeDefined();
      expect(results.get('local')).toBeDefined();
    });

    it('should return empty map if no plugins registered', async () => {
      const results = await factory.healthCheckAll();

      expect(results.size).toBe(0);
    });
  });
});
