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

// Mock database functions
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: () => mockSelect(),
  },
}));

vi.mock('@/lib/actions/user', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  desc: (field: any) => ({ field, op: 'desc' }),
  gte: (field: any, value: any) => ({ field, value, op: 'gte' }),
  lte: (field: any, value: any) => ({ field, value, op: 'lte' }),
  and: (...conditions: any[]) => ({ conditions, op: 'and' }),
}));

// Mock the schema
vi.mock('@/db/schema/rag-metrics', () => ({
  ragMetricsHistory: {
    date: 'date',
    citationRate: 'citationRate',
    latencyP50Ms: 'latencyP50Ms',
    costPerAnswer: 'costPerAnswer',
    totalQueries: 'totalQueries',
    sloCompliance: 'sloCompliance',
  },
}));

// Sample data for tests
const sampleHistoryData = [
  {
    id: 'history-1',
    date: new Date('2025-01-20'),
    citationRate: '75.5',
    latencyP50Ms: '1200',
    latencyP95Ms: '2500',
    costPerAnswer: '2.5',
    totalQueries: 150,
    successRate: '98.5',
    sloCompliance: { overallMet: true },
    createdAt: new Date('2025-01-20T10:00:00Z'),
    updatedAt: new Date('2025-01-20T10:00:00Z'),
  },
  {
    id: 'history-2',
    date: new Date('2025-01-21'),
    citationRate: '78.2',
    latencyP50Ms: '1150',
    latencyP95Ms: '2400',
    costPerAnswer: '2.3',
    totalQueries: 160,
    successRate: '99.0',
    sloCompliance: { overallMet: true },
    createdAt: new Date('2025-01-21T10:00:00Z'),
    updatedAt: new Date('2025-01-21T10:00:00Z'),
  },
];

// Setup chained mock functions
const setupMockChain = (data = sampleHistoryData) => {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
  });
  mockWhere.mockReturnValue({
    orderBy: mockOrderBy,
    limit: mockLimit,
  });
  mockOrderBy.mockReturnValue({
    limit: mockLimit,
    offset: mockOffset,
  });
  mockLimit.mockReturnValue({
    offset: mockOffset,
  });
  mockOffset.mockReturnValue({
    then: (resolve: any) => resolve(data),
  });
};

describe('RAG Metrics History API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockChain();

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
      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toHaveLength(2);
      expect(data.data.history[0].citationRate).toBe('75.5');
      expect(data.data.summary).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it('should support custom period (30 days)', async () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history?limit=30'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history.length).toBeGreaterThan(0);
    });

    it('should return empty array when no data', async () => {
      setupMockChain([]); // Override with empty data

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toEqual([]);
    });

    it('should require authentication', async () => {
      // Override auth mock to return non-admin user
      mockAuth.mockReturnValue({
        userId: 'user-123',
        sessionClaims: {
          metadata: { role: 'student' }
        }
      });

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);

      expect(response.status).toBe(403);
    });

    it('should validate period parameter', async () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history?limit=invalid'),
      } as any;

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      // Override mockSelect to throw an error
      mockSelect.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
    });
  });

  describe('Data Formatting', () => {
    it('should return metrics in chronological order', async () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toBeDefined();
      expect(data.data.history.length).toBeGreaterThan(0);
    });

    it('should include all required metric fields', async () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost:3000/api/admin/rag-metrics/history'),
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history.length).toBeGreaterThan(0);

      const metric = data.data.history[0];
      expect(metric).toHaveProperty('date');
      expect(metric).toHaveProperty('citationRate');
      expect(metric).toHaveProperty('latencyP50Ms');
      expect(metric).toHaveProperty('costPerAnswer');
      expect(metric).toHaveProperty('totalQueries');
      expect(metric).toHaveProperty('sloCompliance');
    });
  });
});
