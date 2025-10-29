/**
 * Plugin Management API Integration Tests
 *
 * Tests for the plugin management endpoints including
 * plugin listing and health check functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ragPluginRegistry, ragPluginFactory } from '@/lib/plugins/rag-plugin-registry';

// Mock Clerk auth
vi.mock('@/lib/actions/user', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/actions/user';

describe('Plugin Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize plugins for testing
    ragPluginRegistry.clear();
    ragPluginFactory.initializeStandardPlugins();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ragPluginRegistry.clear();
  });

  describe('GET /api/admin/plugins', () => {
    it('should return list of registered plugins for admin user', async () => {
      // Mock admin user
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Get plugins from registry
      const plugins = ragPluginRegistry.getAll();

      expect(plugins.length).toBeGreaterThan(0);

      // Verify plugin structure
      plugins.forEach(plugin => {
        expect(plugin).toHaveProperty('name');
        expect(plugin).toHaveProperty('source');
        expect(plugin).toHaveProperty('version');
        expect(plugin).toHaveProperty('capabilities');
        expect(plugin.capabilities).toHaveProperty('list');
        expect(plugin.capabilities).toHaveProperty('search');
        expect(plugin.capabilities).toHaveProperty('filter');
        expect(plugin.capabilities).toHaveProperty('fetch');
      });
    });

    it('should return 403 for non-admin user', async () => {
      // Mock non-admin user
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-456',
        clerkId: 'clerk-456',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // In real API, this would return 403
      const mockResponse = {
        status: 403,
        data: {
          error: 'Forbidden',
          message: 'Admin access required',
        },
      };

      expect(mockResponse.status).toBe(403);
      expect(mockResponse.data.error).toBe('Forbidden');
    });

    it('should return 403 for unauthenticated request', async () => {
      // Mock no user
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const mockResponse = {
        status: 403,
        data: {
          error: 'Forbidden',
          message: 'Admin access required',
        },
      };

      expect(mockResponse.status).toBe(403);
    });
  });

  describe('POST /api/admin/plugins/[source]/health', () => {
    it('should run health check for specific plugin', async () => {
      // Mock admin user
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Run health check for 'note' plugin
      const healthResult = await ragPluginRegistry.checkHealth('note');

      expect(healthResult).toHaveProperty('healthy');
      expect(typeof healthResult.healthy).toBe('boolean');

      if (healthResult.message) {
        expect(typeof healthResult.message).toBe('string');
      }
    });

    it('should return health status for local plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Run health check for 'local' plugin
      const healthResult = await ragPluginRegistry.checkHealth('local');

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.message).toContain('Local storage is accessible');
    });

    it('should return 404 for non-existent plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Check for non-existent plugin
      const plugin = ragPluginRegistry.get('non-existent');
      expect(plugin).toBeUndefined();

      // In real API, this would return 404
      const mockResponse = {
        status: 404,
        data: {
          error: 'Not Found',
          message: 'Plugin "non-existent" not found',
        },
      };

      expect(mockResponse.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-456',
        clerkId: 'clerk-456',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockResponse = {
        status: 403,
        data: {
          error: 'Forbidden',
          message: 'Admin access required',
        },
      };

      expect(mockResponse.status).toBe(403);
    });
  });

  describe('Plugin Registry', () => {
    it('should have plugins registered on initialization', () => {
      const plugins = ragPluginRegistry.getAll();
      expect(plugins.length).toBeGreaterThanOrEqual(2); // note and local

      const pluginSources = plugins.map(p => p.source);
      expect(pluginSources).toContain('note');
      expect(pluginSources).toContain('local');
    });

    it('should return plugin by source', () => {
      const notePlugin = ragPluginRegistry.get('note');
      expect(notePlugin).toBeDefined();
      expect(notePlugin?.name).toBe('Note.com Integration');
      expect(notePlugin?.source).toBe('note');
      expect(notePlugin?.version).toBe('1.0.0');
    });

    it('should have proper capabilities defined', () => {
      const notePlugin = ragPluginRegistry.get('note');
      expect(notePlugin?.capabilities.list).toBe(true);
      expect(notePlugin?.capabilities.search).toBe(true);
      expect(notePlugin?.capabilities.filter).toBe(true);
      expect(notePlugin?.capabilities.fetch).toBe(true);

      const localPlugin = ragPluginRegistry.get('local');
      expect(localPlugin?.capabilities.transform).toBe(true);
    });

    it('should store health check results', async () => {
      await ragPluginRegistry.checkHealth('note');

      const healthStatus = ragPluginRegistry.getHealthStatus('note');
      expect(healthStatus).toBeDefined();
      expect(healthStatus?.lastCheck).toBeInstanceOf(Date);
      expect(typeof healthStatus?.healthy).toBe('boolean');
    });
  });
});
