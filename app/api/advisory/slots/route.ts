/**
 * GET /api/advisory/slots — open, future 壁打ち slots for the booking picker.
 * Public (read-only, no PII). Returns up to 50 open slots in chronological order.
 */
import { NextRequest } from "next/server";
import { and, eq, gt, asc } from "drizzle-orm";
import { db } from "@/db";
import { advisorySlots } from "@/db/schema";
import { apiSuccess, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

export async function GET(_request: NextRequest) {
  try {
    const rows = await db
      .select({ id: advisorySlots.id, startTime: advisorySlots.startTime, endTime: advisorySlots.endTime })
      .from(advisorySlots)
      .where(and(eq(advisorySlots.status, "open"), gt(advisorySlots.startTime, new Date())))
      .orderBy(asc(advisorySlots.startTime))
      .limit(50);
    return apiSuccess({
      slots: rows.map((s) => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("[advisory/slots] query failed", { error: err });
    return apiServerError("Failed to load slots");
  }
}
