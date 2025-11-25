/**
 * Integration tests for Sessions CRUD API
 * Phase 2: MUEDnote Session/Interview Architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ========================================
// Mock Setup
// ========================================

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

// Mock database operations
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbFrom = vi.fn();
const mockDbWhere = vi.fn();
const mockDbOrderBy = vi.fn();
const mockDbLimit = vi.fn();
const mockDbOffset = vi.fn();
const mockDbReturning = vi.fn();
const mockDbValues = vi.fn();

// Create chainable mock objects
const createSelectChain = () => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue(Promise.resolve([])),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockReturnValue(Promise.resolve([])),
        }),
      }),
    }),
  }),
});

const createInsertChain = () => ({
  values: vi.fn().mockReturnValue({
    returning: vi.fn().mockReturnValue(Promise.resolve([])),
  }),
});

// Mock transaction that provides tx object with same methods
const mockTransaction = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => createSelectChain()),
    insert: vi.fn(() => createInsertChain()),
    transaction: (callback: any) => mockTransaction(callback),
  },
}));

// Mock schema
vi.mock('@/db/schema', () => ({
  sessions: {},
  sessionAnalyses: {},
  users: {},
}));

// Mock api-auth helper
const mockAuthenticateApiRequest = vi.fn();
vi.mock('@/lib/utils/api-auth', () => ({
  authenticateApiRequest: (...args: any[]) => mockAuthenticateApiRequest(...args),
  isAuthenticated: (result: any) => result && 'internalUserId' in result,
}));

// Mock analyzer service
const mockAnalyzeSession = vi.fn();
vi.mock('@/lib/services/analyzer.service', () => ({
  analyzerService: {
    analyzeSession: (...args: any[]) => mockAnalyzeSession(...args),
  },
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after all mocks are set up
import { POST, GET } from '@/app/api/muednote/sessions/route';
import { db } from '@/db';

// ========================================
// Test Data
// ========================================

// Define UUID constants for consistent use
const USER_UUID = '550e8400-e29b-41d4-a716-446655440100';
const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440101';
const PROJECT_UUID = '550e8400-e29b-41d4-a716-446655440102';
const ANALYSIS_UUID = '550e8400-e29b-41d4-a716-446655440103';

const mockUser = {
  id: USER_UUID,
  clerkId: 'clerk-user-123',
  email: 'test@example.com',
  role: 'student',
};

const mockSession = {
  id: SESSION_UUID,
  userId: USER_UUID,
  type: 'composition',
  title: 'Test Session',
  userShortNote: 'Working on chord progression for chorus',
  projectId: PROJECT_UUID,
  projectName: 'My Song',
  dawMeta: {
    dawName: 'Logic Pro',
    tempo: 120,
    timeSignature: '4/4',
    keyEstimate: 'C',
  },
  aiAnnotations: {
    focusArea: 'harmony',
    intentHypothesis: 'Trying to create smoother transition to chorus',
    confidence: 0.85,
    analysisMethod: 'text_inference',
  },
  isPublic: false,
  shareWithMentor: true,
  status: 'draft',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockAnalysis = {
  id: ANALYSIS_UUID,
  sessionId: SESSION_UUID,
  analysisData: {
    focusArea: 'harmony',
    intentHypothesis: 'Trying to create smoother transition to chorus',
  },
  analysisVersion: 'mvp-1.0',
  confidence: 0.85,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockAnalyzerResult = {
  focusArea: 'harmony',
  intentHypothesis: 'Trying to create smoother transition to chorus',
  confidence: 0.85,
  analysisMethod: 'text_inference',
};

// ========================================
// Test Suite
// ========================================

describe('Sessions API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/muednote/sessions', () => {
    it('should create a session for authenticated user', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });

      // Mock analyzer service
      mockAnalyzeSession.mockResolvedValue(mockAnalyzerResult);

      // Mock transaction callback
      mockTransaction.mockImplementation(async (callback: any) => {
        // Create tx object with insert method
        const insertSessionChain = createInsertChain();
        insertSessionChain.values().returning.mockResolvedValue([mockSession]);

        const insertAnalysisChain = createInsertChain();
        insertAnalysisChain.values().returning.mockResolvedValue([mockAnalysis]);

        const tx = {
          insert: vi.fn()
            .mockReturnValueOnce(insertSessionChain) // For sessions table
            .mockReturnValueOnce(insertAnalysisChain), // For sessionAnalyses table
        };

        // Execute the callback with tx
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'composition',
          title: 'Test Session',
          userShortNote: 'Working on chord progression for chorus',
          projectId: 'project-456',
          projectName: 'My Song',
          dawMeta: {
            dawName: 'Logic Pro',
            tempo: 120,
            timeSignature: '4/4',
            keyEstimate: 'C',
          },
          isPublic: false,
          shareWithMentor: true,
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('session');
      expect(data).toHaveProperty('analysis');
      expect(data.session.id).toBe(SESSION_UUID);
      expect(data.analysis.id).toBe(ANALYSIS_UUID);

      // Verify analyzer was called with correct params
      expect(mockAnalyzeSession).toHaveBeenCalledWith({
        sessionType: 'composition',
        userShortNote: 'Working on chord progression for chorus',
        dawMeta: {
          dawName: 'Logic Pro',
          tempo: 120,
          timeSignature: '4/4',
          keyEstimate: 'C',
        },
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'composition',
          // Missing title and userShortNote
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: type, title, userShortNote');
    });

    it('should return 401 for unauthenticated users', async () => {
      // Arrange
      const { NextResponse } = await import('next/server');
      mockAuthenticateApiRequest.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'composition',
          title: 'Test Session',
          userShortNote: 'Test note',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle user not found error', async () => {
      // Arrange
      const { NextResponse } = await import('next/server');
      mockAuthenticateApiRequest.mockResolvedValue(
        NextResponse.json({ error: 'User authentication failed' }, { status: 500 })
      );

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'composition',
          title: 'Test Session',
          userShortNote: 'Test note',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('User authentication failed');
    });

    it('should save AI annotations correctly', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });

      mockAnalyzeSession.mockResolvedValue(mockAnalyzerResult);

      // Capture the values passed to insert
      let sessionValues: any;
      let analysisValues: any;

      // Mock transaction callback
      mockTransaction.mockImplementation(async (callback: any) => {
        const insertSessionChain = createInsertChain();
        const insertAnalysisChain = createInsertChain();

        insertSessionChain.values.mockImplementation((vals) => {
          sessionValues = vals;
          return { returning: vi.fn().mockResolvedValue([mockSession]) };
        });

        insertAnalysisChain.values.mockImplementation((vals) => {
          analysisValues = vals;
          return { returning: vi.fn().mockResolvedValue([mockAnalysis]) };
        });

        const tx = {
          insert: vi.fn()
            .mockReturnValueOnce(insertSessionChain)
            .mockReturnValueOnce(insertAnalysisChain),
        };

        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'composition',
          title: 'Test Session',
          userShortNote: 'Working on chord progression',
        }),
      });

      // Act
      await POST(request);

      // Assert
      expect(sessionValues.aiAnnotations).toEqual({
        focusArea: 'harmony',
        intentHypothesis: 'Trying to create smoother transition to chorus',
        confidence: 0.85,
        analysisMethod: 'text_inference',
      });

      expect(analysisValues.analysisData).toEqual({
        focusArea: 'harmony',
        intentHypothesis: 'Trying to create smoother transition to chorus',
      });

      // Verify confidence conversion: 0.85 → 85
      expect(analysisValues.confidence).toBe(85);
    });
  });

  describe('GET /api/muednote/sessions', () => {
    it('should fetch all sessions for authenticated user', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });

      // Mock sessions query
      const sessionsSelectChain = createSelectChain();
      sessionsSelectChain
        .from()
        .where()
        .orderBy()
        .limit()
        .offset.mockResolvedValue([mockSession]);

      // Mock count query
      const countSelectChain = createSelectChain();
      countSelectChain.from().where.mockResolvedValue([{ total: 1 }]);

      (db.select as any)
        .mockReturnValueOnce(sessionsSelectChain) // For sessions query
        .mockReturnValueOnce(countSelectChain); // For count query

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('sessions');
      expect(data).toHaveProperty('pagination');
      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].id).toBe(SESSION_UUID);
      expect(data.pagination).toEqual({
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });

    it('should filter sessions by type', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });


      const sessionsSelectChain = createSelectChain();
      const whereFunc = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });
      sessionsSelectChain.from.mockReturnValue({ where: whereFunc });

      const countSelectChain = createSelectChain();
      countSelectChain.from().where.mockResolvedValue([{ total: 1 }]);

      (db.select as any)
        .mockReturnValueOnce(sessionsSelectChain)
        .mockReturnValueOnce(countSelectChain);

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions?type=composition', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(1);
      expect(whereFunc).toHaveBeenCalled();
    });

    it('should filter sessions by status', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });


      const sessionsSelectChain = createSelectChain();
      sessionsSelectChain
        .from()
        .where()
        .orderBy()
        .limit()
        .offset.mockResolvedValue([mockSession]);

      const countSelectChain = createSelectChain();
      countSelectChain.from().where.mockResolvedValue([{ total: 1 }]);

      (db.select as any)
        .mockReturnValueOnce(sessionsSelectChain)
        .mockReturnValueOnce(countSelectChain);

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions?status=draft', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });


      const sessionsSelectChain = createSelectChain();
      const mockSessions = Array(10).fill(mockSession).map((s, i) => ({ ...s, id: `session-${i}` }));
      sessionsSelectChain
        .from()
        .where()
        .orderBy()
        .limit()
        .offset.mockResolvedValue(mockSessions.slice(5, 10));

      const countSelectChain = createSelectChain();
      countSelectChain.from().where.mockResolvedValue([{ total: 25 }]);

      (db.select as any)
        .mockReturnValueOnce(sessionsSelectChain)
        .mockReturnValueOnce(countSelectChain);

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions?limit=5&offset=5', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(5);
      expect(data.pagination).toEqual({
        total: 25,
        limit: 5,
        offset: 5,
        hasMore: true,
      });
    });

    it('should limit max items to 100', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });


      const sessionsSelectChain = createSelectChain();
      sessionsSelectChain
        .from()
        .where()
        .orderBy()
        .limit()
        .offset.mockResolvedValue([]);

      const countSelectChain = createSelectChain();
      countSelectChain.from().where.mockResolvedValue([{ total: 0 }]);

      (db.select as any)
        .mockReturnValueOnce(sessionsSelectChain)
        .mockReturnValueOnce(countSelectChain);

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions?limit=200', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(100); // Should be capped at 100
    });

    it('should return 401 for unauthenticated users', async () => {
      // Arrange
      const { NextResponse } = await import('next/server');
      mockAuthenticateApiRequest.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should not return other users sessions', async () => {
      // Arrange
      mockAuthenticateApiRequest.mockResolvedValue({
        clerkUserId: 'clerk-user-123',
        internalUserId: 'internal-user-uuid',
      });


      // Return empty array for this user's sessions
      const sessionsSelectChain = createSelectChain();
      sessionsSelectChain
        .from()
        .where()
        .orderBy()
        .limit()
        .offset.mockResolvedValue([]);

      const countSelectChain = createSelectChain();
      countSelectChain.from().where.mockResolvedValue([{ total: 0 }]);

      (db.select as any)
        .mockReturnValueOnce(sessionsSelectChain)
        .mockReturnValueOnce(countSelectChain);

      const request = new NextRequest('http://localhost:3000/api/muednote/sessions', {
        method: 'GET',
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });
  });
});