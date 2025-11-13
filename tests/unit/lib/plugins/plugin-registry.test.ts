/**
 * Plugin Registry Unit Tests
 *
 * Tests for plugin registration and management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginRegistry } from '@/lib/plugins/plugin-registry';
import type { LoadedPlugin, PluginManifest, PluginConfig } from '@/types/plugin-system';
import { logger } from '@/lib/utils/logger';

// Mock DI decorators
vi.mock('@/lib/di', () => ({
  Injectable: () => (target: any) => target,
  Inject: () => () => {},
  TYPES: {
    PluginRegistry: Symbol('PluginRegistry'),
  },
}));

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin for unit testing',
    author: 'Test Author',
    license: 'MIT',
    runtime: {
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['API_KEY'],
      dependencies: { 'test-lib': '^1.0.0' },
    },
    capabilities: {
      supportsSearch: true,
      supportsFiltering: true,
      requiresAuth: false,
      cacheDuration: 3600,
      rateLimit: {
        requests: 100,
        period: 3600,
      },
    },
    entry: {
      fetcher: './fetcher',
      adapter: './adapter',
      validator: './validator',
    },
    configSchema: {
      type: 'object',
      properties: {
        apiUrl: { type: 'string' },
      },
    },
    permissions: {
      network: ['https://api.example.com'],
      fileSystem: 'read',
      env: ['API_KEY'],
    },
  };

  const mockPlugin: LoadedPlugin = {
    manifest: mockManifest,
    fetcher: {},
    adapter: {},
    validator: {},
    loadedAt: new Date('2024-01-15'),
    isActive: true,
  };

  beforeEach(() => {
    registry = new PluginRegistry();
    // Suppress logger.debug in tests (unless specifically testing for it)
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  describe('register()', () => {
    it('should register a plugin successfully', () => {
      registry.register(mockPlugin);

      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.get('test-plugin')).toEqual(mockPlugin);
    });

    it('should throw error when registering duplicate plugin', () => {
      registry.register(mockPlugin);

      expect(() => registry.register(mockPlugin)).toThrow(
        'Plugin test-plugin is already registered'
      );
    });

    it('should log registration message', () => {
      const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});

      registry.register(mockPlugin);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[PluginRegistry] Registered plugin: Test Plugin v1.0.0'
      );

      loggerSpy.mockRestore();
    });
  });

  describe('unregister()', () => {
    it('should unregister a plugin successfully', () => {
      registry.register(mockPlugin);
      const result = registry.unregister('test-plugin');

      expect(result).toBe(true);
      expect(registry.has('test-plugin')).toBe(false);
    });

    it('should return false when unregistering non-existent plugin', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should remove associated config when unregistering', () => {
      registry.register(mockPlugin);
      registry.setConfig('test-plugin', { enabled: true });

      registry.unregister('test-plugin');

      expect(registry.getConfig('test-plugin')).toBeUndefined();
    });

    it('should log unregistration message', () => {
      const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});

      registry.register(mockPlugin);
      registry.unregister('test-plugin');

      expect(loggerSpy).toHaveBeenCalledWith(
        '[PluginRegistry] Unregistered plugin: test-plugin'
      );

      loggerSpy.mockRestore();
    });
  });

  describe('get() and getAll()', () => {
    it('should get a plugin by ID', () => {
      registry.register(mockPlugin);

      expect(registry.get('test-plugin')).toEqual(mockPlugin);
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should get all registered plugins', () => {
      const secondPlugin: LoadedPlugin = {
        ...mockPlugin,
        manifest: { ...mockManifest, id: 'second-plugin' },
      };

      registry.register(mockPlugin);
      registry.register(secondPlugin);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(mockPlugin);
      expect(all).toContainEqual(secondPlugin);
    });
  });

  describe('getActive()', () => {
    it('should return only active plugins', () => {
      const inactivePlugin: LoadedPlugin = {
        ...mockPlugin,
        manifest: { ...mockManifest, id: 'inactive-plugin' },
        isActive: false,
      };

      registry.register(mockPlugin);
      registry.register(inactivePlugin);

      const active = registry.getActive();
      expect(active).toHaveLength(1);
      expect(active[0].manifest.id).toBe('test-plugin');
    });
  });

  describe('has()', () => {
    it('should check if plugin is registered', () => {
      registry.register(mockPlugin);

      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('setConfig() and getConfig()', () => {
    it('should set and get plugin configuration', () => {
      const config: PluginConfig = {
        enabled: true,
        config: { apiUrl: 'https://api.example.com' },
        overrides: { cacheDuration: 7200 },
      };

      registry.register(mockPlugin);
      registry.setConfig('test-plugin', config);

      expect(registry.getConfig('test-plugin')).toEqual(config);
    });

    it('should throw error when setting config for non-existent plugin', () => {
      expect(() =>
        registry.setConfig('non-existent', { enabled: true })
      ).toThrow('Plugin non-existent is not registered');
    });

    it('should update plugin active status based on config', () => {
      registry.register(mockPlugin);

      registry.setConfig('test-plugin', { enabled: false });
      expect(registry.get('test-plugin')?.isActive).toBe(false);

      registry.setConfig('test-plugin', { enabled: true });
      expect(registry.get('test-plugin')?.isActive).toBe(true);
    });
  });

  describe('getByCapability()', () => {
    it('should get plugins by capability', () => {
      const searchPlugin: LoadedPlugin = {
        ...mockPlugin,
        manifest: { ...mockManifest, id: 'search-plugin' },
      };

      const noSearchPlugin: LoadedPlugin = {
        ...mockPlugin,
        manifest: {
          ...mockManifest,
          id: 'no-search-plugin',
          capabilities: { ...mockManifest.capabilities, supportsSearch: false },
        },
      };

      registry.register(searchPlugin);
      registry.register(noSearchPlugin);

      const searchCapable = registry.getByCapability('supportsSearch');
      expect(searchCapable).toHaveLength(1);
      expect(searchCapable[0].manifest.id).toBe('search-plugin');
    });

    it('should only return active plugins', () => {
      const inactivePlugin: LoadedPlugin = {
        ...mockPlugin,
        manifest: { ...mockManifest, id: 'inactive' },
        isActive: false,
      };

      registry.register(mockPlugin);
      registry.register(inactivePlugin);

      const result = registry.getByCapability('supportsSearch');
      expect(result).toHaveLength(1);
      expect(result[0].manifest.id).toBe('test-plugin');
    });
  });

  describe('list()', () => {
    it('should list all plugin IDs', () => {
      const plugins = [
        mockPlugin,
        { ...mockPlugin, manifest: { ...mockManifest, id: 'plugin-2' } },
        { ...mockPlugin, manifest: { ...mockManifest, id: 'plugin-3' } },
      ];

      plugins.forEach(p => registry.register(p));

      const list = registry.list();
      expect(list).toEqual(['test-plugin', 'plugin-2', 'plugin-3']);
    });
  });

  describe('clear()', () => {
    it('should clear all plugins and configs', () => {
      registry.register(mockPlugin);
      registry.setConfig('test-plugin', { enabled: true });

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.getAll()).toHaveLength(0);
      expect(registry.getConfig('test-plugin')).toBeUndefined();
    });

    it('should log clear message', () => {
      const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});

      registry.clear();

      expect(loggerSpy).toHaveBeenCalledWith(
        '[PluginRegistry] Cleared all plugins'
      );

      loggerSpy.mockRestore();
    });
  });

  describe('count()', () => {
    it('should return the number of registered plugins', () => {
      expect(registry.count()).toBe(0);

      registry.register(mockPlugin);
      expect(registry.count()).toBe(1);

      const secondPlugin = {
        ...mockPlugin,
        manifest: { ...mockManifest, id: 'second' },
      };
      registry.register(secondPlugin);
      expect(registry.count()).toBe(2);
    });
  });

  describe('validateManifest()', () => {
    it('should validate a correct manifest', () => {
      const result = registry.validateManifest(mockManifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('Required fields validation', () => {
      it('should validate missing id', () => {
        const manifest = { ...mockManifest, id: '' };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: id');
      });

      it('should validate missing name', () => {
        const manifest = { ...mockManifest, name: '' };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: name');
      });

      it('should validate missing version', () => {
        const manifest = { ...mockManifest, version: '' };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: version');
      });

      it('should validate missing description', () => {
        const manifest = { ...mockManifest, description: '' };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: description');
      });

      it('should validate missing author', () => {
        const manifest = { ...mockManifest, author: '' };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: author');
      });

      it('should validate missing license', () => {
        const manifest = { ...mockManifest, license: '' };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: license');
      });
    });

    describe('Capabilities validation', () => {
      it('should validate missing capabilities', () => {
        const manifest = { ...mockManifest, capabilities: undefined as any };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: capabilities');
      });

      it('should validate capability types', () => {
        const manifest = {
          ...mockManifest,
          capabilities: {
            supportsSearch: 'yes' as any,
            supportsFiltering: 1 as any,
            requiresAuth: null as any,
            cacheDuration: '3600' as any,
          },
        };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('capabilities.supportsSearch must be boolean');
        expect(result.errors).toContain('capabilities.supportsFiltering must be boolean');
        expect(result.errors).toContain('capabilities.requiresAuth must be boolean');
        expect(result.errors).toContain('capabilities.cacheDuration must be number');
      });
    });

    describe('Entry points validation', () => {
      it('should validate missing entry', () => {
        const manifest = { ...mockManifest, entry: undefined as any };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: entry');
      });

      it('should validate missing fetcher', () => {
        const manifest = {
          ...mockManifest,
          entry: { ...mockManifest.entry, fetcher: '' },
        };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('entry.fetcher is required');
      });

      it('should validate missing adapter', () => {
        const manifest = {
          ...mockManifest,
          entry: { ...mockManifest.entry, adapter: '' },
        };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('entry.adapter is required');
      });
    });

    describe('Permissions validation', () => {
      it('should validate missing permissions', () => {
        const manifest = { ...mockManifest, permissions: undefined as any };
        const result = registry.validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: permissions');
      });
    });

    it('should collect multiple errors', () => {
      const manifest = {
        ...mockManifest,
        id: '',
        name: '',
        capabilities: undefined as any,
        entry: undefined as any,
        permissions: undefined as any,
      };
      const result = registry.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(4);
    });
  });
});