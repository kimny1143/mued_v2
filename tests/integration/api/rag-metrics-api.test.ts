/**
 * RAG Metrics Admin API Integration Tests
 *
 * Tests for the admin RAG metrics endpoint including SLO monitoring,
 * trends analysis, and historical data retrieval.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/rag-metrics/route';

// Mock database functions
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

// Setup chained mock functions
const setupMockChain = () => {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({
    orderBy: mockOrderBy,
    limit: mockLimit
  });
  mockOrderBy.mockReturnValue({
    limit: mockLimit,
    offset: mockOffset
  });
  mockLimit.mockReturnValue({ offset: mockOffset });
};

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: (fields?: any) => mockSelect(fields),
  },
}));

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: (field: any, value: any) => ({ field, value, op: 'eq' }),
  and: (...conditions: any[]) => ({ conditions, op: 'and' }),
  gte: (field: any, value: any) => ({ field, value, op: 'gte' }),
  lte: (field: any, value: any) => ({ field, value, op: 'lte' }),
  desc: (field: any) => ({ field, op: 'desc' }),
  sql: (query: any) => query,
  count: () => 'COUNT(*)',
  avg: (field: any) => `AVG(${field})`,
}));

// Mock the schema
vi.mock('@/db/schema/rag-metrics', () => ({
  aiDialogueLog: {
    createdAt: 'createdAt',
    citationRate: 'citationRate',
    latencyMs: 'latencyMs',
    tokenCostJpy: 'tokenCostJpy',
    relevanceScore: 'relevanceScore',
  },
  ragMetricsHistory: {
    date: 'date',
    citationRate: 'citationRate',
    latencyP50Ms: 'latencyP50Ms',
    latencyP95Ms: 'latencyP95Ms',
    costPerAnswer: 'costPerAnswer',
    totalQueries: 'totalQueries',
    successRate: 'successRate',
  },
}));

// Mock Clerk authentication
const mockAuth = vi.fn();
const mockGetUserById = vi.fn();

vi.mock('@clerk/nextjs/server', async () => {
  const actual = await vi.importActual('@clerk/nextjs/server');
  return {
    ...actual,
    auth: () => mockAuth(),
    clerkClient: () => ({
      users: {
        getUser: mockGetUserById,
      },
    }),
  };
});

describe('Admin RAG Metrics API', () => {
  const sampleHistoryData = [
    {
      id: 'history-1',
      date: new Date('2024-01-15'),
      citationRate: '75.5',
      latencyP50Ms: '1200',
      latencyP95Ms: '2500',
      costPerAnswer: '2.8',
      totalQueries: 1500,
      successRate: '98.5',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'history-2',
      date: new Date('2024-01-14'),
      citationRate: '72.3',
      latencyP50Ms: '1300',
      latencyP95Ms: '2600',
      costPerAnswer: '2.9',
      totalQueries: 1450,
      successRate: '97.8',
      createdAt: new Date('2024-01-14T10:00:00Z'),
      updatedAt: new Date('2024-01-14T10:00:00Z'),
    },
    {
      id: 'history-3',
      date: new Date('2024-01-13'),
      citationRate: '73.8',
      latencyP50Ms: '1250',
      latencyP95Ms: '2550',
      costPerAnswer: '2.85',
      totalQueries: 1480,
      successRate: '98.2',
      createdAt: new Date('2024-01-13T10:00:00Z'),
      updatedAt: new Date('2024-01-13T10:00:00Z'),
    },
  ];

  const sampleMetricsData = [
    {
      totalQueries: 100,
      avgCitationRate: '75.5',
      avgLatencyMs: '1250',
      avgCostJpy: '2.85',
      avgRelevanceScore: '88.5',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockChain();

    // Default mock returns - must match withAdminAuth's sessionClaims structure
    mockAuth.mockReturnValue({
      userId: 'admin-user-123',
      sessionClaims: {
        metadata: { role: 'admin' }
      }
    });
    mockGetUserById.mockResolvedValue({
      id: 'admin-user-123',
      publicMetadata: { role: 'admin' },
    });
  });

  describe('GET /api/admin/rag-metrics', () => {
    it('should fetch metrics and SLO status for authenticated admin', async () => {
      // Setup mock data
      mockSelect.mockImplementation((fields) => {
        if (fields) {
          // This is the metrics query
          const result = {
            from: () => ({
              where: () => Promise.resolve(sampleMetricsData)
            })
          };
          return result;
        }
        // This is the history query
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(sampleHistoryData);

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('metrics');
      expect(data.data).toHaveProperty('sloStatus');
      expect(data.data).toHaveProperty('trends');
      expect(data.data).toHaveProperty('history');
    });

    it('should calculate correct SLO compliance status', async () => {
      const metricsWithGoodSLO = [
        {
          totalQueries: 100,
          avgCitationRate: '75.0', // Above 70% target
          avgLatencyMs: '1400',    // Below 1500ms target
          avgCostJpy: '2.5',        // Below ¥3.0 target
          avgRelevanceScore: '85.0',
        },
      ];

      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve(metricsWithGoodSLO)
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(sampleHistoryData);

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sloStatus.citationRate.met).toBe(true);
      expect(data.data.sloStatus.latency.met).toBe(true);
      expect(data.data.sloStatus.cost.met).toBe(true);
      expect(data.data.sloStatus.overallMet).toBe(true);
    });

    it('should identify SLO violations', async () => {
      const metricsWithBadSLO = [
        {
          totalQueries: 100,
          avgCitationRate: '65.0', // Below 70% target
          avgLatencyMs: '1600',    // Above 1500ms target
          avgCostJpy: '3.5',        // Above ¥3.0 target
          avgRelevanceScore: '85.0',
        },
      ];

      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve(metricsWithBadSLO)
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(sampleHistoryData);

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sloStatus.citationRate.met).toBe(false);
      expect(data.data.sloStatus.latency.met).toBe(false);
      expect(data.data.sloStatus.cost.met).toBe(false);
      expect(data.data.sloStatus.overallMet).toBe(false);
    });

    it('should calculate trends for the last 7 days vs previous 7 days', async () => {
      // Create 14 days of history data
      const last14DaysHistory = Array.from({ length: 14 }, (_, i) => ({
        id: `history-${i}`,
        date: new Date(`2024-01-${30 - i}`),
        citationRate: String(70 + i * 0.5), // Improving trend
        latencyP50Ms: String(1500 - i * 10), // Improving trend
        costPerAnswer: String(3.0 - i * 0.05), // Improving trend
        totalQueries: 1500 + i * 10,
        successRate: String(98 + i * 0.1),
        createdAt: new Date(`2024-01-${30 - i}T10:00:00Z`),
        updatedAt: new Date(`2024-01-${30 - i}T10:00:00Z`),
      }));

      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve(sampleMetricsData)
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(last14DaysHistory);

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.trends.citationRate).toHaveProperty('current');
      expect(data.data.trends.citationRate).toHaveProperty('previous');
      expect(data.data.trends.citationRate).toHaveProperty('change');

      // Verify positive trend (improvement)
      expect(data.data.trends.citationRate.current).toBeGreaterThan(
        data.data.trends.citationRate.previous
      );
    });

    it('should filter metrics by date range', async () => {
      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve(sampleMetricsData)
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(sampleHistoryData.slice(0, 2));

      const request = new NextRequest(
        'http://localhost:3000/api/admin/rag-metrics?startDate=2024-01-14T00:00:00Z&endDate=2024-01-15T23:59:59Z',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toHaveLength(2);
    });

    it('should support pagination with limit and offset', async () => {
      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve(sampleMetricsData)
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(sampleHistoryData.slice(1, 2));

      const request = new NextRequest(
        'http://localhost:3000/api/admin/rag-metrics?limit=1&offset=1',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        limit: 1,
        offset: 1,
        total: 1,
      });
    });

    it('should return 401 for non-admin users', async () => {
      mockAuth.mockReturnValue({ userId: 'regular-user-123' });
      mockGetUserById.mockResolvedValue({
        id: 'regular-user-123',
        publicMetadata: { role: 'student' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/rag-metrics?limit=5000&offset=-1',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('should handle invalid date formats', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/rag-metrics?startDate=invalid-date',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('should handle database errors gracefully', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });

    it('should handle empty results gracefully', async () => {
      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve([{
                totalQueries: 0,
                avgCitationRate: null,
                avgLatencyMs: null,
                avgCostJpy: null,
                avgRelevanceScore: null,
              }])
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics.totalQueries).toBe(0);
      expect(data.data.history).toHaveLength(0);
      expect(data.data.sloStatus.overallMet).toBe(false);
    });

    it('should calculate trends even with partial data', async () => {
      // Only 5 days of history
      const partialHistory = sampleHistoryData.slice(0, 5);

      mockSelect.mockImplementation((fields) => {
        if (fields) {
          return {
            from: () => ({
              where: () => Promise.resolve(sampleMetricsData)
            })
          };
        }
        return { from: mockFrom };
      });

      mockOffset.mockResolvedValue(partialHistory);

      const request = new NextRequest('http://localhost:3000/api/admin/rag-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.trends).toBeDefined();
      expect(data.data.trends.citationRate.current).toBeGreaterThanOrEqual(0);
    });
  });
});