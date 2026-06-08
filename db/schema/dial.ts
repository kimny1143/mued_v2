/**
 * MUEDial Schema - RoEx-based Mixing/Mastering Service
 *
 * Tables:
 * - dial_sessions: User mixing sessions (guest + logged-in)
 * - dial_tracks: Uploaded audio stems
 * - dial_tasks: RoEx API task tracking
 * - dial_messages: Hoo conversation log
 * - dial_fx_sheets: FX parameter sheets (paid download)
 * - dial_credit_ledger: RoEx credit accounting
 * - dial_purchases: One-time purchases
 * - dial_subscriptions: Monthly mix credit packs
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  serial,
  boolean,
  index,
  uniqueIndex,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from '../schema';

// ========================================
// Enum Definitions
// ========================================

export const dialModeEnum = pgEnum('dial_mode', [
  'omakase',   // Automatic — upload → preview → final
  'dialogue',  // Interactive — Hoo guides parameter adjustments
]);

export const dialSessionStatusEnum = pgEnum('dial_session_status', [
  'uploading',   // Tracks being uploaded
  'previewing',  // Preview mix in progress
  'mixing',      // Final mix in progress
  'mastering',   // Mastering in progress
  'completed',   // All done
  'archived',    // User archived
]);

export const dialTaskTypeEnum = pgEnum('dial_task_type', [
  'preview',
  'mix_check',           // Advanced preview with EQ/comp (250cr, WAV) — user listens & provides feedback
  'final_basic',         // Omakase final (gain only)
  'final_advanced',      // Dialogue final with EQ/comp adjustments
  'mastering_preview',   // Mastering preview (FREE)
  'mastering',           // Mastering final (220cr)
]);

export const dialTaskStatusEnum = pgEnum('dial_task_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const dialCreditActionEnum = pgEnum('dial_credit_action', [
  'purchase',
  'consume',
  'refund',
]);

// ========================================
// Tables
// ========================================

/** MUEDial session — one per mixing project */
export const dialSessions = pgTable('dial_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.clerkId), // nullable for guests
  mode: dialModeEnum('mode'), // null = mastering-only (no mix)
  masteringMode: text('mastering_mode'), // 'omakase' | 'dialogue' | null
  status: dialSessionStatusEnum('status').notNull().default('uploading'),
  musicalStyle: text('musical_style').notNull(), // MusicalStyle enum value
  title: text('title'), // User-given project name
  draftNumber: integer('draft_number').notNull().default(1), // Per-user auto-increment session number
  // Guest access fields
  guestEmail: text('guest_email'),
  guestToken: text('guest_token').unique(), // 64-char hex for session access
  guestTokenExpiresAt: timestamp('guest_token_expires_at'), // 7 days
  // Payment fields
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  paymentStatus: text('payment_status').notNull().default('pending'), // pending/paid/failed/refunded
  mixCheckCount: integer('mix_check_count').notNull().default(0), // Max 2 mix checks per session
  // Retake control
  paidCycleCount: integer('paid_cycle_count').notNull().default(0), // Total paid cycles consumed (mix_check + final)
  baseCycleLimit: integer('base_cycle_limit').notNull().default(5), // Base plan paid cycle limit
  additionalCyclesPurchased: integer('additional_cycles_purchased').notNull().default(0), // Additional cycles bought
  additionalCycleLimit: integer('additional_cycle_limit').notNull().default(5), // Max additional cycles allowed
  previewCount: integer('preview_count').notNull().default(0), // Preview count (omakase: max 5)
  analysisResult: jsonb('analysis_result'), // RoEx mix analysis (LUFS, peak, stereo, etc.)
  // Reference track (optional)
  referenceTrackUrl: text('reference_track_url'), // RoEx readable URL
  referenceTrackFilename: text('reference_track_filename'), // Original filename
  referenceAnalysisResult: jsonb('reference_analysis_result'), // analyzeMix result cache
  // First-run free campaign: true = Stripe-bypass promo grant session (RoEx pool funded, capped).
  // Used to bound cost (baseCycleLimit=1), disable reference-track (hidden /mixcomparison cost),
  // and exclude from paid-user counts. See lib/dial/free-campaign.ts.
  isFreeCampaign: boolean('is_free_campaign').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_dial_sessions_user_id').on(table.userId),
  statusIdx: index('idx_dial_sessions_status').on(table.status),
  userStatusIdx: index('idx_dial_sessions_user_status').on(table.userId, table.status),
  guestTokenIdx: index('idx_dial_sessions_guest_token').on(table.guestToken),
}));

/** Uploaded audio stems */
export const dialTracks = pgTable('dial_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => dialSessions.id, { onDelete: 'cascade' }),
  originalFilename: text('original_filename').notNull(),
  roexUploadUrl: text('roex_upload_url').notNull(), // RoEx readable URL after upload (GCS signed, 1h expiry)
  r2Url: text('r2_url'), // Permanent R2 copy for fallback when GCS expires
  instrumentGroup: text('instrument_group').notNull(), // InstrumentGroup enum value
  presenceSetting: text('presence_setting').notNull().default('NORMAL'),
  panPreference: text('pan_preference').notNull().default('NO_PREFERENCE'),
  reverbPreference: text('reverb_preference').notNull().default('NONE'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('idx_dial_tracks_session_id').on(table.sessionId),
}));

/** RoEx API task tracking (preview, final, mastering) */
export const dialTasks = pgTable('dial_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => dialSessions.id, { onDelete: 'cascade' }),
  roexTaskId: text('roex_task_id').notNull(), // RoEx multitrack_task_id
  taskType: dialTaskTypeEnum('task_type').notNull(),
  status: dialTaskStatusEnum('status').notNull().default('pending'),
  creditsConsumed: integer('credits_consumed'),
  previewUrl: text('preview_url'),       // MP3 preview URL
  finalUrl: text('final_url'),           // WAV final URL
  fxSettings: jsonb('fx_settings'),      // 9-node FX chain per track
  stemsUrls: jsonb('stems_urls'),        // Processed stem URL map
  previewParams: jsonb('preview_params'), // Snapshot of params at submit time (musicalStyle, tracks)
  r2FinalUrl: text('r2_final_url'),           // R2 download URL for the deliverable
  r2ExpiresAt: timestamp('r2_expires_at'),     // When the R2 file expires (completion + 30 days)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  sessionIdIdx: index('idx_dial_tasks_session_id').on(table.sessionId),
  roexTaskIdIdx: index('idx_dial_tasks_roex_task_id').on(table.roexTaskId),
  statusIdx: index('idx_dial_tasks_status').on(table.status),
}));

/** Hoo conversation messages within a dial session */
export const dialMessages = pgTable('dial_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => dialSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  parameterChanges: jsonb('parameter_changes'), // Structured parameter adjustments
  action: text('action'), // Tool call action: adjust_preview, request_mix_check, request_final, etc.
  toolUseBlocks: jsonb('tool_use_blocks'), // Persisted tool_use blocks: [{ id, name, input }]
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('idx_dial_messages_session_id').on(table.sessionId),
  createdAtIdx: index('idx_dial_messages_created_at').on(table.createdAt),
}));

/** FX parameter sheets (paid download) */
export const dialFxSheets = pgTable('dial_fx_sheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => dialTasks.id),
  sessionId: uuid('session_id').notNull().references(() => dialSessions.id),
  sheetData: jsonb('sheet_data').notNull(), // Full 9-node FX chain params
  stripePaymentId: text('stripe_payment_id'),
  purchasedAt: timestamp('purchased_at'),
}, (table) => ({
  sessionIdIdx: index('idx_dial_fx_sheets_session_id').on(table.sessionId),
  taskIdIdx: index('idx_dial_fx_sheets_task_id').on(table.taskId),
}));

/** RoEx credit ledger for accounting */
export const dialCreditLedger = pgTable('dial_credit_ledger', {
  id: serial('id').primaryKey(),
  action: dialCreditActionEnum('action').notNull(),
  credits: integer('credits').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  taskId: uuid('task_id').references(() => dialTasks.id),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  actionIdx: index('idx_dial_credit_ledger_action').on(table.action),
  createdAtIdx: index('idx_dial_credit_ledger_created_at').on(table.createdAt),
}));

// ========================================
// Purchase & Subscription Tables
// ========================================

export const dialPurchaseTypeEnum = pgEnum('dial_purchase_type', [
  'omakase',
  'dialogue',
  'dialogue_mastering',
  'omakase_mastering',
  'mastering_omakase',
  'mastering_dialogue',
  'fx_sheet',
  'additional_cycle',
]);

export const dialPurchaseStatusEnum = pgEnum('dial_purchase_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const dialSubTierEnum = pgEnum('dial_sub_tier', [
  'hoo_pass',
  'basic',
  'pro',
  'studio',
]);

export const dialCreditPackSizeEnum = pgEnum('dial_credit_pack_size', [
  'small',
  'large',
  'bonus',
]);

/** One-time MUEDial purchases */
export const dialPurchases = pgTable('dial_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => dialSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.clerkId), // nullable for guests
  guestEmail: text('guest_email'),
  purchaseType: dialPurchaseTypeEnum('purchase_type').notNull(),
  status: dialPurchaseStatusEnum('status').notNull().default('pending'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('usd'),
  customerCountry: text('customer_country'), // ISO 3166-1 alpha-2 (e.g. "JP") — for tax classification
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  sessionIdIdx: index('idx_dial_purchases_session_id').on(table.sessionId),
  userIdIdx: index('idx_dial_purchases_user_id').on(table.userId),
  statusIdx: index('idx_dial_purchases_status').on(table.status),
}));

/** Monthly MUEDial credit subscriptions */
export const dialSubscriptions = pgTable('dial_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkId), // login required
  tier: dialSubTierEnum('tier').notNull(),
  status: text('status').notNull().default('active'), // active/cancelled/past_due
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeCustomerId: text('stripe_customer_id'),
  customerCountry: text('customer_country'), // ISO 3166-1 alpha-2 — for tax classification
  mixCreditsRemaining: integer('mix_credits_remaining').notNull(),
  mixCreditsTotal: integer('mix_credits_total').notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_dial_subscriptions_user_id').on(table.userId),
  statusIdx: index('idx_dial_subscriptions_status').on(table.status),
  stripeSubIdx: index('idx_dial_subscriptions_stripe_sub_id').on(table.stripeSubscriptionId),
  uniqueActivePerUser: uniqueIndex('dial_subs_unique_active_per_user')
    .on(table.userId)
    .where(sql`status = 'active'`),
}));

/** Subscription state transition event log (for D30/D60 retention analytics) */
export const dialSubscriptionEvents = pgTable('dial_subscription_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull()
    .references(() => dialSubscriptions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end'),
  currentPeriodEnd: timestamp('current_period_end'),
  stripeSubscriptionId: text('stripe_subscription_id').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_dial_sub_events_user_id').on(table.userId),
  subIdIdx: index('idx_dial_sub_events_sub_id').on(table.subscriptionId),
  occurredAtIdx: index('idx_dial_sub_events_occurred_at').on(table.occurredAt),
  toStatusIdx: index('idx_dial_sub_events_to_status').on(table.toStatus),
}));

/** One-time credit pack purchases (12-month expiry) */
export const dialCreditPacks = pgTable('dial_credit_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkId),
  packSize: dialCreditPackSizeEnum('pack_size').notNull(),
  credits: integer('credits').notNull(),
  creditsRemaining: integer('credits_remaining').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('usd'),
  customerCountry: text('customer_country'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  status: dialPurchaseStatusEnum('status').notNull().default('pending'),
  source: text('source'),  // 'bonus' for campaign grants; null for paid packs
  expiresAt: timestamp('expires_at'),  // 12 months after purchase (aligned with RoEx upstream)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdIdx: index('idx_dial_credit_packs_user_id').on(table.userId),
  statusIdx: index('idx_dial_credit_packs_status').on(table.status),
}));

/** Subscription credit grants with optional expiry (FIFO consumption) */
export const dialCreditExpiry = pgTable('dial_credit_expiry', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => dialSubscriptions.id, { onDelete: 'cascade' }),
  credits: integer('credits').notNull(),        // Original grant amount
  creditsRemaining: integer('credits_remaining').notNull(), // Remaining after consumption
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),  // null = no expiry (active subscriber rollover)
}, (table) => ({
  subIdIdx: index('idx_dial_credit_expiry_sub_id').on(table.subscriptionId),
  expiresAtIdx: index('idx_dial_credit_expiry_expires_at').on(table.expiresAt),
}));

// ========================================
// Trial Event Log (server-side funnel measurement)
// ========================================

export const dialTrialEvents = pgTable('dial_trial_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => dialSessions.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'analyze' | 'preview' | 'final' | 'checkout_view'
  userId: text('user_id'), // Clerk ID (null for guests)
  guestToken: text('guest_token'),
  mode: text('mode'), // 'omakase' | 'dialogue' | 'mastering' | null
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  byEventTime: index('idx_dial_trial_events_type_created').on(t.eventType, t.createdAt),
  bySession: index('idx_dial_trial_events_session').on(t.sessionId),
  byUserFunnel: index('idx_dial_trial_events_user_funnel').on(t.userId, t.eventType, t.createdAt),
}));

// ========================================
// Bonus Campaign
// ========================================

/** Per-grant audit ledger for the first-purchase 400cr bonus campaign */
export const dialBonusCampaignLedger = pgTable('dial_bonus_campaign_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkId),
  creditPackId: uuid('credit_pack_id').notNull().references(() => dialCreditPacks.id),
  bonusCredits: integer('bonus_credits').notNull(),
  estimatedCostUsd: numeric('estimated_cost_usd', { precision: 8, scale: 4 }).notNull(),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_dial_bonus_ledger_user_id').on(table.userId),
  grantedAtIdx: index('idx_dial_bonus_ledger_granted_at').on(table.grantedAt),
}));

/** Runtime state for campaigns (kill switch + cumulative cost) */
export const dialCampaignState = pgTable('dial_campaign_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignName: text('campaign_name').notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  cumulativeCostUsd: numeric('cumulative_cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),
  lastAlertedThreshold: integer('last_alerted_threshold'), // last % milestone notified (80/95/100)
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ========================================
// Relations
// ========================================

export const dialSessionsRelations = relations(dialSessions, ({ many }) => ({
  tracks: many(dialTracks),
  tasks: many(dialTasks),
  messages: many(dialMessages),
  fxSheets: many(dialFxSheets),
  purchases: many(dialPurchases),
  trialEvents: many(dialTrialEvents),
}));

export const dialTracksRelations = relations(dialTracks, ({ one }) => ({
  session: one(dialSessions, {
    fields: [dialTracks.sessionId],
    references: [dialSessions.id],
  }),
}));

export const dialTasksRelations = relations(dialTasks, ({ one, many }) => ({
  session: one(dialSessions, {
    fields: [dialTasks.sessionId],
    references: [dialSessions.id],
  }),
  fxSheets: many(dialFxSheets),
  creditEntries: many(dialCreditLedger),
}));

export const dialMessagesRelations = relations(dialMessages, ({ one }) => ({
  session: one(dialSessions, {
    fields: [dialMessages.sessionId],
    references: [dialSessions.id],
  }),
}));

export const dialFxSheetsRelations = relations(dialFxSheets, ({ one }) => ({
  task: one(dialTasks, {
    fields: [dialFxSheets.taskId],
    references: [dialTasks.id],
  }),
  session: one(dialSessions, {
    fields: [dialFxSheets.sessionId],
    references: [dialSessions.id],
  }),
}));

export const dialCreditLedgerRelations = relations(dialCreditLedger, ({ one }) => ({
  task: one(dialTasks, {
    fields: [dialCreditLedger.taskId],
    references: [dialTasks.id],
  }),
}));

export const dialPurchasesRelations = relations(dialPurchases, ({ one }) => ({
  session: one(dialSessions, {
    fields: [dialPurchases.sessionId],
    references: [dialSessions.id],
  }),
}));

export const dialSubscriptionsRelations = relations(dialSubscriptions, ({ many }) => ({
  creditGrants: many(dialCreditExpiry),
}));

export const dialCreditPacksRelations = relations(dialCreditPacks, () => ({
  // userId references users.clerkId — access via direct query
}));

export const dialCreditExpiryRelations = relations(dialCreditExpiry, ({ one }) => ({
  subscription: one(dialSubscriptions, {
    fields: [dialCreditExpiry.subscriptionId],
    references: [dialSubscriptions.id],
  }),
}));

export const dialTrialEventsRelations = relations(dialTrialEvents, ({ one }) => ({
  session: one(dialSessions, {
    fields: [dialTrialEvents.sessionId],
    references: [dialSessions.id],
  }),
}));

// ========================================
// RoEx Vendor Credit Packs (internal cost tracking)
// ========================================

/**
 * RoEx vendor credit packs purchased by MUED (operator-side).
 *
 * Tracks bulk credit purchases from RoEx so that remaining_credits
 * can be monitored and cost baselines established before Phase A launch.
 *
 * This is NOT customer-facing. Records are inserted via
 * scripts/register_roex_pack.sh when kimny purchases a pack from RoEx.
 */
export const roexVendorPacks = pgTable('roex_vendor_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchasedAt: timestamp('purchased_at').notNull(),
  amountUsd: numeric('amount_usd', { precision: 8, scale: 2 }).notNull(),
  creditsTotal: integer('credits_total').notNull(),
  creditsRemaining: integer('credits_remaining').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  purchasedAtIdx: index('idx_roex_vendor_packs_purchased_at').on(table.purchasedAt),
}));
