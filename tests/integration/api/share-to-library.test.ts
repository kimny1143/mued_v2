/**
 * Share to Library API Integration Tests
 *
 * Tests for converting and sharing materials to the library
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/materials/share-to-library/route';
import { db } from '@/db';
import { auth } from '@clerk/nextjs/server';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Share to Library API', () => {
  let mockAuth: Mock;
  let mockDb: any;

  const mockUser = {
    id: 'user-db-id-123',
    clerkId: 'clerk-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockMaterial = {
    id: 'material-123',
    creatorId: 'user-db-id-123',
    type: 'practice',
    difficulty: 'intermediate',
    content: {
      title: 'Jazz Piano Scales',
      exercises: [
        { id: 1, question: 'Play C major scale', answer: 'C D E F G A B C' },
      ],
    },
    metadata: {
      model: 'gpt-5-mini',
      tags: ['jazz', 'scales', 'piano'],
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup auth mock
    mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValue({ userId: 'clerk-user-123' } as any);

    // Setup database mock chain
    const mockLimit = vi.fn().mockResolvedValue([mockUser]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    mockDb = vi.mocked(db);
    mockDb.select.mockImplementation(() => mockSelect());
  });

  describe('POST /api/materials/share-to-library', () => {
    it('should share material successfully', async () => {
      // Setup material query mock
      const mockMaterialLimit = vi.fn().mockResolvedValue([mockMaterial]);
      const mockMaterialWhere = vi.fn().mockReturnValue({ limit: mockMaterialLimit });
      const mockMaterialFrom = vi.fn().mockReturnValue({ where: mockMaterialWhere });
      const mockMaterialSelect = vi.fn().mockReturnValue({ from: mockMaterialFrom });

      // First call returns user, second call returns material
      mockDb.select
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMaterial]),
            }),
          }),
        }));

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Jazz Piano Scales',
          type: 'practice',
          difficulty: 'intermediate',
          description: 'Learn essential jazz piano scales',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contentId).toBe('material-material-123');
      expect(data.message).toBe('Material shared to Library successfully');
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Test Material',
          type: 'practice',
          difficulty: 'beginner',
          description: 'Test description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user not found in database', async () => {
      mockDb.select.mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No user found
          }),
        }),
      }));

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Test Material',
          type: 'practice',
          difficulty: 'beginner',
          description: 'Test description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 when material not found', async () => {
      mockDb.select
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No material found
            }),
          }),
        }));

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'non-existent',
          title: 'Test Material',
          type: 'practice',
          difficulty: 'beginner',
          description: 'Test description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Material not found');
    });

    it('should return 403 when user is not the owner', async () => {
      const otherUserMaterial = {
        ...mockMaterial,
        creatorId: 'other-user-id',
      };

      mockDb.select
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([otherUserMaterial]),
            }),
          }),
        }));

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Test Material',
          type: 'practice',
          difficulty: 'beginner',
          description: 'Test description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authorized to share this material');
    });

    it('should correctly map material types', async () => {
      const testCases = [
        { input: 'quiz', expected: 'test' },
        { input: 'test', expected: 'test' },
        { input: 'practice', expected: 'practice' },
        { input: 'problems', expected: 'practice' },
        { input: 'flashcards', expected: 'interactive' },
        { input: 'summary', expected: 'interactive' },
        { input: 'unknown', expected: 'practice' },
      ];

      for (const testCase of testCases) {
        mockDb.select
          .mockImplementationOnce(() => ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockUser]),
              }),
            }),
          }))
          .mockImplementationOnce(() => ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ ...mockMaterial, type: testCase.input }]),
              }),
            }),
          }));

        const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
          method: 'POST',
          body: JSON.stringify({
            materialId: 'material-123',
            title: 'Test Material',
            type: testCase.input,
            difficulty: 'beginner',
            description: 'Test description',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should extract tags correctly', async () => {
      const materialWithTags = {
        ...mockMaterial,
        type: 'practice',
        difficulty: 'advanced',
        metadata: {
          tags: ['jazz', 'piano', 'scales', 'practice', 'advanced'], // Includes duplicates
        },
      };

      mockDb.select
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([materialWithTags]),
            }),
          }),
        }));

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Jazz Piano Scales',
          type: 'practice',
          difficulty: 'advanced',
          description: 'Advanced jazz scales',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Tags should be deduplicated
    });

    it('should handle errors gracefully', async () => {
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Test Material',
          type: 'practice',
          difficulty: 'beginner',
          description: 'Test description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle materials without metadata gracefully', async () => {
      const materialWithoutMetadata = {
        ...mockMaterial,
        metadata: null,
      };

      mockDb.select
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([materialWithoutMetadata]),
            }),
          }),
        }));

      const request = new NextRequest('http://localhost:3000/api/materials/share-to-library', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-123',
          title: 'Test Material',
          type: 'practice',
          difficulty: 'beginner',
          description: 'Test description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});