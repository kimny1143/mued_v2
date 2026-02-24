import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { TIER_LIMITS as BASE_TIER_LIMITS } from '@/lib/repositories/subscriptions.repository';

/**
 * Usage Limiter Middleware
 *
 * Enforces subscription tier-based usage limits for MUEDnote:
 * - Hoo AI Threads (soft limit - alert only)
 * - Hoo AI Turns (hard limit - blocks)
 */

export interface UsageLimits {
  // Thread limits (soft - alert only)
  hooThreadsLimit: number;      // -1 = unlimited, 0 = not available
  hooThreadsUsed: number;
  hooThreadsRemaining: number;
  hooThreadsExceeded: boolean;  // true if over soft limit (shows alert)

  // Turn limits (hard - blocks)
  hooTurnsLimit: number;        // -1 = unlimited, 0 = not available
  hooTurnsUsed: number;
  hooTurnsRemaining: number;

  tier: string;
  canUseHooAI: boolean;         // Based on hard limit (turns)
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}

// Tier-based limits configuration
// Production limits are enforced by default.
// Set UNLIMITED_FOR_TESTING=true in non-production to bypass limits.

// IMPORTANT: Function-level evaluation to ensure runtime environment is checked
function getTierLimits() {
  // Environment variable control: only allow unlimited in non-production with explicit opt-in
  const UNLIMITED_FOR_TESTING =
    process.env.UNLIMITED_FOR_TESTING === 'true' &&
    process.env.NODE_ENV !== 'production';

  if (UNLIMITED_FOR_TESTING) {
    console.warn('[UsageLimiter] UNLIMITED_FOR_TESTING is enabled - all limits disabled');
    return {
      free: { hooThreadsLimit: -1, hooTurnsLimit: -1 },
      basic: { hooThreadsLimit: -1, hooTurnsLimit: -1 },
      premium: { hooThreadsLimit: -1, hooTurnsLimit: -1 },
    };
  }

  // Use production tier limits from repository
  return BASE_TIER_LIMITS;
}

const TIER_LIMITS = getTierLimits();

/**
 * Get user's current usage limits and remaining quota
 * @param clerkId - Clerk user ID
 */
export async function getUserUsageLimits(clerkId: string): Promise<UsageLimits> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    // Return free tier limits if user not found
    return {
      hooThreadsLimit: TIER_LIMITS.free.hooThreadsLimit,
      hooThreadsUsed: 0,
      hooThreadsRemaining: 0,
      hooThreadsExceeded: false,
      hooTurnsLimit: TIER_LIMITS.free.hooTurnsLimit,
      hooTurnsUsed: 0,
      hooTurnsRemaining: 0,
      tier: 'free',
      canUseHooAI: false,
    };
  }

  // Get user's subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  // Default to free if no subscription
  const tier = subscription?.tier || 'free';
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  const hooThreadsUsed = subscription?.hooConversationsUsed || 0;
  const hooTurnsUsed = subscription?.hooTurnsUsed || 0;

  // Calculate remaining threads (soft limit)
  const hooThreadsRemaining =
    limits.hooThreadsLimit === -1
      ? -1
      : limits.hooThreadsLimit === 0
      ? 0
      : Math.max(0, limits.hooThreadsLimit - hooThreadsUsed);

  // Calculate remaining turns (hard limit)
  const hooTurnsRemaining =
    limits.hooTurnsLimit === -1
      ? -1
      : limits.hooTurnsLimit === 0
      ? 0
      : Math.max(0, limits.hooTurnsLimit - hooTurnsUsed);

  // Thread exceeded = over soft limit (shows alert, doesn't block)
  const hooThreadsExceeded =
    limits.hooThreadsLimit > 0 && hooThreadsUsed >= limits.hooThreadsLimit;

  // Can use Hoo AI based on HARD limit (turns):
  // - Turns limit is unlimited (-1), OR
  // - Turns limit > 0 AND remaining > 0
  const canUseHooAI =
    limits.hooTurnsLimit === -1 ||
    (limits.hooTurnsLimit > 0 && hooTurnsRemaining > 0);

  return {
    hooThreadsLimit: limits.hooThreadsLimit,
    hooThreadsUsed,
    hooThreadsRemaining,
    hooThreadsExceeded,
    hooTurnsLimit: limits.hooTurnsLimit,
    hooTurnsUsed,
    hooTurnsRemaining,
    tier,
    canUseHooAI,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
  };
}

/**
 * Check if user can use Hoo AI
 * @param clerkId - Clerk user ID
 */
export async function checkCanUseHooAI(clerkId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limits: UsageLimits;
  threadAlert?: boolean; // True if thread soft limit exceeded (alert but don't block)
}> {
  const limits = await getUserUsageLimits(clerkId);

  // Free tier: no AI access
  if (limits.hooTurnsLimit === 0) {
    return {
      allowed: false,
      reason: 'Hoo AI is not available on the Free plan. Upgrade to Basic for unlimited Hoo AI conversation.',
      limits,
    };
  }

  // Hard limit check (turns)
  if (!limits.canUseHooAI) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.hooTurnsLimit} Hoo turns. Upgrade to Premium for personalized AI conversation.`,
      limits,
    };
  }

  // Soft limit check (threads) - alert but don't block
  return {
    allowed: true,
    limits,
    threadAlert: limits.hooThreadsExceeded,
  };
}

/**
 * Increment Hoo thread (conversation) usage counter (atomic operation)
 * Called when a NEW conversation is created
 * @param clerkId - Clerk user ID
 */
export async function incrementHooThreadUsage(clerkId: string): Promise<void> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Atomic increment operation
  const result = await db
    .update(subscriptions)
    .set({
      hooConversationsUsed: sql`hoo_conversations_used + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id))
    .returning();

  // Create subscription if it doesn't exist
  if (result.length === 0) {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'free',
      status: 'active',
      hooConversationsUsed: 1,
      hooTurnsUsed: 0,
    });
  }
}

/**
 * Increment Hoo turn usage counter (atomic operation)
 * Called for EVERY user message (regardless of conversation)
 * @param clerkId - Clerk user ID
 */
export async function incrementHooTurnUsage(clerkId: string): Promise<void> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Atomic increment operation
  const result = await db
    .update(subscriptions)
    .set({
      hooTurnsUsed: sql`hoo_turns_used + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id))
    .returning();

  // Create subscription if it doesn't exist
  if (result.length === 0) {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'free',
      status: 'active',
      hooConversationsUsed: 0,
      hooTurnsUsed: 1,
    });
  }
}

/**
 * @deprecated Use incrementHooThreadUsage instead
 * Kept for backwards compatibility
 */
export const incrementHooConversationUsage = incrementHooThreadUsage;

/**
 * Reset monthly usage counters (call this at the start of each billing period)
 * @param clerkId - Clerk user ID
 */
export async function resetMonthlyUsage(clerkId: string): Promise<void> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (subscription) {
    await db
      .update(subscriptions)
      .set({
        hooConversationsUsed: 0, // Reset thread count
        hooTurnsUsed: 0,         // Reset turn count
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: string) {
  const tierConfig = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  return {
    tier,
    displayName: tier.charAt(0).toUpperCase() + tier.slice(1),
    price:
      tier === 'free'
        ? 0
        : tier === 'basic'
        ? 1980
        : 2980,
    limits: tierConfig,
    features: getFeaturesList(tier),
  };
}

function getFeaturesList(tier: string): string[] {
  switch (tier) {
    case 'free':
      return [
        'Voice transcription (Whisper)',
        'Log storage: 90 days',
        'Hoo: Fixed responses only',
      ];
    case 'basic':
      return [
        'Hoo AI conversation (unlimited)',
        'Voice transcription (Whisper)',
        'Cloud sync & unlimited log storage',
        'DAW log integration',
        'Practice data visualization',
      ];
    case 'premium':
      return [
        'All Basic features',
        'Hoo personalized conversation',
        'MUEDlobe cognitive profile',
        'Accumulated data analysis',
      ];
    default:
      return [];
  }
}

/**
 * Check if tier upgrade is valid
 */
export function isValidUpgrade(currentTier: string, newTier: string): boolean {
  const tierHierarchy = ['free', 'basic', 'premium'];
  const currentIndex = tierHierarchy.indexOf(currentTier);
  const newIndex = tierHierarchy.indexOf(newTier);

  return newIndex > currentIndex;
}

// ============================================
// Legacy MUED LMS functions (for future integration)
// These functions support AI Material generation and Lesson Reservations
// which are planned features for MUED LMS integration.
// ============================================

const MUED_LMS_LIMITS = {
  free: { aiMaterialsLimit: 0, reservationsLimit: 0 }, // Not available
  basic: { aiMaterialsLimit: -1, reservationsLimit: 5 }, // Unlimited AI, 5 reservations
  premium: { aiMaterialsLimit: -1, reservationsLimit: -1 }, // Unlimited
};

interface LegacyUsageLimits {
  aiMaterialsLimit: number;
  aiMaterialsUsed: number;
  aiMaterialsRemaining: number;
  reservationsLimit: number;
  reservationsUsed: number;
  reservationsRemaining: number;
  tier: string;
  canGenerateMaterial: boolean;
  canCreateReservation: boolean;
}

/**
 * [Legacy] Check if user can generate AI material
 */
export async function checkCanGenerateMaterial(clerkId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limits: LegacyUsageLimits;
}> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
      limits: {
        aiMaterialsLimit: 0,
        aiMaterialsUsed: 0,
        aiMaterialsRemaining: 0,
        reservationsLimit: 0,
        reservationsUsed: 0,
        reservationsRemaining: 0,
        tier: 'free',
        canGenerateMaterial: false,
        canCreateReservation: false,
      },
    };
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const tier = subscription?.tier || 'free';
  const tierLimits = MUED_LMS_LIMITS[tier as keyof typeof MUED_LMS_LIMITS] || MUED_LMS_LIMITS.free;

  const aiMaterialsUsed = subscription?.aiMaterialsUsed || 0;
  const reservationsUsed = subscription?.reservationsUsed || 0;

  const aiMaterialsRemaining =
    tierLimits.aiMaterialsLimit === -1
      ? -1
      : tierLimits.aiMaterialsLimit === 0
      ? 0
      : Math.max(0, tierLimits.aiMaterialsLimit - aiMaterialsUsed);

  const reservationsRemaining =
    tierLimits.reservationsLimit === -1
      ? -1
      : tierLimits.reservationsLimit === 0
      ? 0
      : Math.max(0, tierLimits.reservationsLimit - reservationsUsed);

  const canGenerateMaterial =
    tierLimits.aiMaterialsLimit === -1 ||
    (tierLimits.aiMaterialsLimit > 0 && aiMaterialsRemaining > 0);

  const canCreateReservation =
    tierLimits.reservationsLimit === -1 ||
    (tierLimits.reservationsLimit > 0 && reservationsRemaining > 0);

  const limits: LegacyUsageLimits = {
    aiMaterialsLimit: tierLimits.aiMaterialsLimit,
    aiMaterialsUsed,
    aiMaterialsRemaining,
    reservationsLimit: tierLimits.reservationsLimit,
    reservationsUsed,
    reservationsRemaining,
    tier,
    canGenerateMaterial,
    canCreateReservation,
  };

  if (!canGenerateMaterial) {
    return {
      allowed: false,
      reason: tierLimits.aiMaterialsLimit === 0
        ? 'AI Material generation is not available on the Free plan. Upgrade to Basic or Premium.'
        : `You've reached your monthly limit of ${tierLimits.aiMaterialsLimit} AI materials.`,
      limits,
    };
  }

  return { allowed: true, limits };
}

/**
 * [Legacy] Check if user can create reservation
 */
export async function checkCanCreateReservation(clerkId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limits: LegacyUsageLimits;
}> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
      limits: {
        aiMaterialsLimit: 0,
        aiMaterialsUsed: 0,
        aiMaterialsRemaining: 0,
        reservationsLimit: 0,
        reservationsUsed: 0,
        reservationsRemaining: 0,
        tier: 'free',
        canGenerateMaterial: false,
        canCreateReservation: false,
      },
    };
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const tier = subscription?.tier || 'free';
  const tierLimits = MUED_LMS_LIMITS[tier as keyof typeof MUED_LMS_LIMITS] || MUED_LMS_LIMITS.free;

  const aiMaterialsUsed = subscription?.aiMaterialsUsed || 0;
  const reservationsUsed = subscription?.reservationsUsed || 0;

  const aiMaterialsRemaining =
    tierLimits.aiMaterialsLimit === -1
      ? -1
      : tierLimits.aiMaterialsLimit === 0
      ? 0
      : Math.max(0, tierLimits.aiMaterialsLimit - aiMaterialsUsed);

  const reservationsRemaining =
    tierLimits.reservationsLimit === -1
      ? -1
      : tierLimits.reservationsLimit === 0
      ? 0
      : Math.max(0, tierLimits.reservationsLimit - reservationsUsed);

  const canGenerateMaterial =
    tierLimits.aiMaterialsLimit === -1 ||
    (tierLimits.aiMaterialsLimit > 0 && aiMaterialsRemaining > 0);

  const canCreateReservation =
    tierLimits.reservationsLimit === -1 ||
    (tierLimits.reservationsLimit > 0 && reservationsRemaining > 0);

  const limits: LegacyUsageLimits = {
    aiMaterialsLimit: tierLimits.aiMaterialsLimit,
    aiMaterialsUsed,
    aiMaterialsRemaining,
    reservationsLimit: tierLimits.reservationsLimit,
    reservationsUsed,
    reservationsRemaining,
    tier,
    canGenerateMaterial,
    canCreateReservation,
  };

  if (!canCreateReservation) {
    return {
      allowed: false,
      reason: tierLimits.reservationsLimit === 0
        ? 'Lesson reservations are not available on the Free plan. Upgrade to Basic or Premium.'
        : `You've reached your monthly limit of ${tierLimits.reservationsLimit} reservations.`,
      limits,
    };
  }

  return { allowed: true, limits };
}

/**
 * [Legacy] Increment AI material usage counter
 */
export async function incrementMaterialUsage(clerkId: string): Promise<void> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const result = await db
    .update(subscriptions)
    .set({
      aiMaterialsUsed: sql`ai_materials_used + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id))
    .returning();

  if (result.length === 0) {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'free',
      status: 'active',
      aiMaterialsUsed: 1,
      reservationsUsed: 0,
      hooConversationsUsed: 0,
    });
  }
}

/**
 * [Legacy] Increment reservation usage counter
 */
export async function incrementReservationUsage(clerkId: string): Promise<void> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const result = await db
    .update(subscriptions)
    .set({
      reservationsUsed: sql`reservations_used + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id))
    .returning();

  if (result.length === 0) {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'free',
      status: 'active',
      aiMaterialsUsed: 0,
      reservationsUsed: 1,
      hooConversationsUsed: 0,
    });
  }
}
