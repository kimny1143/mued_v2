/**
 * Marketing consent ledger — the source of truth for the self-owned list (product課 handoff
 * docs/handoff-self-owned-list-impl-mued-20260611).
 *
 * Two-layer design: this append-only event ledger records every grant/withdrawal (who, when, which
 * policy version, where), satisfying APPI/GDPR consent-management auditability. The current value is
 * de-normalized onto users.marketing_consent for fast list extraction (WHERE marketing_consent=true).
 *
 * All additive / Tier 2 — same shape as the first_touch (migration 0050) precedent.
 */

import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

export const marketingConsents = pgTable('marketing_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull().default('email'), // future: LINE, etc.
  status: text('status').notNull(),                    // 'granted' | 'withdrawn'
  policyVersion: text('policy_version').notNull(),      // privacy policy version at consent time
  locale: text('locale').notNull(),                    // 'ja' | 'en' (language the copy was shown in)
  source: text('source').notNull(),                    // 'free15_claim' | 'onboarding' | 'settings' | 'import'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_marketing_consents_user').on(t.userId),
  statusIdx: index('idx_marketing_consents_status').on(t.status),
}));

export const marketingConsentsRelations = relations(marketingConsents, ({ one }) => ({
  user: one(users, { fields: [marketingConsents.userId], references: [users.id] }),
}));

export type MarketingConsent = typeof marketingConsents.$inferSelect;
export type NewMarketingConsent = typeof marketingConsents.$inferInsert;

/** Consent event source — where the grant/withdrawal originated. */
export type MarketingConsentSource = 'free15_claim' | 'onboarding' | 'settings' | 'import';
export type MarketingConsentStatus = 'granted' | 'withdrawn';
