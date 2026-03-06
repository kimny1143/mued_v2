/**
 * DialRepository - Data access layer for MUEDial
 *
 * Provides type-safe CRUD operations for:
 * - dial_sessions (with guest support)
 * - dial_purchases (one-time)
 * - dial_subscriptions (monthly packs)
 */

import { db } from '@/db';
import {
  dialSessions,
  dialPurchases,
  dialSubscriptions,
  dialTracks,
  dialTasks,
} from '@/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export type DialSession = typeof dialSessions.$inferSelect;
export type DialPurchase = typeof dialPurchases.$inferSelect;
export type DialSubscription = typeof dialSubscriptions.$inferSelect;
export type DialTrack = typeof dialTracks.$inferSelect;
export type DialTask = typeof dialTasks.$inferSelect;

export type CreateDialSessionInput = typeof dialSessions.$inferInsert;
export type CreateDialPurchaseInput = typeof dialPurchases.$inferInsert;

// ========================================
// DialRepository Class
// ========================================

export class DialRepository {
  // ─── Sessions ─────────────────────────────────────────────────────────────

  async createSession(input: CreateDialSessionInput): Promise<DialSession> {
    const [session] = await db.insert(dialSessions).values(input).returning();
    return session;
  }

  async findSessionById(id: string): Promise<DialSession | null> {
    const session = await db.query.dialSessions.findFirst({
      where: eq(dialSessions.id, id),
    });
    return session ?? null;
  }

  async findSessionByGuestToken(token: string): Promise<DialSession | null> {
    const session = await db.query.dialSessions.findFirst({
      where: and(
        eq(dialSessions.guestToken, token),
        gt(dialSessions.guestTokenExpiresAt, new Date()),
      ),
    });
    return session ?? null;
  }

  async findSessionsByUserId(userId: string): Promise<DialSession[]> {
    return db.query.dialSessions.findMany({
      where: eq(dialSessions.userId, userId),
      orderBy: [desc(dialSessions.createdAt)],
    });
  }

  async updateSession(id: string, data: Partial<typeof dialSessions.$inferInsert>): Promise<DialSession | null> {
    const [updated] = await db
      .update(dialSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dialSessions.id, id))
      .returning();
    return updated ?? null;
  }

  // ─── Purchases ────────────────────────────────────────────────────────────

  async createPurchase(input: CreateDialPurchaseInput): Promise<DialPurchase> {
    const [purchase] = await db.insert(dialPurchases).values(input).returning();
    return purchase;
  }

  async findPurchaseById(id: string): Promise<DialPurchase | null> {
    const purchase = await db.query.dialPurchases.findFirst({
      where: eq(dialPurchases.id, id),
    });
    return purchase ?? null;
  }

  async findPurchasesBySessionId(sessionId: string): Promise<DialPurchase[]> {
    return db.query.dialPurchases.findMany({
      where: eq(dialPurchases.sessionId, sessionId),
      orderBy: [desc(dialPurchases.createdAt)],
    });
  }

  async updatePurchase(id: string, data: Partial<typeof dialPurchases.$inferInsert>): Promise<DialPurchase | null> {
    const [updated] = await db
      .update(dialPurchases)
      .set(data)
      .where(eq(dialPurchases.id, id))
      .returning();
    return updated ?? null;
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async findActiveSubscriptionByUserId(userId: string): Promise<DialSubscription | null> {
    const sub = await db.query.dialSubscriptions.findFirst({
      where: and(
        eq(dialSubscriptions.userId, userId),
        eq(dialSubscriptions.status, 'active'),
      ),
    });
    return sub ?? null;
  }

  async findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<DialSubscription | null> {
    const sub = await db.query.dialSubscriptions.findFirst({
      where: eq(dialSubscriptions.stripeSubscriptionId, stripeSubscriptionId),
    });
    return sub ?? null;
  }

  async decrementCredits(subscriptionId: string): Promise<DialSubscription | null> {
    const sub = await this.findSubscriptionById(subscriptionId);
    if (!sub || sub.mixCreditsRemaining <= 0) return null;

    const [updated] = await db
      .update(dialSubscriptions)
      .set({
        mixCreditsRemaining: sub.mixCreditsRemaining - 1,
        updatedAt: new Date(),
      })
      .where(eq(dialSubscriptions.id, subscriptionId))
      .returning();
    return updated ?? null;
  }

  private async findSubscriptionById(id: string): Promise<DialSubscription | null> {
    const sub = await db.query.dialSubscriptions.findFirst({
      where: eq(dialSubscriptions.id, id),
    });
    return sub ?? null;
  }
}

// ========================================
// Singleton Instance
// ========================================

export const dialRepository = new DialRepository();
