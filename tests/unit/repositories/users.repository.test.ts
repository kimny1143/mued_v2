/**
 * UserRepository Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database - must be defined before import
vi.mock('@/db/edge', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    },
  };
});

vi.mock('@/db/schema', () => ({
  users: {
    id: 'id',
    clerkId: 'clerk_id',
    email: 'email',
    name: 'name',
    role: 'role',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  like: vi.fn((a, b) => ({ a, b })),
  sql: vi.fn((strings) => strings),
  or: vi.fn((...args) => args),
}));

import { UserRepository } from '@/lib/repositories/users.repository';
import { db } from '@/db/edge';

describe('UserRepository', () => {
  let repository: UserRepository;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    clerkId: 'clerk_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student',
    profileImageUrl: null,
    bio: null,
    skills: null,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new UserRepository();
    vi.clearAllMocks();

    // Setup chain mocks for insert
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockUser]),
    });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    // Setup chain mocks for select
    const mockLimit = vi.fn().mockResolvedValue([mockUser]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit, offset: vi.fn().mockResolvedValue([mockUser]) });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    // Setup chain mocks for update
    const mockUpdateReturning = vi.fn().mockResolvedValue([mockUser]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

    // Setup chain mocks for delete
    const mockDeleteReturning = vi.fn().mockResolvedValue([mockUser]);
    const mockDeleteWhere = vi.fn().mockReturnValue({ returning: mockDeleteReturning });
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never);
  });

  describe('create', () => {
    it('should create a new user with minimal input', async () => {
      const input = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should create a user with all fields', async () => {
      const input = {
        clerkId: 'clerk_456',
        email: 'mentor@example.com',
        name: 'Mentor User',
        role: 'mentor' as const,
        bio: 'Piano instructor',
        skills: ['piano', 'music theory'],
      };

      const result = await repository.create(input);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const result = await repository.findById(mockUser.id);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      // Override mock for this test
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByClerkId', () => {
    it('should return user when found', async () => {
      const result = await repository.findByClerkId('clerk_123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const result = await repository.findByEmail('test@example.com');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const updateInput = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      const result = await repository.update(mockUser.id, updateInput);

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('delete', () => {
    it('should delete user by id', async () => {
      const result = await repository.delete(mockUser.id);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('existsByClerkId', () => {
    it('should return true when user exists', async () => {
      // Override mock for count query - no .limit() in this method
      const mockWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.existsByClerkId('clerk_123');

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      // Override mock for count query - no .limit() in this method
      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await repository.existsByClerkId('non-existent');

      expect(result).toBe(false);
    });
  });
});
