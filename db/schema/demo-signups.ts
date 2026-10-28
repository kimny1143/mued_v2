/**
 * demo_signups — who asked for a paid product's demo (masterchain, MUEDvox), in our own DB.
 *
 * Until 0065 the demo entrance (lib/masterchain/demo-handler.ts) wrote the address only to the Resend list. After the
 * marketing plan was cancelled (2026-10-27) the list is past the free tier's 1,000 contacts, so every new demo
 * sign-up was recorded nowhere we own (kimny 「直そう。」). Same level as plugin_entitlements: email, product, the page (source), when,
 * the page's locale, first-touch utm, plus whether the person ticked the news checkbox and whether they were added to
 * the Resend list (news_consent AND NOT audience_added = whom a later re-import must add). UNIQUE(email, product_key): a repeat request is a no-op.
 * ★Not an entitlement and not read by the portal: a demo is the public installer without a key.
 * PURE ADDITIVE — same precedent as plugin_entitlements and plugin_license_grants (0064).
 */
import { pgTable, uuid, text, timestamp, jsonb, boolean, index, unique } from 'drizzle-orm/pg-core';

export const demoSignups = pgTable('demo_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),                          // lower-cased
  productKey: text('product_key').notNull(),               // 'masterchain' | 'muedvox'
  source: text('source').notNull(),                        // the page the form was on: 'muedsp_lp' | 'muedvox_lp'
  locale: text('locale'),                                  // the page's locale; 'en' is also the schema default
  firstTouch: jsonb('first_touch'),                        // utm* from the form, when present
  newsConsent: boolean('news_consent').notNull(),          // ticked the MUEDsp news checkbox (default off)
  audienceAdded: boolean('audience_added').notNull(),      // a consenting person reached the Resend list (false without consent)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_demo_signups_email').on(t.email),
  emailProductUq: unique('uq_demo_signups_email_product').on(t.email, t.productKey),
}));
