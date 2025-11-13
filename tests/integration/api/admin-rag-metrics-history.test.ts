/**
 * RAG Metrics History API Tests
 * Phase 2: Historical metrics data retrieval
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/admin/rag-metrics/history/route';

// Mock Clerk authentication
const mockAuth = vi.fn();

vi.mock('@clerk/nextjs/server', async () => {
  const actual = await vi.importActual('@clerk/nextjs/server');
  return {
    ...actual,
    auth: () => mockAuth(),
  };
});

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/lib/actions/user', () => ({
  getCurrentUser: vi.fn(),
}));

describe('RAG Metrics History API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup admin auth mock - must match withAdminAuth's sessionClaims structure
    mockAuth.mockReturnValue({
      userId: 'admin-123',
      sessionClaims: {
        metadata: { role: 'admin' }
      }
    });
  });

  describe('GET /api/admin/rag-metrics/history', () => {
    it('should return historical metrics for default 7 days', async () => {
      const mockMetrics = [
        {
          date: new Date('2025-01-20'),
          citationRate: 75.5,
          latencyP50Ms: 1200,
          latencyP95Ms: 2500,
          costPerAnswer: 2.5,
          totalQueries: 150,
          uniqueUsers: 45,
          positiveVotes: 120,
          sloCompliance: { overallMet: true },
        },
        {
          date: new Date('2025-01-21'),
          citationRate: 78.2,
          latencyP50Ms: 1150,
          latencyP95Ms: 2400,
          costPerAnswer: 2.3,
          totalQueries: 160,
          uniqueUsers: 48,
          positiveVotes: 130,
          sloCompliance: { overallMet: true },
        },
      ];

      const { db } = await import('@/db');
      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockMetrics),
      };
      const mockOrderBy = vi.fn().mockReturnValue(mockQuery);
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: mockOrderBy,
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(2);
      expect(data.history[0].citationRate).toBe(75.5);
      expect(data.summary).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it('should support custom period (30 days)', async () => {
      const mockMetrics = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(`2025-01-${i + 1}`),
        citationRate: 70 + Math.random() * 10,
        latencyP50Ms: 1000 + Math.random() * 500,
        latencyP95Ms: 2000 + Math.random() * 1000,
        costPerAnswer: 2 + Math.random(),
        totalQueries: 100 + Math.floor(Math.random() * 50),
        uniqueUsers: 30 + Math.floor(Math.random() * 20),
        positiveVotes: 80 + Math.floor(Math.random() * 30),
        sloCompliance: { overallMet: true },
      }));

      const { db } = await import('@/db');
      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockMetrics),
      };
      const mockOrderBy = vi.fn().mockReturnValue(mockQuery);
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: mockOrderBy,
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history?limit=30'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history.length).toBeGreaterThan(0);
    });

    it('should return empty array when no data', async () => {
      const { db } = await import('@/db');
      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };
      const mockOrderBy = vi.fn().mockReturnValue(mockQuery);
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: mockOrderBy,
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toEqual([]);
    });

    it('should require authentication', async () => {
      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue(null as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should validate period parameter', async () => {
      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history?limit=invalid'),
      } as any;

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
    });
  });

  describe('Data Formatting', () => {
    it('should return metrics in chronological order', async () => {
      const mockMetrics = [
        { date: new Date('2025-01-18'), citationRate: 70, latencyP50Ms: 1000, latencyP95Ms: 2000, costPerAnswer: 2, totalQueries: 100, uniqueUsers: 30, positiveVotes: 80, sloCompliance: { overallMet: true } },
        { date: new Date('2025-01-19'), citationRate: 72, latencyP50Ms: 1100, latencyP95Ms: 2100, costPerAnswer: 2.1, totalQueries: 110, uniqueUsers: 32, positiveVotes: 85, sloCompliance: { overallMet: true } },
        { date: new Date('2025-01-20'), citationRate: 75, latencyP50Ms: 1200, latencyP95Ms: 2200, costPerAnswer: 2.2, totalQueries: 120, uniqueUsers: 35, positiveVotes: 90, sloCompliance: { overallMet: true } },
      ];

      const { db } = await import('@/db');
      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockMetrics),
      };
      const mockOrderBy = vi.fn().mockReturnValue(mockQuery);
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: mockOrderBy,
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      const dates = data.history.map((m: any) => new Date(m.date).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b)); // Ascending order
    });

    it('should include all required metric fields', async () => {
      const mockMetrics = [{
        date: new Date('2025-01-20'),
        citationRate: 75.5,
        latencyP50Ms: 1200,
        latencyP95Ms: 2500,
        costPerAnswer: 2.5,
        totalQueries: 150,
        uniqueUsers: 45,
        positiveVotes: 120,
        sloCompliance: { overallMet: true },
      }];

      const { db } = await import('@/db');
      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockMetrics),
      };
      const mockOrderBy = vi.fn().mockReturnValue(mockQuery);
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: mockOrderBy,
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      const { getCurrentUser } = await import('@/lib/actions/user');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      } as any);

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      const metric = data.history[0];
      expect(metric).toHaveProperty('date');
      expect(metric).toHaveProperty('citationRate');
      expect(metric).toHaveProperty('latencyP50Ms');
      expect(metric).toHaveProperty('latencyP95Ms');
      expect(metric).toHaveProperty('costPerAnswer');
      expect(metric).toHaveProperty('totalQueries');
      expect(metric).toHaveProperty('uniqueUsers');
      expect(metric).toHaveProperty('positiveVotes');
    });
  });
});
