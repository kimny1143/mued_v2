import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../schema";

export const glasswerksInquiries = pgTable(
  "glasswerks_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    clerkId: text("clerk_id").notNull(),
    serviceType: text("service_type").notNull(),
    budgetRange: text("budget_range").notNull(),
    description: text("description").notNull(),
    urgency: text("urgency").notNull().default("flexible"),
    language: text("language").notNull().default("ja"),
    status: text("status").notNull().default("pending"),
    adminNotes: text("admin_notes"),
    quotedAmount: integer("quoted_amount"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
    quotedAt: timestamp("quoted_at"),
    resolvedAt: timestamp("resolved_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_glasswerks_inquiries_user_id").on(table.userId),
    statusIdx: index("idx_glasswerks_inquiries_status").on(table.status),
    createdAtIdx: index("idx_glasswerks_inquiries_created_at").on(table.createdAt),
  })
);
