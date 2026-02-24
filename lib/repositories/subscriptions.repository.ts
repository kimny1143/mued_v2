/**
 * SubscriptionRepository - Data access layer for Subscription management
 *
 * This repository provides type-safe CRUD operations for:
 * - subscriptions (Stripe integration)
 * - usage tracking (AI materials, reservations)
 */

import { db } from '@/db/edge';
import { subscriptions } from '@/db/schema';
import { desc, eq, and, sql, gte, lte } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export type SubscriptionTier = 'free' | 'basic' | 'premium';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'unpaid';

/**
 * Subscription tier limits for MUEDnote Hoo AI
 * IMPORTANT: These values must stay in sync with lib/middleware/usage-limiter.ts
 * -1 = unlimited, 0 = not available
 *
 * Limits:
 * - hooThreadsLimit: Number of conversation threads per month (soft limit - shows alert but doesn't block)
 * - hooTurnsLimit: Total turns across all conversations per month (hard limit - blocks when exceeded)
 *
 * A "turn" = one user message (AI response doesn't count separately)
 */
export const TIER_LIMITS: Record<SubscriptionTier, {
  hooThreadsLimit: number;
  hooTurnsLimit: number;
}> = {
  free: {
    hooThreadsLimit: 0,    // No AI access, template responses only
    hooTurnsLimit: 0,      // No AI access
  },
  basic: {
    hooThreadsLimit: -1,   // Unlimited
    hooTurnsLimit: -1,     // Unlimited
  },
  premium: {
    hooThreadsLimit: -1,   // Unlimited (personalized AI + MUEDlobe)
    hooTurnsLimit: -1,     // Unlimited (personalized AI + MUEDlobe)
  },
};

/**
 * Legacy MUED LMS tier limits (for AI Materials & Reservations)
 * These are planned features for future MUED LMS integration
 */
const MUED_LMS_LIMITS: Record<SubscriptionTier, {
  aiMaterialsLimit: number;
  reservationsLimit: number;
}> = {
  free: { aiMaterialsLimit: 0, reservationsLimit: 0 }, // Not available
  basic: { aiMaterialsLimit: -1, reservationsLimit: 5 }, // Unlimited AI, 5 reservations
  premium: { aiMaterialsLimit: -1, reservationsLimit: -1 }, // Unlimited
};

/**
 * Type guard to check if a string is a valid SubscriptionTier
 */
function isValidTier(tier: string): tier is SubscriptionTier {
  return ['free', 'basic', 'premium'].includes(tier);
}

/**
 * Get tier with type safety, defaults to free if invalid
 */
function getTierSafely(tier: string | null | undefined): SubscriptionTier {
  if (tier && isValidTier(tier)) {
    return tier;
  }
  return 'free';
}

/**
 * Subscription creation input
 */
export interface CreateSubscriptionInput {
  userId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Subscription update input
 */
export interface UpdateSubscriptionInput {
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  aiMaterialsUsed?: number;
  reservationsUsed?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Subscription filter options
 */
export interface SubscriptionFilters {
  userId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  limit?: number;
  offset?: number;
}

// ========================================
// SubscriptionRepository Class
// ========================================

export class SubscriptionRepository {
  // ========================================
  // Subscriptions CRUD
  // ========================================

  /**
   * Create a new subscription
   */
  async create(input: CreateSubscriptionInput) {
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId: input.userId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripeCustomerId: input.stripeCustomerId,
        tier: input.tier ?? 'free',
        status: input.status ?? 'active',
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        metadata: input.metadata,
      })
      .returning();

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  async findById(subscriptionId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    return subscription ?? null;
  }

  /**
   * Get subscription by user ID
   */
  async findByUserId(userId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return subscription ?? null;
  }

  /**
   * Get active subscription by user ID
   */
  async findActiveByUserId(userId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return subscription ?? null;
  }

  /**
   * Get subscription by Stripe Subscription ID
   */
  async findByStripeSubscriptionId(stripeSubscriptionId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);

    return subscription ?? null;
  }

  /**
   * Get subscription by Stripe Customer ID
   */
  async findByStripeCustomerId(stripeCustomerId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return subscription ?? null;
  }

  /**
   * Get subscriptions with filters
   */
  async findMany(filters: SubscriptionFilters = {}) {
    let query = db.select().from(subscriptions);

    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(subscriptions.userId, filters.userId));
    }

    if (filters.tier) {
      conditions.push(eq(subscriptions.tier, filters.tier));
    }

    if (filters.status) {
      conditions.push(eq(subscriptions.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(subscriptions.createdAt)) as typeof query;

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  /**
   * Update subscription
   */
  async update(subscriptionId: string, input: UpdateSubscriptionInput) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return updated ?? null;
  }

  /**
   * Update subscription by user ID
   */
  async updateByUserId(userId: string, input: UpdateSubscriptionInput) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Update subscription by Stripe Subscription ID
   */
  async updateByStripeSubscriptionId(
    stripeSubscriptionId: string,
    input: UpdateSubscriptionInput
  ) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete subscription
   */
  async delete(subscriptionId: string) {
    const [deleted] = await db
      .delete(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return deleted ?? null;
  }

  // ========================================
  // Usage Tracking
  // ========================================

  /**
   * Increment AI materials usage
   */
  async incrementAiMaterialsUsed(userId: string) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        aiMaterialsUsed: sql`${subscriptions.aiMaterialsUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Increment reservations usage
   */
  async incrementReservationsUsed(userId: string) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        reservationsUsed: sql`${subscriptions.reservationsUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Reset usage counters (for period renewal)
   */
  async resetUsage(subscriptionId: string) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        aiMaterialsUsed: 0,
        reservationsUsed: 0,
        hooConversationsUsed: 0, // Reset thread count
        hooTurnsUsed: 0,          // Reset turn count
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return updated ?? null;
  }

  // ========================================
  // Hoo Usage Tracking (MUEDnote)
  // ========================================

  /**
   * Increment Hoo thread (conversation) usage
   * Called when a NEW conversation is created
   */
  async incrementHooConversationsUsed(userId: string) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        hooConversationsUsed: sql`${subscriptions.hooConversationsUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Increment Hoo turn usage
   * Called for EVERY user message (regardless of conversation)
   */
  async incrementHooTurnsUsed(userId: string) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        hooTurnsUsed: sql`${subscriptions.hooTurnsUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Check if user can use Hoo AI conversation
   * Checks the HARD limit (turns), not the soft limit (threads)
   * Returns: { allowed: boolean, reason?: string, tier: SubscriptionTier, threadAlert?: boolean }
   */
  async canUseHooConversation(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    tier: SubscriptionTier;
    usage?: {
      threadsUsed: number;
      threadsLimit: number;
      turnsUsed: number;
      turnsLimit: number;
    };
    threadAlert?: boolean; // True if thread soft limit exceeded
  }> {
    const subscription = await this.findActiveByUserId(userId);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'NO_SUBSCRIPTION',
        tier: 'free',
      };
    }

    const tier = getTierSafely(subscription.tier);
    const limits = TIER_LIMITS[tier];

    const threadsUsed = subscription.hooConversationsUsed;
    const turnsUsed = subscription.hooTurnsUsed;

    // Free tier: no AI, template only
    if (limits.hooTurnsLimit === 0) {
      return {
        allowed: false,
        reason: 'FREE_TIER',
        tier,
        usage: {
          threadsUsed,
          threadsLimit: 0,
          turnsUsed,
          turnsLimit: 0,
        },
      };
    }

    // Premium: unlimited (-1)
    if (limits.hooTurnsLimit === -1) {
      return {
        allowed: true,
        tier,
        usage: {
          threadsUsed,
          threadsLimit: -1,
          turnsUsed,
          turnsLimit: -1,
        },
      };
    }

    // Basic: check HARD limit (turns)
    if (turnsUsed >= limits.hooTurnsLimit) {
      return {
        allowed: false,
        reason: 'TURN_LIMIT_EXCEEDED',
        tier,
        usage: {
          threadsUsed,
          threadsLimit: limits.hooThreadsLimit,
          turnsUsed,
          turnsLimit: limits.hooTurnsLimit,
        },
      };
    }

    // Check soft limit (threads) - alert but don't block
    const threadAlert = limits.hooThreadsLimit > 0 && threadsUsed >= limits.hooThreadsLimit;

    return {
      allowed: true,
      tier,
      usage: {
        threadsUsed,
        threadsLimit: limits.hooThreadsLimit,
        turnsUsed,
        turnsLimit: limits.hooTurnsLimit,
      },
      threadAlert,
    };
  }

  /**
   * Get Hoo usage limits for user
   */
  async getHooUsageLimits(userId: string) {
    const subscription = await this.findActiveByUserId(userId);

    if (!subscription) {
      return {
        tier: 'free' as SubscriptionTier,
        hooThreads: { used: 0, limit: TIER_LIMITS.free.hooThreadsLimit },
        hooTurns: { used: 0, limit: TIER_LIMITS.free.hooTurnsLimit },
      };
    }

    const tier = getTierSafely(subscription.tier);
    const limits = TIER_LIMITS[tier];

    return {
      tier,
      hooThreads: {
        used: subscription.hooConversationsUsed,
        limit: limits.hooThreadsLimit,
      },
      hooTurns: {
        used: subscription.hooTurnsUsed,
        limit: limits.hooTurnsLimit,
      },
    };
  }

  /**
   * Check if user can use AI materials
   */
  async canUseAiMaterials(userId: string): Promise<boolean> {
    const subscription = await this.findActiveByUserId(userId);

    if (!subscription) {
      return false;
    }

    const tier = getTierSafely(subscription.tier);
    const limits = MUED_LMS_LIMITS[tier];

    // -1 means unlimited, 0 means not available
    if (limits.aiMaterialsLimit === -1) {
      return true;
    }
    if (limits.aiMaterialsLimit === 0) {
      return false;
    }

    return subscription.aiMaterialsUsed < limits.aiMaterialsLimit;
  }

  /**
   * Check if user can make reservations
   */
  async canMakeReservation(userId: string): Promise<boolean> {
    const subscription = await this.findActiveByUserId(userId);

    if (!subscription) {
      return false;
    }

    const tier = getTierSafely(subscription.tier);
    const limits = MUED_LMS_LIMITS[tier];

    // -1 means unlimited, 0 means not available
    if (limits.reservationsLimit === -1) {
      return true;
    }
    if (limits.reservationsLimit === 0) {
      return false;
    }

    return subscription.reservationsUsed < limits.reservationsLimit;
  }

  /**
   * Get usage limits for user (Legacy MUED LMS)
   */
  async getUsageLimits(userId: string) {
    const subscription = await this.findActiveByUserId(userId);

    if (!subscription) {
      return {
        tier: 'free' as SubscriptionTier,
        aiMaterials: { used: 0, limit: MUED_LMS_LIMITS.free.aiMaterialsLimit },
        reservations: { used: 0, limit: MUED_LMS_LIMITS.free.reservationsLimit },
      };
    }

    const tier = getTierSafely(subscription.tier);
    const limits = MUED_LMS_LIMITS[tier];

    return {
      tier,
      aiMaterials: {
        used: subscription.aiMaterialsUsed,
        limit: limits.aiMaterialsLimit,
      },
      reservations: {
        used: subscription.reservationsUsed,
        limit: limits.reservationsLimit,
      },
    };
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Upsert subscription for user (create or update)
   */
  async upsertByUserId(userId: string, input: CreateSubscriptionInput) {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.update(existing.id, {
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripeCustomerId: input.stripeCustomerId,
        tier: input.tier,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        metadata: input.metadata,
      });
    }

    return this.create(input);
  }

  /**
   * Cancel subscription
   */
  async cancel(subscriptionId: string, cancelAtPeriodEnd = true) {
    if (cancelAtPeriodEnd) {
      return this.update(subscriptionId, { cancelAtPeriodEnd: true });
    }

    return this.update(subscriptionId, { status: 'cancelled' });
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivate(subscriptionId: string) {
    return this.update(subscriptionId, {
      status: 'active',
      cancelAtPeriodEnd: false,
    });
  }

  // ========================================
  // Statistics
  // ========================================

  /**
   * Get subscription count by tier
   */
  async countByTier(tier: SubscriptionTier): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tier, tier),
          eq(subscriptions.status, 'active')
        )
      );

    return Number(result[0]?.count);
  }

  /**
   * Get subscription statistics
   */
  async getStats() {
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${subscriptions.status} = 'active')`,
        free: sql<number>`count(*) filter (where ${subscriptions.tier} = 'free' and ${subscriptions.status} = 'active')`,
        basic: sql<number>`count(*) filter (where ${subscriptions.tier} = 'basic' and ${subscriptions.status} = 'active')`,
        premium: sql<number>`count(*) filter (where ${subscriptions.tier} = 'premium' and ${subscriptions.status} = 'active')`,
      })
      .from(subscriptions);

    return result[0];
  }

  /**
   * Get expiring subscriptions (for renewal reminders)
   */
  async findExpiringSoon(daysBeforeExpiry = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          lte(subscriptions.currentPeriodEnd, expiryDate),
          gte(subscriptions.currentPeriodEnd, new Date())
        )
      );
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton repository instance
 * Use this for all subscription-related database operations
 */
export const subscriptionRepository = new SubscriptionRepository();
