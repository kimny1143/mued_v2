/**
 * UserRepository - Data access layer for User management
 *
 * This repository provides type-safe CRUD operations for:
 * - users (Clerk integration)
 */

import { db } from '@/db/edge';
import { users } from '@/db/schema';
import { desc, eq, and, like, sql, or } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export type UserRole = 'student' | 'mentor' | 'admin';

/**
 * User creation input
 */
export interface CreateUserInput {
  clerkId: string;
  email: string;
  name?: string;
  role?: UserRole;
  profileImageUrl?: string;
  bio?: string;
  skills?: string[];
  stripeCustomerId?: string;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserRole;
  profileImageUrl?: string;
  bio?: string;
  skills?: string[];
  stripeCustomerId?: string;
}

/**
 * User filter options
 */
export interface UserFilters {
  role?: UserRole;
  search?: string; // Search by name or email
  limit?: number;
  offset?: number;
}

// ========================================
// UserRepository Class
// ========================================

export class UserRepository {
  // ========================================
  // Users CRUD
  // ========================================

  /**
   * Create a new user
   */
  async create(input: CreateUserInput) {
    const [user] = await db
      .insert(users)
      .values({
        clerkId: input.clerkId,
        email: input.email,
        name: input.name,
        role: input.role ?? 'student',
        profileImageUrl: input.profileImageUrl,
        bio: input.bio,
        skills: input.skills,
        stripeCustomerId: input.stripeCustomerId,
      })
      .returning();

    return user;
  }

  /**
   * Get user by ID (UUID)
   */
  async findById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user ?? null;
  }

  /**
   * Get user by Clerk ID
   */
  async findByClerkId(clerkId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    return user ?? null;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  /**
   * Get user by Stripe Customer ID
   */
  async findByStripeCustomerId(stripeCustomerId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);

    return user ?? null;
  }

  /**
   * Get users with filters
   */
  async findMany(filters: UserFilters = {}) {
    let query = db.select().from(users);

    const conditions = [];

    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(users.name, searchPattern),
          like(users.email, searchPattern)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(users.createdAt)) as typeof query;

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  /**
   * Get all mentors
   */
  async findMentors(limit?: number) {
    return this.findMany({ role: 'mentor', limit });
  }

  /**
   * Update user
   */
  async update(userId: string, input: UpdateUserInput) {
    const [updated] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Update user by Clerk ID
   */
  async updateByClerkId(clerkId: string, input: UpdateUserInput) {
    const [updated] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete user
   */
  async delete(userId: string) {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    return deleted ?? null;
  }

  /**
   * Delete user by Clerk ID
   */
  async deleteByClerkId(clerkId: string) {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.clerkId, clerkId))
      .returning();

    return deleted ?? null;
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Check if user exists by Clerk ID
   */
  async existsByClerkId(clerkId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    return Number(result[0]?.count) > 0;
  }

  /**
   * Get user count by role
   */
  async countByRole(role: UserRole): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, role));

    return Number(result[0]?.count);
  }

  /**
   * Upsert user (create or update by Clerk ID)
   */
  async upsertByClerkId(input: CreateUserInput) {
    const existing = await this.findByClerkId(input.clerkId);

    if (existing) {
      return this.update(existing.id, {
        email: input.email,
        name: input.name,
        profileImageUrl: input.profileImageUrl,
      });
    }

    return this.create(input);
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton repository instance
 * Use this for all user-related database operations
 */
export const userRepository = new UserRepository();
