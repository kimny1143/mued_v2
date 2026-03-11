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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
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
  roexUploadUrl: text('roex_upload_url').notNull(), // RoEx readable URL after upload
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
  'monthly_5',
  'studio_15',
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
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  sessionIdIdx: index('idx_dial_purchases_session_id').on(table.sessionId),
  userIdIdx: index('idx_dial_purchases_user_id').on(table.userId),
  statusIdx: index('idx_dial_purchases_status').on(table.status),
}));

/** Monthly MUEDial mix credit subscriptions */
export const dialSubscriptions = pgTable('dial_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkId), // login required
  tier: dialSubTierEnum('tier').notNull(),
  status: text('status').notNull().default('active'), // active/cancelled/past_due
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeCustomerId: text('stripe_customer_id'),
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
}));

// ========================================
// Relations
// ========================================

export const dialSessionsRelations = relations(dialSessions, ({ many }) => ({
  tracks: many(dialTracks),
  tasks: many(dialTasks),
  messages: many(dialMessages),
  fxSheets: many(dialFxSheets),
  purchases: many(dialPurchases),
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

export const dialSubscriptionsRelations = relations(dialSubscriptions, () => ({
  // userId references users.clerkId, but drizzle relations use table references
  // Access via direct query with userId filter
}));
