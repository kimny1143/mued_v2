/**
 * User portal — plugin_entitlements (P-1 of docs/portal/plan-brief-user-portal-20260717.md).
 *
 * The self-owned, email-keyed ownership record for the FREE MUEDsp modules (MUEDsat / MUEDlim / future):
 * "this email has claimed a download → the portal (/dashboard/plugins) shows it + the latest version"
 * so a logged-in user updates from the portal instead of re-fetching an email link (kimny's 定着装置).
 *
 * Same shape/doctrine as masterchain_purchases/interest (0057): email-keyed and guest-friendly —
 * userId is nullable because the subscribe email-gate is UNAUTHENTICATED (no Clerk session at write
 * time), so the portal joins by the Clerk-VERIFIED email instead of user_id. firstTouch jsonb mirrors
 * dialSessions.first_touch / masterchain.first_touch (gaClientId + utm*). UNIQUE(email, plugin_key)
 * makes a re-subscribe idempotent (onConflictDoNothing). PURE ADDITIVE (Tier 2) — same precedent as
 * first_touch (0050) / marketing_consents (0053) / masterchain (0057).
 */

import { pgTable, uuid, text, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { users } from '../schema';

export const pluginEntitlements = pgTable('plugin_entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),                     // lower-cased ownership key (portal join key)
  pluginKey: text('plugin_key').notNull(),            // 'muedsat' | 'muedlim' | future module
  source: text('source').notNull(),                   // capture surface, e.g. 'muedsat_lp'
  firstTouch: jsonb('first_touch'),                   // gaClientId + utm* (attribution parity)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // nullable (guest; unauth at subscribe)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_plugin_entitlements_email').on(t.email),
  pluginIdx: index('idx_plugin_entitlements_plugin').on(t.pluginKey),
  emailPluginUq: unique('uq_plugin_entitlements_email_plugin').on(t.email, t.pluginKey), // idempotent re-subscribe
}));

export type PluginEntitlement = typeof pluginEntitlements.$inferSelect;
export type NewPluginEntitlement = typeof pluginEntitlements.$inferInsert;
