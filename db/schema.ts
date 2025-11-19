import { pgTable, serial, text, timestamp, integer, boolean, jsonb, uuid, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ユーザー情報（Clerk連携）
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").notNull().default("student"), // student, mentor, admin
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),
  skills: jsonb("skills").$type<string[]>(),
  stripeCustomerId: text("stripe_customer_id"), // Stripe顧客ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  clerkIdIdx: index("idx_users_clerk_id").on(table.clerkId),
  emailIdx: index("idx_users_email").on(table.email),
  roleIdx: index("idx_users_role").on(table.role),
}));

// レッスンスロット（メンターの予約可能時間）
export const lessonSlots = pgTable("lesson_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  mentorId: uuid("mentor_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxCapacity: integer("max_capacity").notNull().default(1),
  currentCapacity: integer("current_capacity").notNull().default(0),
  status: text("status").notNull().default("available"), // available, booked, cancelled
  tags: jsonb("tags").$type<string[]>(), // 楽器・科目・ジャンル・レベルのタグ
  recurringId: uuid("recurring_id"), // 繰り返し予約用
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  mentorIdIdx: index("idx_lesson_slots_mentor_id").on(table.mentorId),
  startTimeIdx: index("idx_lesson_slots_start_time").on(table.startTime),
  statusIdx: index("idx_lesson_slots_status").on(table.status),
  mentorStartIdx: index("idx_lesson_slots_mentor_start").on(table.mentorId, table.startTime),
  startStatusIdx: index("idx_lesson_slots_start_status").on(table.startTime, table.status),
}));

// 予約
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotId: uuid("slot_id").notNull().references(() => lessonSlots.id),
  studentId: uuid("student_id").notNull().references(() => users.id),
  mentorId: uuid("mentor_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, approved, paid, completed, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, processing, completed, failed
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slotIdIdx: index("idx_reservations_slot_id").on(table.slotId),
  studentIdIdx: index("idx_reservations_student_id").on(table.studentId),
  mentorIdIdx: index("idx_reservations_mentor_id").on(table.mentorId),
  statusIdx: index("idx_reservations_status").on(table.status),
  paymentStatusIdx: index("idx_reservations_payment_status").on(table.paymentStatus),
  studentStatusIdx: index("idx_reservations_student_status").on(table.studentId, table.status),
  mentorStatusPaymentIdx: index("idx_reservations_mentor_status_payment").on(table.mentorId, table.status, table.paymentStatus),
}));

// メッセージ
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<{ url: string; type: string; name: string }[]>(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  senderIdIdx: index("idx_messages_sender_id").on(table.senderId),
  receiverIdIdx: index("idx_messages_receiver_id").on(table.receiverId),
  reservationIdIdx: index("idx_messages_reservation_id").on(table.reservationId),
  createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
}));

// 教材
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  type: text("type").notNull(), // video, pdf, text, interactive
  url: text("url"),
  tags: jsonb("tags").$type<string[]>(),
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  isPublic: boolean("is_public").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  metadata: jsonb("metadata"),
  // Quality scoring fields
  playabilityScore: decimal("playability_score", { precision: 3, scale: 1 }), // 0.0-10.0
  learningValueScore: decimal("learning_value_score", { precision: 3, scale: 1 }), // 0.0-10.0
  qualityStatus: text("quality_status").default("pending"), // pending, draft, approved
  abcAnalysis: jsonb("abc_analysis"), // Full AbcAnalysis object
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  creatorIdIdx: index("idx_materials_creator_id").on(table.creatorId),
  typeIdx: index("idx_materials_type").on(table.type),
  difficultyIdx: index("idx_materials_difficulty").on(table.difficulty),
  isPublicIdx: index("idx_materials_is_public").on(table.isPublic),
  qualityStatusIdx: index("idx_materials_quality_status").on(table.qualityStatus),
  creatorTypeIdx: index("idx_materials_creator_type").on(table.creatorId, table.type),
}));

// サブスクリプション
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  tier: text("plan").notNull().default("freemium"), // freemium, starter, basic, premium (DB column: plan)
  status: text("status").notNull().default("active"), // active, cancelled, past_due, unpaid
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  aiMaterialsUsed: integer("ai_materials_used").notNull().default(0),
  reservationsUsed: integer("reservations_used").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_subscriptions_user_id").on(table.userId),
  statusIdx: index("idx_subscriptions_status").on(table.status),
  stripeSubscriptionIdIdx: index("idx_subscriptions_stripe_subscription_id").on(table.stripeSubscriptionId),
  userStatusIdx: index("idx_subscriptions_user_status").on(table.userId, table.status),
}));

// Webhook イベント（冪等性保証）
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(), // Stripe/Clerk event ID
  type: text("type").notNull(), // イベントタイプ
  source: text("source").notNull(), // stripe, clerk
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  payload: jsonb("payload"), // イベントの生データ（デバッグ用）
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventIdIdx: index("idx_webhook_events_event_id").on(table.eventId),
  sourceIdx: index("idx_webhook_events_source").on(table.source),
  typeIdx: index("idx_webhook_events_type").on(table.type),
  createdAtIdx: index("idx_webhook_events_created_at").on(table.createdAt),
}));

// 学習メトリクス（練習進捗トラッキング）
export const learningMetrics = pgTable("learning_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  materialId: uuid("material_id").notNull().references(() => materials.id),

  // 達成率（セクション完了率）
  sectionsCompleted: integer("sections_completed").notNull().default(0),
  sectionsTotal: integer("sections_total").notNull().default(0),
  achievementRate: decimal("achievement_rate", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100%

  // 反復指数（同じ箇所の繰り返し回数）
  repetitionCount: integer("repetition_count").notNull().default(0),
  repetitionIndex: decimal("repetition_index", { precision: 5, scale: 2 }).notNull().default("0"), // 平均反復回数

  // テンポ到達（目標テンポに対する達成率）
  targetTempo: integer("target_tempo").notNull(), // BPM
  achievedTempo: integer("achieved_tempo").notNull().default(0), // BPM
  tempoAchievement: decimal("tempo_achievement", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100%

  // 滞在箇所（最もループした小節範囲）
  weakSpots: jsonb("weak_spots").$type<{
    startBar: number;
    endBar: number;
    loopCount: number;
    lastPracticedAt: string;
  }[]>(),

  // 練習時間
  totalPracticeTime: integer("total_practice_time").notNull().default(0), // 秒
  lastPracticedAt: timestamp("last_practiced_at"),

  // メタデータ
  instrument: text("instrument"),
  sessionCount: integer("session_count").notNull().default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_learning_metrics_user_id").on(table.userId),
  materialIdIdx: index("idx_learning_metrics_material_id").on(table.materialId),
  lastPracticedIdx: index("idx_learning_metrics_last_practiced").on(table.lastPracticedAt),
  userMaterialIdx: index("idx_learning_metrics_user_material").on(table.userId, table.materialId),
  userCreatedIdx: index("idx_learning_metrics_user_created").on(table.userId, table.createdAt),
}));

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  mentorSlots: many(lessonSlots),
  studentReservations: many(reservations),
  sentMessages: many(messages),
  materials: many(materials),
  subscriptions: many(subscriptions),
  learningMetrics: many(learningMetrics),
}));

export const lessonSlotsRelations = relations(lessonSlots, ({ one, many }) => ({
  mentor: one(users, {
    fields: [lessonSlots.mentorId],
    references: [users.id],
  }),
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  slot: one(lessonSlots, {
    fields: [reservations.slotId],
    references: [lessonSlots.id],
  }),
  student: one(users, {
    fields: [reservations.studentId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [reservations.mentorId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  creator: one(users, {
    fields: [materials.creatorId],
    references: [users.id],
  }),
  learningMetrics: many(learningMetrics),
}));

export const learningMetricsRelations = relations(learningMetrics, ({ one }) => ({
  user: one(users, {
    fields: [learningMetrics.userId],
    references: [users.id],
  }),
  material: one(materials, {
    fields: [learningMetrics.materialId],
    references: [materials.id],
  }),
}));
// ========================================
// MUEDnote Log Entries (Phase 1)
// ========================================
export * from './schema/log-entries';

// ========================================
// MUEDnote Sessions (Phase 2)
// ========================================
export * from './schema/sessions';
