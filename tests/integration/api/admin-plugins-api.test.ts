/**
 * Admin Plugin Management API Tests
 * Phase 2: Plugin registration, health check, and management endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/admin/plugins/route';
import { GET as HealthCheckGET } from '@/app/api/admin/plugins/[source]/health/route';

// Mock dependencies
vi.mock('@/lib/plugins/rag-plugin-registry', () => ({
  ragPluginRegistry: {
    getAll: vi.fn(),
    get: vi.fn(),
    checkHealth: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(),
}));

describe('Admin Plugins API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/plugins', () => {
    it('should return all registered plugins', async () => {
      const mockPlugins = [
        {
          name: 'Note.com Integration',
          source: 'note',
          version: '1.0.0',
          capabilities: {
            list: true,
            search: true,
            filter: true,
            fetch: true,
            transform: false,
          },
          apiEndpoint: 'https://note.com/api/v2',
        },
        {
          name: 'Local Materials',
          source: 'local',
          version: '1.0.0',
          capabilities: {
            list: true,
            search: true,
            filter: true,
            fetch: true,
            transform: true,
          },
        },
      ];

      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.getAll).mockReturnValue(mockPlugins as any);

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugins).toHaveLength(2);
      expect(data.plugins[0].name).toBe('Note.com Integration');
      expect(data.plugins[1].name).toBe('Local Materials');
    });

    it('should return empty array when no plugins registered', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.getAll).mockReturnValue([]);

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugins).toEqual([]);
    });

    it('should require authentication', async () => {
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: null } as any);

      const response = await GET();

      expect(response.status).toBe(401);
    });

    it('should include plugin health status if available', async () => {
      const mockPlugins = [
        {
          name: 'Test Plugin',
          source: 'test',
          version: '1.0.0',
          capabilities: {
            list: true,
            search: false,
            filter: false,
            fetch: false,
            transform: false,
          },
        },
      ];

      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.getAll).mockReturnValue(mockPlugins as any);
      vi.mocked(ragPluginRegistry.get).mockReturnValue(mockPlugins[0] as any);

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugins).toHaveLength(1);
    });
  });

  describe('POST /api/admin/plugins', () => {
    it('should register a new plugin', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      const registerMock = vi.mocked(ragPluginRegistry.register);

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {
        json: async () => ({
          source: 'custom',
          name: 'Custom Plugin',
          version: '1.0.0',
          capabilities: {
            list: true,
            search: false,
            filter: false,
            fetch: true,
            transform: false,
          },
        }),
      } as any;

      const response = await POST(mockRequest);

      expect(response.status).toBe(201);
      expect(registerMock).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {
        json: async () => ({
          source: 'custom',
          // Missing name, version, capabilities
        }),
      } as any;

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: null } as any);

      const mockRequest = {
        json: async () => ({ source: 'test' }),
      } as any;

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should handle registration errors', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.register).mockImplementation(() => {
        throw new Error('Registration failed');
      });

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {
        json: async () => ({
          source: 'invalid',
          name: 'Invalid',
          version: '1.0.0',
          capabilities: { list: false, search: false, filter: false, fetch: false, transform: false },
        }),
      } as any;

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/admin/plugins/[source]/health', () => {
    it('should check plugin health', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.checkHealth).mockResolvedValue({
        healthy: true,
        message: 'All systems operational',
      });

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {} as any;
      const mockParams = { params: { source: 'note' } };

      const response = await HealthCheckGET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.healthy).toBe(true);
      expect(data.message).toBe('All systems operational');
    });

    it('should return unhealthy status on failure', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.checkHealth).mockResolvedValue({
        healthy: false,
        message: 'Connection timeout',
      });

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {} as any;
      const mockParams = { params: { source: 'note' } };

      const response = await HealthCheckGET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.healthy).toBe(false);
      expect(data.message).toContain('timeout');
    });

    it('should handle non-existent plugins', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.checkHealth).mockResolvedValue({
        healthy: false,
        message: 'Plugin not found',
      });

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {} as any;
      const mockParams = { params: { source: 'non-existent' } };

      const response = await HealthCheckGET(mockRequest, mockParams);

      expect(response.status).toBe(200); // Still 200, but unhealthy status
    });

    it('should require authentication', async () => {
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: null } as any);

      const mockRequest = {} as any;
      const mockParams = { params: { source: 'note' } };

      const response = await HealthCheckGET(mockRequest, mockParams);

      expect(response.status).toBe(401);
    });
  });

  describe('Plugin Configuration', () => {
    it('should support custom configuration', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      const registerMock = vi.mocked(ragPluginRegistry.register);

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {
        json: async () => ({
          source: 'custom',
          name: 'Custom Plugin',
          version: '1.0.0',
          capabilities: {
            list: true,
            search: true,
            filter: false,
            fetch: true,
            transform: false,
          },
          config: {
            apiKey: 'test-key',
            baseUrl: 'https://api.example.com',
            timeout: 5000,
          },
        }),
      } as any;

      await POST(mockRequest);

      expect(registerMock).toHaveBeenCalledWith(
        'custom',
        expect.objectContaining({
          config: expect.objectContaining({
            apiKey: 'test-key',
            baseUrl: 'https://api.example.com',
          }),
        })
      );
    });

    it('should validate capability flags', async () => {
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {
        json: async () => ({
          source: 'invalid',
          name: 'Invalid',
          version: '1.0.0',
          capabilities: {
            list: 'yes', // Should be boolean
            search: false,
            filter: false,
            fetch: false,
            transform: false,
          },
        }),
      } as any;

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle registry errors gracefully', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.getAll).mockImplementation(() => {
        throw new Error('Registry error');
      });

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const response = await GET();

      expect(response.status).toBe(500);
    });

    it('should handle health check errors', async () => {
      const { ragPluginRegistry } = await import('@/lib/plugins/rag-plugin-registry');
      vi.mocked(ragPluginRegistry.checkHealth).mockRejectedValue(
        new Error('Health check failed')
      );

      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValue({ userId: 'admin-123' } as any);

      const mockRequest = {} as any;
      const mockParams = { params: { source: 'note' } };

      const response = await HealthCheckGET(mockRequest, mockParams);

      expect(response.status).toBe(500);
    });
  });
});
