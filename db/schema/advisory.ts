/**
 * MUED Advisory storefront #8 — intake tables.
 *
 * Two anonymous-friendly tables (no Clerk/users FK — the advisory LP is public and the free
 * 60-min 壁打ち books without sign-in):
 *
 *  - advisory_slots: curated fixed availability the operator (kimny) seeds. A booking CLAIMS an
 *    open slot with a single conditional UPDATE (lib/advisory/slot-reservation.ts), which Postgres
 *    serializes so two concurrent bookings can never take the same slot (reuse of the proven
 *    reserve-before-charge / preview-reservation pattern).
 *  - advisory_inquiries: the single KPI store for BOTH lanes — type='booking' (free 壁打ち) and
 *    type='inquiry' (other questions / paid-tier interest). insight課 reads monthly counts from
 *    here via GET /api/advisory/kpi-monthly (persist-first: the committed row is the source of
 *    truth, not the email or GA4). Recording consent is captured inline (marketing_consents
 *    vocabulary — policyVersion/locale/timestamp) since the booker is anonymous. completedAt is the
 *    "conducted" flag set by kimny's one-tap link (bookings_conducted KPI).
 *
 * Additive / Tier 2 (no changes to existing tables). Migration: db/migrations/0055_advisory_intake.sql.
 */
import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

/** Curated availability seeded by the operator; a booking claims one open slot atomically. */
export const advisorySlots = pgTable(
  "advisory_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    status: text("status").notNull().default("open"), // 'open' | 'booked' | 'closed'
    inquiryId: uuid("inquiry_id"), // set to the advisory_inquiries.id that claimed this slot
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    statusStartIdx: index("idx_advisory_slots_status_start").on(t.status, t.startTime),
  }),
);

/** Single KPI store for both lanes (booking + inquiry) with inline recording-consent. */
export const advisoryInquiries = pgTable(
  "advisory_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // 'inquiry' | 'booking'
    status: text("status").notNull().default("new"), // 'new' | 'booked' | 'completed' | 'cancelled'
    name: text("name"),
    email: text("email").notNull(),
    locale: text("locale").notNull().default("ja"), // 'ja' | 'en'
    product: text("product"), // inquiry-lane tier of interest: 'wallhit'|'diagnosis'|'build'|'run'|null
    message: text("message"),
    // booking lane
    slotId: uuid("slot_id"), // the claimed advisory_slots.id
    scheduledAt: timestamp("scheduled_at"), // denormalized slot start (KPI + .ics + email)
    meetingUrl: text("meeting_url"), // fixed Google Meet link (from ADVISORY_MEET_URL)
    // recording consent (inline — anonymous booker; marketing_consents vocabulary)
    recordingConsent: boolean("recording_consent").notNull().default(false),
    consentPolicyVersion: text("consent_policy_version"),
    consentLocale: text("consent_locale"),
    consentAt: timestamp("consent_at"),
    // conducted flag (kimny one-tap → bookings_conducted KPI)
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    // attribution
    source: text("source"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("idx_advisory_inquiries_type").on(t.type),
    statusIdx: index("idx_advisory_inquiries_status").on(t.status),
    createdAtIdx: index("idx_advisory_inquiries_created_at").on(t.createdAt),
    completedAtIdx: index("idx_advisory_inquiries_completed_at").on(t.completedAt),
  }),
);

export type AdvisorySlot = typeof advisorySlots.$inferSelect;
export type NewAdvisorySlot = typeof advisorySlots.$inferInsert;
export type AdvisoryInquiry = typeof advisoryInquiries.$inferSelect;
export type NewAdvisoryInquiry = typeof advisoryInquiries.$inferInsert;

/** intake lane. */
export type AdvisoryInquiryType = "inquiry" | "booking";
/** lifecycle: new → booked → completed (conducted) | cancelled. */
export type AdvisoryInquiryStatus = "new" | "booked" | "completed" | "cancelled";
