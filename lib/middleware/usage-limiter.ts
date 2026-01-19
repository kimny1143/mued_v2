import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Usage Limiter Middleware
 *
 * Enforces subscription tier-based usage limits for MUEDnote:
 * - Hoo AI Conversations
 */

export interface UsageLimits {
  hooConversationsLimit: number; // -1 = unlimited, 0 = not available
  hooConversationsUsed: number;
  hooConversationsRemaining: number;
  tier: string;
  canUseHooAI: boolean;
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
      free: { hooConversationsLimit: -1 },
      basic: { hooConversationsLimit: -1 },
      premium: { hooConversationsLimit: -1 },
    };
  }

  // Production tier limits for MUEDnote
  // IMPORTANT: These values must stay in sync with lib/repositories/subscriptions.repository.ts
  return {
    free: { hooConversationsLimit: 0 }, // Fixed responses only, no AI
    basic: { hooConversationsLimit: 150 }, // 150 conversations/month
    premium: { hooConversationsLimit: -1 }, // Unlimited (BYOK)
  };
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
      hooConversationsLimit: TIER_LIMITS.free.hooConversationsLimit,
      hooConversationsUsed: 0,
      hooConversationsRemaining: 0,
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

  const hooConversationsUsed = subscription?.hooConversationsUsed || 0;

  const hooConversationsRemaining =
    limits.hooConversationsLimit === -1
      ? -1
      : limits.hooConversationsLimit === 0
      ? 0
      : Math.max(0, limits.hooConversationsLimit - hooConversationsUsed);

  // Can use Hoo AI if:
  // - Limit is unlimited (-1), OR
  // - Limit > 0 AND remaining > 0
  const canUseHooAI =
    limits.hooConversationsLimit === -1 ||
    (limits.hooConversationsLimit > 0 && hooConversationsRemaining > 0);

  return {
    hooConversationsLimit: limits.hooConversationsLimit,
    hooConversationsUsed,
    hooConversationsRemaining,
    tier,
    canUseHooAI,
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
}> {
  const limits = await getUserUsageLimits(clerkId);

  if (limits.hooConversationsLimit === 0) {
    return {
      allowed: false,
      reason: 'Hoo AI is not available on the Free plan. Upgrade to Basic for 150 AI conversations per month.',
      limits,
    };
  }

  if (!limits.canUseHooAI) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.hooConversationsLimit} Hoo conversations. Upgrade to Premium for unlimited access.`,
      limits,
    };
  }

  return {
    allowed: true,
    limits,
  };
}

/**
 * Increment Hoo conversation usage counter (atomic operation)
 * @param clerkId - Clerk user ID
 */
export async function incrementHooConversationUsage(clerkId: string): Promise<void> {
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
    });
  }
}

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
        hooConversationsUsed: 0,
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
        'Voice transcription (Whisper)',
        'Log storage: Unlimited',
        'DAW log integration',
        'Dashboard & Export',
        'Hoo AI: 150 conversations/month',
      ];
    case 'premium':
      return [
        'All Basic features',
        'Hoo AI: Unlimited (BYOK)',
        'Choose your own AI model',
        'System prompt access',
        'Full customization',
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
