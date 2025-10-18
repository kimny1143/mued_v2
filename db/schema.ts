import { pgTable, serial, text, timestamp, integer, boolean, jsonb, uuid, decimal } from "drizzle-orm/pg-core";
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
});

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
});

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
});

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
});

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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
});

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  mentorSlots: many(lessonSlots),
  studentReservations: many(reservations),
  sentMessages: many(messages),
  materials: many(materials),
  subscriptions: many(subscriptions),
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