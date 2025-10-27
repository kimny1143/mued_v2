/**
 * Integration Tests: Save Session API Endpoint
 *
 * Testing the metrics saving endpoint with database integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/metrics/save-session/route';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { learningMetrics, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { PracticeSession } from '@/lib/metrics/learning-tracker';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-clerk-id' })),
}));

// Mock the learning tracker calculator
vi.mock('@/lib/metrics/learning-tracker', () => ({
  calculateLearningMetrics: vi.fn((session: any) => ({
    achievementRate: 75,
    repetitionIndex: 2.5,
    tempoAchievement: 90,
    weakSpots: [
      { startBar: 1, endBar: 4, loopCount: 5, lastPracticedAt: new Date().toISOString() },
    ],
  })),
}));

describe('Save Session API', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      clerkId: 'test-clerk-id',
      role: 'student',
    }).returning();

    testUserId = user.id;

    // Clean up any existing metrics for test user
    await db.delete(learningMetrics).where(eq(learningMetrics.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(learningMetrics).where(eq(learningMetrics.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      (auth as any).mockResolvedValueOnce({ userId: null });

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

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
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

      // Verify database record
      const [savedMetric] = await db
        .select()
        .from(learningMetrics)
        .where(eq(learningMetrics.userId, testUserId));

      expect(savedMetric).toBeDefined();
      expect(savedMetric.materialId).toBe('new-material-id');
      expect(savedMetric.sectionsCompleted).toBe(4);
      expect(savedMetric.achievementRate).toBe('75.00');
      expect(savedMetric.sessionCount).toBe(1);
    });
  });

  describe('Existing Metrics Update', () => {
    it('should update existing metrics with cumulative data', async () => {
      // Create initial metrics
      const [initialMetric] = await db.insert(learningMetrics).values({
        userId: testUserId,
        materialId: 'existing-material',
        sectionsCompleted: 2,
        sectionsTotal: 8,
        achievementRate: '25.00',
        repetitionCount: 3,
        repetitionIndex: '1.50',
        targetTempo: 120,
        achievedTempo: 90,
        tempoAchievement: '75.00',
        weakSpots: [
          { startBar: 1, endBar: 2, loopCount: 3, lastPracticedAt: new Date().toISOString() },
        ],
        totalPracticeTime: 180,
        instrument: 'piano',
        sessionCount: 1,
        lastPracticedAt: new Date(),
      }).returning();

      // New session data
      const session: PracticeSession = {
        materialId: 'existing-material',
        userId: testUserId,
        instrument: 'piano',
        startTime: new Date(),
        endTime: new Date(Date.now() + 10 * 60 * 1000),
        duration: 600,
        sectionsCompleted: 4, // Additional progress
        sectionsTotal: 8,
        loopEvents: [
          { startBar: 3, endBar: 4, timestamp: new Date(), tempo: 100 },
        ],
        targetTempo: 120,
        achievedTempo: 100, // Improved tempo
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/save-session', {
        method: 'POST',
        body: JSON.stringify(session),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify updated metrics
      const [updatedMetric] = await db
        .select()
        .from(learningMetrics)
        .where(eq(learningMetrics.id, initialMetric.id));

      expect(updatedMetric.sectionsCompleted).toBe(4); // Max of 2 and 4
      expect(updatedMetric.achievedTempo).toBe(100); // Max of 90 and 100
      expect(updatedMetric.totalPracticeTime).toBe(780); // 180 + 600
      expect(updatedMetric.sessionCount).toBe(2); // 1 + 1
      expect(updatedMetric.repetitionCount).toBe(4); // 3 + 1
    });

    it('should merge weak spots correctly', async () => {
      // Create initial metrics with weak spots
      await db.insert(learningMetrics).values({
        userId: testUserId,
        materialId: 'material-with-weakspots',
        sectionsCompleted: 2,
        sectionsTotal: 8,
        achievementRate: '25.00',
        repetitionCount: 5,
        repetitionIndex: '2.00',
        targetTempo: 120,
        achievedTempo: 90,
        tempoAchievement: '75.00',
        weakSpots: [
          { startBar: 1, endBar: 2, loopCount: 3, lastPracticedAt: new Date().toISOString() },
          { startBar: 5, endBar: 6, loopCount: 2, lastPracticedAt: new Date().toISOString() },
        ],
        totalPracticeTime: 180,
        instrument: 'piano',
        sessionCount: 1,
        lastPracticedAt: new Date(),
      });

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
      expect(response.status).toBe(200);

      const [updatedMetric] = await db
        .select()
        .from(learningMetrics)
        .where(eq(learningMetrics.materialId, 'material-with-weakspots'));

      const weakSpots = updatedMetric.weakSpots as any[];

      // Should have merged spots: 1-2 (3+2=5), 3-4 (4), 5-6 (2)
      expect(weakSpots).toHaveLength(3);

      const spot1to2 = weakSpots.find(s => s.startBar === 1 && s.endBar === 2);
      expect(spot1to2?.loopCount).toBe(5); // Merged count

      const spot3to4 = weakSpots.find(s => s.startBar === 3 && s.endBar === 4);
      expect(spot3to4?.loopCount).toBe(4); // New spot

      const spot5to6 = weakSpots.find(s => s.startBar === 5 && s.endBar === 6);
      expect(spot5to6?.loopCount).toBe(2); // Unchanged
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

      // Check final state
      const metrics = await db
        .select()
        .from(learningMetrics)
        .where(eq(learningMetrics.materialId, 'concurrent-material'));

      expect(metrics).toHaveLength(1);
      expect(metrics[0].sessionCount).toBeGreaterThanOrEqual(1);
      expect(metrics[0].totalPracticeTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const dbSpy = vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

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

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save session');
      expect(data.details).toContain('Database connection failed');

      dbSpy.mockRestore();
    });
  });

  describe('Achievement Calculations', () => {
    it('should correctly calculate achievement rate', async () => {
      const testCases = [
        { completed: 8, total: 8, expected: '100.00' },
        { completed: 4, total: 8, expected: '50.00' },
        { completed: 0, total: 8, expected: '0.00' },
        { completed: 10, total: 8, expected: '100.00' }, // Cap at 100%
      ];

      for (const { completed, total, expected } of testCases) {
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

        await POST(request);

        const [metric] = await db
          .select()
          .from(learningMetrics)
          .where(eq(learningMetrics.materialId, `material-${completed}-${total}`));

        expect(metric.achievementRate).toBe(expected);
      }
    });

    it('should correctly calculate tempo achievement', async () => {
      const testCases = [
        { achieved: 120, target: 120, expected: '100.00' },
        { achieved: 90, target: 120, expected: '75.00' },
        { achieved: 60, target: 120, expected: '50.00' },
        { achieved: 150, target: 120, expected: '100.00' }, // Cap at 100%
      ];

      for (const { achieved, target, expected } of testCases) {
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

        await POST(request);

        const [metric] = await db
          .select()
          .from(learningMetrics)
          .where(eq(learningMetrics.materialId, `tempo-${achieved}-${target}`));

        expect(metric.tempoAchievement).toBe(expected);
      }
    });
  });
});