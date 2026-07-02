/**
 * GET /api/advisory/kpi-monthly — insight課's monthly read (agreed 2026-07-02).
 *
 * Auth = X-Internal-API-Key (the same server-to-server pattern as the glasswerks notify route), so
 * no DATABASE_URL / raw SQL is shared across teams — insight課 pulls the aggregated counts over
 * HTTP. Returns the minimal contract: { inquiries, bookings_created, bookings_conducted } for the
 * current month AND cumulative from M0. bookings_conducted = completed_at set (kimny's one-tap
 * flag — no attendance heuristic). No cron/rollup: a live FILTER count is trivial at this volume.
 *
 * Note: month boundary uses UTC date_trunc; at ~10 items/month the ≤9h JST edge skew is immaterial
 * (insight課 can refine to Asia/Tokyo later if needed).
 */
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { apiSuccess, apiUnauthorized, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function GET(request: NextRequest) {
  const key = request.headers.get("X-Internal-API-Key");
  if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
    return apiUnauthorized("Unauthorized");
  }

  try {
    const result = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE type = 'inquiry' AND created_at >= date_trunc('month', now()))::int  AS inquiries_month,
        count(*) FILTER (WHERE type = 'booking' AND created_at >= date_trunc('month', now()))::int  AS bookings_created_month,
        count(*) FILTER (WHERE type = 'booking' AND completed_at >= date_trunc('month', now()))::int AS bookings_conducted_month,
        count(*) FILTER (WHERE type = 'inquiry')::int                                                AS inquiries_total,
        count(*) FILTER (WHERE type = 'booking')::int                                                AS bookings_created_total,
        count(*) FILTER (WHERE type = 'booking' AND completed_at IS NOT NULL)::int                   AS bookings_conducted_total
      FROM advisory_inquiries
    `);
    const rows = (result as unknown as { rows: Record<string, number>[] }).rows ?? [];
    const r = rows[0] ?? {};
    return apiSuccess({
      month: new Date().toISOString().slice(0, 7),
      current: {
        inquiries: Number(r.inquiries_month ?? 0),
        bookings_created: Number(r.bookings_created_month ?? 0),
        bookings_conducted: Number(r.bookings_conducted_month ?? 0),
      },
      cumulative: {
        inquiries: Number(r.inquiries_total ?? 0),
        bookings_created: Number(r.bookings_created_total ?? 0),
        bookings_conducted: Number(r.bookings_conducted_total ?? 0),
      },
    });
  } catch (err) {
    logger.error("[advisory/kpi-monthly] query failed", { error: err });
    return apiServerError("Failed to compute KPI");
  }
}
