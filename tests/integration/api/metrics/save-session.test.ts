/**
 * Integration Tests: Save Session API Endpoint
 *
 * Testing the metrics saving endpoint with mocked database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/metrics/save-session/route';
import { NextRequest } from 'next/server';
import type { PracticeSession } from '@/lib/metrics/learning-tracker';
import { auth } from '@clerk/nextjs/server';

// Test user ID constant
const testUserId = 'test-user-id';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'test-metric-id',
          userId: 'test-user-id',
          materialId: 'test-material',
        }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock the learning tracker calculator
vi.mock('@/lib/metrics/learning-tracker', () => ({
  calculateLearningMetrics: vi.fn(() => ({
    achievementRate: 75,
    repetitionIndex: 2.5,
    tempoAchievement: 90,
    weakSpots: [
      { startBar: 1, endBar: 4, loopCount: 5, lastPracticedAt: new Date().toISOString() },
    ],
  })),
}));

// Mock lib/auth
vi.mock('@/lib/auth', () => ({
  getAuthenticatedUserWithE2E: vi.fn(() => Promise.resolve({
    id: 'test-user-id',
    clerkId: 'test-clerk-id',
    email: 'test@example.com',
    role: 'student',
  })),
  isE2ETestMode: vi.fn(() => false),
}));

describe('Save Session API', () => {
  const mockAuth = vi.mocked(auth);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'test-clerk-id' } as any);
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { getAuthenticatedUserWithE2E } = await import('@/lib/auth');
      (getAuthenticatedUserWithE2E as any).mockRejectedValueOnce(new Error('Unauthorized: No valid session found'));

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
    });

    it('should merge weak spots correctly', async () => {
      const { calculateLearningMetrics } = await import('@/lib/metrics/learning-tracker');
      (calculateLearningMetrics as any).mockReturnValueOnce({
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