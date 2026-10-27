/**
 * demo_signups — who asked for a paid product's demo (masterchain, MUEDvox), in our own DB.
 *
 * Until 0065 the demo entrance (lib/masterchain/demo-handler.ts) wrote the address only to the Resend list. After the
 * marketing plan was cancelled (2026-10-27) the list is past the free tier's 1,000 contacts, so every new demo
 * sign-up was recorded nowhere we own (kimny 「直そう。」). Same level as plugin_entitlements: email, product, the page (source), when,
 * the page's locale, first-touch utm, plus whether the news notice was on the form and whether the Resend add worked
 * (so a later re-import knows whom the list is missing). UNIQUE(email, product_key): a repeat request is a no-op.
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
  newsNoticeShown: boolean('news_notice_shown').notNull(), // the form says the address is used for MUEDsp news
  audienceAdded: boolean('audience_added').notNull(),      // did the Resend list add succeed at sign-up time
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_demo_signups_email').on(t.email),
  emailProductUq: unique('uq_demo_signups_email_product').on(t.email, t.productKey),
}));
