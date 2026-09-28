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

import { pgTable, uuid, text, integer, timestamp, jsonb, index, boolean } from 'drizzle-orm/pg-core';
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
  email: text('email').notNull(),                     // buyer — ★re-issue address if the key ever leaks
  // ★The Ed25519 keyfile WE issued (lib/masterchain/license.ts) — NOT a FastSpring-generated serial.
  // The issuer changed 2026-07-25: FastSpring cannot sign with our private key, so a key it generated
  // could never pass the plugin's offline verification. email + this column together are the ONLY
  // recovery path from a signing-key leak (re-issue to every buyer → drop the old key in a new build),
  // because verification is offline and nothing can be revoked remotely.
  licenseKey: text('license_key'),
  licenseVersion: integer('license_version'),         // keyfile format version (LICENSE_VERSION)
  issuedAt: timestamp('issued_at'),                   // when we signed it (≠ createdAt on re-issue)
  // ★EULA 同意の事実を購入行に残す（kimny 2026-09-16）。★null 許容 ——★同意 gate を入れる前の行と
  // ★移行期を壊さないため。★版を持つのは、EULA が改訂された時に「どの版に同意したか」が要るから。
  eulaVersion: text('eula_version'),
  eulaAcceptedAt: timestamp('eula_accepted_at', { withTimezone: true }),
  productId: text('product_id').notNull(),            // 'muedsp_masterchain'
  // ★これは「当社の売上」でも「入金額」でもない —— 購入者が払った総額 (税込) である。
  // FastSpring が Merchant of Record なので、当社が受け取るのは手数料を引いた純額:
  //   購入者が払う  ¥12,856 (うち消費税 ¥1,169)  ← この欄に入る値
  //   当社が受け取る $63.98 ($69 − 手数料 $5.02)
  // ★同じ DB に `amount_cents` が3本 在り、dial 側の2本 (dial.ts:277,343・notNull) は
  //   「自社の価格」を指す。★同じ名前が別の意味を持っているので、集計を書く時は
  //   どのテーブルの amount_cents かを必ず見ること (freee課 検出 2026-08-04)。
  // 改名は migration になるため未実施。判断は #841 と同じく「見つけた」までで保留。
  amountCents: integer('amount_cents'),               // ★buyer gross (tax incl), NOT our revenue
  currency: text('currency'),                         // ★always the BUYER's currency (e.g. 'JPY')
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

// Clerk identity and canonical email each allow one trial, even after expiry.
export const masterchainTrials = pgTable('masterchain_trials', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  emailCanonical: text('email_canonical').notNull().unique(),
  clerkUserId: text('clerk_user_id').notNull().unique(), // Clerk string, NOT users.id UUID
  licenseKey: text('license_key').notNull(),
  licenseVersion: integer('license_version').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  eulaVersion: text('eula_version'),
  eulaAcceptedAt: timestamp('eula_accepted_at', { withTimezone: true }),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  firstTouch: jsonb('first_touch'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_masterchain_trials_email').on(t.email),
  createdAtIdx: index('idx_masterchain_trials_created_at').on(t.createdAt),
}));

export type MasterchainTrial = typeof masterchainTrials.$inferSelect;
export type NewMasterchainTrial = typeof masterchainTrials.$inferInsert;
