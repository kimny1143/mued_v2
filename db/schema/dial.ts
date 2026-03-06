/**
 * MUEDial Schema - RoEx-based Mixing/Mastering Service
 *
 * 6 tables for the MUEDial mixing/mastering workflow:
 * - dial_sessions: User mixing sessions
 * - dial_tracks: Uploaded audio stems
 * - dial_tasks: RoEx API task tracking
 * - dial_messages: Hoo conversation log
 * - dial_fx_sheets: FX parameter sheets (paid download)
 * - dial_credit_ledger: RoEx credit accounting
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
  'completed',   // All done
  'archived',    // User archived
]);

export const dialTaskTypeEnum = pgEnum('dial_task_type', [
  'preview',
  'final_basic',
  'final_advanced',
  'mastering',
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
  userId: text('user_id').notNull().references(() => users.clerkId),
  mode: dialModeEnum('mode').notNull(),
  status: dialSessionStatusEnum('status').notNull().default('uploading'),
  musicalStyle: text('musical_style').notNull(), // MusicalStyle enum value
  title: text('title'), // User-given project name
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_dial_sessions_user_id').on(table.userId),
  statusIdx: index('idx_dial_sessions_status').on(table.status),
  userStatusIdx: index('idx_dial_sessions_user_status').on(table.userId, table.status),
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
// Relations
// ========================================

export const dialSessionsRelations = relations(dialSessions, ({ many }) => ({
  tracks: many(dialTracks),
  tasks: many(dialTasks),
  messages: many(dialMessages),
  fxSheets: many(dialFxSheets),
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
