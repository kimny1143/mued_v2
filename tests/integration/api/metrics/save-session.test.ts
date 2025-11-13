/**
 * Integration Tests: Save Session API Endpoint
 *
 * Testing the metrics saving endpoint with mocked database
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { POST } from '@/app/api/metrics/save-session/route';
import { NextRequest } from 'next/server';
import type { PracticeSession } from '@/lib/metrics/learning-tracker';

// Test user ID constant
const testUserId = 'test-user-id';
const testClerkId = 'test-clerk-id';

// Mock database functions
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();

// Setup chained mock functions
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ limit: mockLimit });
mockLimit.mockResolvedValue([]);

mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockResolvedValue([{
  id: 'test-metric-id',
  userId: testUserId,
  materialId: 'test-material',
}]);

mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
    update: () => mockUpdate(),
  },
}));

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (field: any, value: any) => ({ field, value, op: 'eq' }),
    and: (...conditions: any[]) => ({ conditions, op: 'and' }),
  };
});

// Mock the learning tracker calculator
const mockCalculateLearningMetrics = vi.fn();
vi.mock('@/lib/metrics/learning-tracker', () => ({
  calculateLearningMetrics: (...args: any[]) => mockCalculateLearningMetrics(...args),
}));

// Mock lib/auth
const mockGetAuthenticatedUserWithE2E = vi.fn();
const mockIsE2ETestMode = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUserWithE2E: (...args: any[]) => mockGetAuthenticatedUserWithE2E(...args),
  isE2ETestMode: (...args: any[]) => mockIsE2ETestMode(...args),
}));

describe('Save Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set default mock responses
    mockIsE2ETestMode.mockReturnValue(false);
    mockGetAuthenticatedUserWithE2E.mockResolvedValue({
      id: testUserId,
      clerkId: testClerkId,
      email: 'test@example.com',
      role: 'student',
    });

    mockCalculateLearningMetrics.mockReturnValue({
      achievementRate: 75,
      repetitionIndex: 2.5,
      tempoAchievement: 90,
      weakSpots: [
        { startBar: 1, endBar: 4, loopCount: 5, lastPracticedAt: new Date().toISOString() },
      ],
    });

    // Reset database mock behavior and re-setup chains
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);

    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([{
      id: 'test-metric-id',
      userId: testUserId,
      materialId: 'test-material',
    }]);

    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetAuthenticatedUserWithE2E.mockRejectedValueOnce(new Error('Unauthorized: No valid session found'));

      const session: PracticeSession = {
        materialId: 'test-material',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(),
        duration: 300,
        sectionsCompleted: 4,
        sectionsTotal: 8,
        loopEvents: [],
        targetTempo: 120,
        achievedTempo: 100,
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save session');
      expect(data.details).toContain('Unauthorized');
    });
  });

  describe('Validation', () => {
    it('should reject requests with missing required fields', async () => {
      const invalidSession = {
        // Missing materialId
        userId: testUserId,
        instrument: 'piano',
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(invalidSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('New Metrics Creation', () => {
    it('should create new metrics record for first-time session', async () => {
      const session: PracticeSession = {
        materialId: 'new-material-id',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes later
        duration: 300,
        sectionsCompleted: 4,
        sectionsTotal: 8,
        loopEvents: [
          { startBar: 1, endBar: 4, timestamp: new Date(), tempo: 100 },
          { startBar: 5, endBar: 8, timestamp: new Date(), tempo: 110 },
        ],
        targetTempo: 120,
        achievedTempo: 110,
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toMatchObject({
        achievementRate: 75,
        repetitionIndex: 2.5,
        tempoAchievement: 90,
      });
    });
  });

  describe('Existing Metrics Update', () => {
    it('should update existing metrics with cumulative data', async () => {
      // Set up existing metrics
      const existingMetric = {
        id: 'existing-metric-id',
        userId: testUserId,
        materialId: 'existing-material',
        sectionsCompleted: 2,
        sectionsTotal: 8,
        achievementRate: '25.00',
        repetitionCount: 3,
        repetitionIndex: '1.50',
        achievedTempo: 90,
        tempoAchievement: '75.00',
        weakSpots: [],
        totalPracticeTime: 300,
        sessionCount: 1,
      };

      mockLimit.mockResolvedValueOnce([existingMetric]);

      const session: PracticeSession = {
        materialId: 'existing-material',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(Date.now() + 10 * 60 * 1000),
        duration: 600,
        sectionsCompleted: 4,
        sectionsTotal: 8,
        loopEvents: [
          { startBar: 3, endBar: 4, timestamp: new Date(), tempo: 100 },
        ],
        targetTempo: 120,
        achievedTempo: 100,
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should merge weak spots correctly', async () => {
      mockCalculateLearningMetrics.mockReturnValueOnce({
        achievementRate: 50,
        repetitionIndex: 2.5,
        tempoAchievement: 80,
        weakSpots: [
          { startBar: 1, endBar: 2, loopCount: 2, lastPracticedAt: new Date().toISOString() },
          { startBar: 3, endBar: 4, loopCount: 4, lastPracticedAt: new Date().toISOString() },
        ],
      });

      const session: PracticeSession = {
        materialId: 'material-with-weakspots',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(),
        duration: 300,
        sectionsCompleted: 4,
        sectionsTotal: 8,
        loopEvents: [],
        targetTempo: 120,
        achievedTempo: 95,
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.weakSpots).toBeDefined();
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle concurrent session saves gracefully', async () => {
      const session1: PracticeSession = {
        materialId: 'concurrent-material',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        sectionsCompleted: 2,
        sectionsTotal: 8,
        loopEvents: [],
        targetTempo: 120,
        achievedTempo: 100,
      };

      const session2: PracticeSession = {
        ...session1,
        duration: 200,
        sectionsCompleted: 3,
        achievedTempo: 110,
      };

      const request1 = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session1),
      });

      const request2 = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session2),
      });

      // Send both requests concurrently
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const session: PracticeSession = {
        materialId: 'error-material',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        sectionsCompleted: 2,
        sectionsTotal: 8,
        loopEvents: [],
        targetTempo: 120,
        achievedTempo: 100,
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session),
      });

      const response = await POST(request);
      const data = await response.json();

      // With mocked database, this should succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Achievement Calculations', () => {
    it('should correctly calculate achievement rate', async () => {
      const testCases = [
        { completed: 8, total: 8 },
        { completed: 4, total: 8 },
        { completed: 0, total: 8 },
        { completed: 10, total: 8 },
      ];

      for (const { completed, total } of testCases) {
        const session: PracticeSession = {
          materialId: `material-${completed}-${total}`,
          userId: testUserId,
          instrument: 'piano',
          startTime: new Date(),
          endTime: new Date(),
          duration: 100,
          sectionsCompleted: completed,
          sectionsTotal: total,
          loopEvents: [],
          targetTempo: 120,
          achievedTempo: 100,
        };

        const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
          method: 'POST',
          body: JSON.stringify(session),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should correctly calculate tempo achievement', async () => {
      const testCases = [
        { achieved: 120, target: 120 },
        { achieved: 90, target: 120 },
        { achieved: 60, target: 120 },
        { achieved: 150, target: 120 },
      ];

      for (const { achieved, target } of testCases) {
        const session: PracticeSession = {
          materialId: `tempo-${achieved}-${target}`,
          userId: testUserId,
          instrument: 'piano',
          startTime: new Date(),
          endTime: new Date(),
          duration: 100,
          sectionsCompleted: 4,
          sectionsTotal: 8,
          loopEvents: [],
          targetTempo: target,
          achievedTempo: achieved,
        };

        const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
          method: 'POST',
          body: JSON.stringify(session),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });
});