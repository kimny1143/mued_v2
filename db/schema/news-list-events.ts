/**
 * news_list_events (0066) — every MUEDsp news decision, keyed on email, append-only
 * (kimny 2026-10-30 「進めて」, conductor (a)).
 *
 * The Resend list is a window of the latest 1,000 (lib/marketing/list-window.ts), so it is a copy, not the record.
 * This table is the record: one row per checkbox answer (download, demo, cart) and per withdrawal.
 *
 * ★Rebuild rule (for whoever recreates the list from the DB): an email is on the list only when its LATEST
 *   granted/not_granted row is `granted` AND there is no `withdrawn` row recorded after that granted row.
 *   ★No row at all = unknown (everything before 2026-10-30) — never treated as consent.
 *   ★Repeated `withdrawn` rows for one email are normal (measured 2026-11-01: two footer-link GETs 8 s apart — a
 *   double click or a mail client loading the link). Not de-duplicated on write: under the rule above a second
 *   withdrawn row changes nothing, so readers judge by the latest row and never count rows.
 *
 * ★Why one append-only table and not columns (conductor (a)): the purchase and download inserts are the deliveries
 *   (license, download link). A column there would make a missing migration break a purchase; a separate best-effort
 *   insert cannot. And only a ledger keeps who ticked, when, where — and who withdrew.
 *
 * `marketing_consents` is the same idea for Clerk accounts (user_id NOT NULL) — these people have no account.
 */
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const newsListEvents = pgTable('news_list_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),                 // lower-cased
  status: text('status').notNull(),               // NewsListStatus (CHECK in 0066)
  surface: text('surface').notNull(),             // NewsListSurface (CHECK in 0066)
  productKey: text('product_key'),                // 'muedsat' | 'masterchain' | 'muedvox' | … ; null when not product-bound
  source: text('source'),                         // the page or origin, e.g. 'muedsat_lp', 'resend_export_20261030'
  locale: text('locale'),                         // 'ja' | 'en' when the form had one
  occurredAt: timestamp('occurred_at', { withTimezone: true }), // NULL = when it really happened is not known
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: index('idx_news_list_events_email').on(t.email),
  recordedAtIdx: index('idx_news_list_events_recorded_at').on(t.recordedAt),
}));

export type NewsListStatus = 'granted' | 'not_granted' | 'withdrawn';
export type NewsListSurface = 'download' | 'demo' | 'cart' | 'unsubscribe_link' | 'resend_footer' | 'import';
export type NewsListEvent = typeof newsListEvents.$inferSelect;
export type NewNewsListEvent = typeof newsListEvents.$inferInsert;
