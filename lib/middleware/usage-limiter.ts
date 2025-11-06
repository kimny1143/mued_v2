import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Usage Limiter Middleware
 *
 * Enforces subscription tier-based usage limits:
 * - AI Material Generation
 * - Lesson Reservations
 */

export interface UsageLimits {
  aiMaterialsLimit: number; // -1 = unlimited
  aiMaterialsUsed: number;
  aiMaterialsRemaining: number;
  reservationsLimit: number; // -1 = unlimited
  reservationsUsed: number;
  reservationsRemaining: number;
  tier: string;
  canGenerateMaterial: boolean;
  canCreateReservation: boolean;
}

// Tier-based limits configuration
// 開発・テスト用に制限を完全解放（本番環境も一時的に含む）
// TODO: テスト完了後に本番環境の制限を戻す

// IMPORTANT: Function-level evaluation to ensure runtime environment is checked
function getTierLimits() {
  // 一時的に全環境でunlimitedに設定（テスト中）
  const UNLIMITED_FOR_TESTING = true; // TODO: テスト完了後にfalseに変更

  if (UNLIMITED_FOR_TESTING) {
    return {
      freemium: {
        aiMaterialsLimit: -1,
        reservationsLimit: -1,
      },
      starter: {
        aiMaterialsLimit: -1,
        reservationsLimit: -1,
      },
      basic: {
        aiMaterialsLimit: -1,
        reservationsLimit: -1,
      },
      premium: {
        aiMaterialsLimit: -1,
        reservationsLimit: -1,
      },
    };
  }

  // 本番環境の制限（テスト完了後に使用）
  return {
    freemium: {
      aiMaterialsLimit: 3,
      reservationsLimit: 1,
    },
    starter: {
      aiMaterialsLimit: 3,
      reservationsLimit: 1,
    },
    basic: {
      aiMaterialsLimit: -1, // unlimited
      reservationsLimit: 5,
    },
    premium: {
      aiMaterialsLimit: -1, // unlimited
      reservationsLimit: -1, // unlimited
    },
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
    // Return freemium limits if user not found
    return {
      aiMaterialsLimit: TIER_LIMITS.freemium.aiMaterialsLimit,
      aiMaterialsUsed: 0,
      aiMaterialsRemaining: TIER_LIMITS.freemium.aiMaterialsLimit,
      reservationsLimit: TIER_LIMITS.freemium.reservationsLimit,
      reservationsUsed: 0,
      reservationsRemaining: TIER_LIMITS.freemium.reservationsLimit,
      tier: 'freemium',
      canGenerateMaterial: true,
      canCreateReservation: true,
    };
  }

  // Get user's subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  // Default to freemium if no subscription
  const tier = subscription?.tier || 'freemium';
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.freemium;

  const aiMaterialsUsed = subscription?.aiMaterialsUsed || 0;
  const reservationsUsed = subscription?.reservationsUsed || 0;

  const aiMaterialsRemaining =
    limits.aiMaterialsLimit === -1
      ? -1
      : Math.max(0, limits.aiMaterialsLimit - aiMaterialsUsed);

  const reservationsRemaining =
    limits.reservationsLimit === -1
      ? -1
      : Math.max(0, limits.reservationsLimit - reservationsUsed);

  return {
    aiMaterialsLimit: limits.aiMaterialsLimit,
    aiMaterialsUsed,
    aiMaterialsRemaining,
    reservationsLimit: limits.reservationsLimit,
    reservationsUsed,
    reservationsRemaining,
    tier,
    canGenerateMaterial:
      limits.aiMaterialsLimit === -1 || aiMaterialsRemaining > 0,
    canCreateReservation:
      limits.reservationsLimit === -1 || reservationsRemaining > 0,
  };
}

/**
 * Check if user can generate AI material
 * @param clerkId - Clerk user ID
 */
export async function checkCanGenerateMaterial(clerkId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limits: UsageLimits;
}> {
  const limits = await getUserUsageLimits(clerkId);

  if (!limits.canGenerateMaterial) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.aiMaterialsLimit} AI materials. Upgrade to Basic or Premium for unlimited generation.`,
      limits,
    };
  }

  return {
    allowed: true,
    limits,
  };
}

/**
 * Check if user can create reservation
 * @param clerkId - Clerk user ID
 */
export async function checkCanCreateReservation(clerkId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limits: UsageLimits;
}> {
  const limits = await getUserUsageLimits(clerkId);

  if (!limits.canCreateReservation) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.reservationsLimit} reservations. Upgrade to Basic or Premium for more sessions.`,
      limits,
    };
  }

  return {
    allowed: true,
    limits,
  };
}

/**
 * Increment AI material usage counter (atomic operation)
 * @param clerkId - Clerk user ID
 */
export async function incrementMaterialUsage(clerkId: string): Promise<void> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // アトミックなインクリメント操作
  // UPDATEが影響した行数をチェックして、サブスクリプションが存在するか判定
  const result = await db
    .update(subscriptions)
    .set({
      aiMaterialsUsed: sql`ai_materials_used + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id))
    .returning();

  // サブスクリプションが存在しない場合は作成
  if (result.length === 0) {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'freemium',
      status: 'active',
      aiMaterialsUsed: 1,
      reservationsUsed: 0,
    });
  }
}

/**
 * Increment reservation usage counter (atomic operation)
 * @param clerkId - Clerk user ID
 */
export async function incrementReservationUsage(clerkId: string): Promise<void> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // アトミックなインクリメント操作
  // UPDATEが影響した行数をチェックして、サブスクリプションが存在するか判定
  const result = await db
    .update(subscriptions)
    .set({
      reservationsUsed: sql`reservations_used + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id))
    .returning();

  // サブスクリプションが存在しない場合は作成
  if (result.length === 0) {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'freemium',
      status: 'active',
      aiMaterialsUsed: 0,
      reservationsUsed: 1,
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
        aiMaterialsUsed: 0,
        reservationsUsed: 0,
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: string) {
  const tierConfig = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.freemium;

  return {
    tier,
    displayName: tier.charAt(0).toUpperCase() + tier.slice(1),
    price:
      tier === 'freemium'
        ? 0
        : tier === 'starter'
        ? 9.99
        : tier === 'basic'
        ? 19.99
        : 49.99,
    limits: tierConfig,
    features: getFeaturesList(tier),
  };
}

function getFeaturesList(tier: string): string[] {
  switch (tier) {
    case 'freemium':
      return [
        '3 AI materials per month',
        '1 mentor session per month',
        'Basic analytics',
        'Community support',
      ];
    case 'starter':
      return [
        '3 AI materials per month',
        '1 mentor session per month',
        'Basic analytics',
        'Email support',
      ];
    case 'basic':
      return [
        'Unlimited AI materials',
        '5 mentor sessions per month',
        'Advanced analytics',
        'Priority email support',
        'Custom study plans',
      ];
    case 'premium':
      return [
        'Unlimited AI materials',
        'Unlimited mentor sessions',
        'Advanced analytics',
        '24/7 priority support',
        'Custom study plans',
        '1-on-1 learning consultant',
        'Exclusive webinars',
      ];
    default:
      return [];
  }
}

/**
 * Check if tier upgrade is valid
 */
export function isValidUpgrade(currentTier: string, newTier: string): boolean {
  const tierHierarchy = ['freemium', 'starter', 'basic', 'premium'];
  const currentIndex = tierHierarchy.indexOf(currentTier);
  const newIndex = tierHierarchy.indexOf(newTier);

  return newIndex > currentIndex;
}
