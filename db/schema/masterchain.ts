/**
 * Paid line — MUEDsp masterchain ($69) interest + purchase ledgers.
 *
 * Two self-owned tables (design = docs/paid-line/*, conductor-approved #670):
 *  - masterchain_interest  (C2): pre-launch "notify me at launch" signals, SEPARATE from the free
 *    module (MUEDsat/MUEDlim) download lists — the un-polluted denominator for the 90-day judgment.
 *  - masterchain_purchases (C+): the "客は所有する" buyer record — email + the license key FastSpring
 *    issued — recorded here regardless of FastSpring, so a future account/subscription layer can be
 *    built on top (Q2 = Valhalla serial, revocation-not-possible → the reflux DB is that foundation).
 *
 * Both are email-keyed and guest-friendly (userId nullable — a $69 buyer / interest lead usually has
 * no app account, like dial guests). PURE ADDITIVE (Tier 2) — same precedent as first_touch (0050) /
 * marketing_consents (0053). first_touch jsonb mirrors dialSessions.first_touch (gaClientId + utm*).
 */

import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from '../schema';

// ── C2: masterchain interest (pre-launch high-intent, separate from the free lists) ──────────────
export const masterchainInterest = pgTable('masterchain_interest', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),            // dedup key (one interest row per email)
  locale: text('locale').notNull(),                   // 'ja' | 'en' (copy language shown)
  source: text('source').notNull(),                   // capture surface, e.g. 'muedsp_masterchain_s1'
  firstTouch: jsonb('first_touch'),                   // gaClientId + utm* → channel-level denominator
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // nullable (guest)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_masterchain_interest_email').on(t.email),
  sourceIdx: index('idx_masterchain_interest_source').on(t.source),
  createdAtIdx: index('idx_masterchain_interest_created_at').on(t.createdAt),
}));

export type MasterchainInterest = typeof masterchainInterest.$inferSelect;
export type NewMasterchainInterest = typeof masterchainInterest.$inferInsert;

// ── C+: masterchain purchases (the self-owned buyer + license-key record) ─────────────────────────
export const masterchainPurchases = pgTable('masterchain_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: text('order_id').notNull().unique(),       // FastSpring order id (idempotent join key)
  email: text('email').notNull(),                     // buyer
  licenseKey: text('license_key'),                    // key FastSpring issued (ownership + future acct layer)
  productId: text('product_id').notNull(),            // 'muedsp_masterchain'
  amountCents: integer('amount_cents'),               // order total (smallest unit)
  currency: text('currency'),                         // e.g. 'USD'
  buyerCountry: text('buyer_country'),
  firstTouch: jsonb('first_touch'),                   // inherited gaClientId + utm* (attribution)
  fastspringSubscriptionId: text('fastspring_subscription_id'), // null for buy-once; reserved for future subs
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // nullable (guest)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_masterchain_purchases_email').on(t.email),
  createdAtIdx: index('idx_masterchain_purchases_created_at').on(t.createdAt),
}));

export type MasterchainPurchase = typeof masterchainPurchases.$inferSelect;
export type NewMasterchainPurchase = typeof masterchainPurchases.$inferInsert;
