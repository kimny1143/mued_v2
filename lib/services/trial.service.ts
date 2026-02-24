/**
 * Trial Service - Free tier 3-day trial management
 *
 * Trial Details:
 * - Duration: 3 days from first Hoo AI use
 * - Turns limit: 50 turns
 * - Model: Claude Haiku (Basic tier equivalent)
 * - Features: Full Hoo AI access, unlimited logs, DAW integration, dashboard
 *
 * After trial:
 * - Hoo AI becomes unavailable
 * - User must upgrade to Basic for continued access (unlimited Hoo AI)
 *
 * ---
 * iOS Trial Flow (Phase 1 - to be implemented in apps/muednote-mobile):
 * 1. Free user finishes recording session
 * 2. App presents "Review with Hoo (3-day free trial)" CTA
 * 3. User signs in (Sign in with Apple) → trial auto-starts via this service
 * 4. After 3 days or 50 turns → Basic upgrade prompt
 * 5. App Review Notes: "Core features (recording, playback) available without login.
 *    Hoo AI chat is an additional feature with a 3-day free trial."
 */

import { db } from '@/db/edge';
import { subscriptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { SubscriptionTier } from '@/lib/repositories/subscriptions.repository';

// ========================================
// Constants
// ========================================

export const TRIAL_DAYS = 3;
export const TRIAL_TURNS_LIMIT = 50;

// ========================================
// Types
// ========================================

export interface TrialStatus {
  /** Whether user is currently in an active trial */
  isInTrial: boolean;
  /** Whether user has ever started a trial */
  hasTrialStarted: boolean;
  /** Whether trial has been fully used (expired or turns exhausted) */
  trialUsed: boolean;
  /** Trial start timestamp (if started) */
  trialStartedAt: Date | null;
  /** Trial end timestamp (if started) */
  trialEndsAt: Date | null;
  /** Days remaining in trial (0 if expired) */
  daysRemaining: number;
  /** Turns used during trial */
  turnsUsed: number;
  /** Turns remaining in trial */
  turnsRemaining: number;
  /** Reason if trial is not active */
  reason?: 'NOT_STARTED' | 'EXPIRED' | 'TURNS_EXHAUSTED' | 'ALREADY_USED' | 'PAID_TIER';
}

export interface TrialEligibility {
  /** Whether user can start a trial */
  canStartTrial: boolean;
  /** Reason why trial cannot be started */
  reason?: 'ALREADY_STARTED' | 'ALREADY_USED' | 'PAID_TIER' | 'NO_SUBSCRIPTION';
}

// ========================================
// Trial Service Class
// ========================================

export class TrialService {
  /**
   * Get current trial status for a user
   */
  async getTrialStatus(userId: string): Promise<TrialStatus> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return {
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: 0,
        turnsUsed: 0,
        turnsRemaining: TRIAL_TURNS_LIMIT,
        reason: 'NOT_STARTED',
      };
    }

    // Paid tier users don't need trials
    if (subscription.tier !== 'free') {
      return {
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: 0,
        turnsUsed: 0,
        turnsRemaining: 0,
        reason: 'PAID_TIER',
      };
    }

    const trialStartedAt = subscription.trialStartedAt;
    const trialUsed = subscription.trialUsed ?? false;
    const trialTurnsUsed = subscription.trialTurnsUsed ?? 0;

    // Trial never started
    if (!trialStartedAt) {
      return {
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: TRIAL_DAYS,
        turnsUsed: 0,
        turnsRemaining: TRIAL_TURNS_LIMIT,
        reason: 'NOT_STARTED',
      };
    }

    // Trial already marked as used (fully consumed)
    if (trialUsed) {
      return {
        isInTrial: false,
        hasTrialStarted: true,
        trialUsed: true,
        trialStartedAt,
        trialEndsAt: this.calculateTrialEndDate(trialStartedAt),
        daysRemaining: 0,
        turnsUsed: trialTurnsUsed,
        turnsRemaining: 0,
        reason: 'ALREADY_USED',
      };
    }

    // Calculate time remaining
    const trialEndsAt = this.calculateTrialEndDate(trialStartedAt);
    const now = new Date();
    const msRemaining = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const turnsRemaining = Math.max(0, TRIAL_TURNS_LIMIT - trialTurnsUsed);

    // Check if trial has expired
    const timeExpired = now >= trialEndsAt;
    const turnsExhausted = turnsRemaining === 0;

    if (timeExpired) {
      // Mark trial as used if not already
      await this.markTrialAsUsed(userId);
      return {
        isInTrial: false,
        hasTrialStarted: true,
        trialUsed: true,
        trialStartedAt,
        trialEndsAt,
        daysRemaining: 0,
        turnsUsed: trialTurnsUsed,
        turnsRemaining: 0,
        reason: 'EXPIRED',
      };
    }

    if (turnsExhausted) {
      // Mark trial as used if not already
      await this.markTrialAsUsed(userId);
      return {
        isInTrial: false,
        hasTrialStarted: true,
        trialUsed: true,
        trialStartedAt,
        trialEndsAt,
        daysRemaining,
        turnsUsed: trialTurnsUsed,
        turnsRemaining: 0,
        reason: 'TURNS_EXHAUSTED',
      };
    }

    // Trial is active
    return {
      isInTrial: true,
      hasTrialStarted: true,
      trialUsed: false,
      trialStartedAt,
      trialEndsAt,
      daysRemaining,
      turnsUsed: trialTurnsUsed,
      turnsRemaining,
    };
  }

  /**
   * Check if user is eligible to start a trial
   */
  async checkTrialEligibility(userId: string): Promise<TrialEligibility> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return {
        canStartTrial: false,
        reason: 'NO_SUBSCRIPTION',
      };
    }

    // Paid tier users don't need trials
    if (subscription.tier !== 'free') {
      return {
        canStartTrial: false,
        reason: 'PAID_TIER',
      };
    }

    // Already used trial
    if (subscription.trialUsed) {
      return {
        canStartTrial: false,
        reason: 'ALREADY_USED',
      };
    }

    // Trial already started
    if (subscription.trialStartedAt) {
      return {
        canStartTrial: false,
        reason: 'ALREADY_STARTED',
      };
    }

    return {
      canStartTrial: true,
    };
  }

  /**
   * Start a trial for a user
   * Called when a Free tier user first uses Hoo AI
   */
  async startTrial(userId: string): Promise<{ success: boolean; trialStartedAt: Date | null; error?: string }> {
    const eligibility = await this.checkTrialEligibility(userId);

    if (!eligibility.canStartTrial) {
      return {
        success: false,
        trialStartedAt: null,
        error: eligibility.reason,
      };
    }

    const now = new Date();

    const [updated] = await db
      .update(subscriptions)
      .set({
        trialStartedAt: now,
        trialUsed: false,
        trialTurnsUsed: 0,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    if (!updated) {
      return {
        success: false,
        trialStartedAt: null,
        error: 'UPDATE_FAILED',
      };
    }

    return {
      success: true,
      trialStartedAt: now,
    };
  }

  /**
   * Increment trial turns used
   * Called after each successful Hoo AI response during trial
   */
  async incrementTrialTurns(userId: string): Promise<{ turnsUsed: number; turnsRemaining: number }> {
    const [updated] = await db
      .update(subscriptions)
      .set({
        trialTurnsUsed: sql`COALESCE(${subscriptions.trialTurnsUsed}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning({
        trialTurnsUsed: subscriptions.trialTurnsUsed,
      });

    const turnsUsed = updated?.trialTurnsUsed ?? 1;
    const turnsRemaining = Math.max(0, TRIAL_TURNS_LIMIT - turnsUsed);

    // Auto-mark trial as used if turns exhausted
    if (turnsRemaining === 0) {
      await this.markTrialAsUsed(userId);
    }

    return {
      turnsUsed,
      turnsRemaining,
    };
  }

  /**
   * Mark trial as used (expired or turns exhausted)
   */
  async markTrialAsUsed(userId: string): Promise<void> {
    await db
      .update(subscriptions)
      .set({
        trialUsed: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  /**
   * Get the effective tier for a user
   * Returns 'basic' if user is in active trial, otherwise returns actual tier
   */
  async getEffectiveTier(userId: string): Promise<SubscriptionTier> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return 'free';
    }

    // Non-free tiers return as-is
    if (subscription.tier !== 'free') {
      return subscription.tier as SubscriptionTier;
    }

    // Check if in active trial
    const trialStatus = await this.getTrialStatus(userId);
    if (trialStatus.isInTrial) {
      return 'basic'; // Trial users get Basic tier access
    }

    return 'free';
  }

  /**
   * Check if user can use Hoo AI (considering trial)
   */
  async canUseHooAI(userId: string): Promise<{
    allowed: boolean;
    tier: SubscriptionTier;
    effectiveTier: SubscriptionTier;
    isInTrial: boolean;
    trialStatus?: TrialStatus;
    reason?: string;
  }> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return {
        allowed: false,
        tier: 'free',
        effectiveTier: 'free',
        isInTrial: false,
        reason: 'NO_SUBSCRIPTION',
      };
    }

    const tier = subscription.tier as SubscriptionTier;

    // Paid tiers can always use Hoo AI (within their limits)
    if (tier !== 'free') {
      return {
        allowed: true,
        tier,
        effectiveTier: tier,
        isInTrial: false,
      };
    }

    // Free tier: check trial status
    const trialStatus = await this.getTrialStatus(userId);

    if (trialStatus.isInTrial) {
      return {
        allowed: true,
        tier: 'free',
        effectiveTier: 'basic', // Trial gives Basic access
        isInTrial: true,
        trialStatus,
      };
    }

    // Trial not started - user can start trial
    if (!trialStatus.hasTrialStarted) {
      return {
        allowed: false, // Will start trial on first use
        tier: 'free',
        effectiveTier: 'free',
        isInTrial: false,
        trialStatus,
        reason: 'TRIAL_NOT_STARTED',
      };
    }

    // Trial expired or exhausted
    return {
      allowed: false,
      tier: 'free',
      effectiveTier: 'free',
      isInTrial: false,
      trialStatus,
      reason: trialStatus.reason,
    };
  }

  // ========================================
  // Private Helpers
  // ========================================

  private calculateTrialEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + TRIAL_DAYS);
    return endDate;
  }
}

// ========================================
// Singleton Instance
// ========================================

export const trialService = new TrialService();
