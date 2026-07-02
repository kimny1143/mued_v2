/**
 * GET /api/advisory/booking/<id>/complete?t=<token> — the operator's one-tap "mark conducted" link
 * from the booking-notify email. Sets completed_at (→ bookings_conducted KPI). Token is a per-booking
 * HMAC (booking-token.ts), so no admin key rides in the URL.
 *
 * Guard against email-client link prefetch: refuses to complete BEFORE the session's scheduled time
 * (a future booking can't be "conducted" yet), and is idempotent (already-completed → success page).
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { advisoryInquiries } from "@/db/schema";
import { verifyBookingToken } from "@/lib/advisory/booking-token";
import { logger } from "@/lib/utils/logger";

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:-apple-system,sans-serif;max-width:480px;margin:60px auto;padding:0 20px;color:#333;line-height:1.6"><h2 style="color:#111">${title}</h2><p>${body}</p></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t");
  if (!verifyBookingToken(id, token)) {
    return page("リンクが無効です", "このリンクは無効か、期限切れです。", 403);
  }

  const [booking] = await db
    .select()
    .from(advisoryInquiries)
    .where(and(eq(advisoryInquiries.id, id), eq(advisoryInquiries.type, "booking")))
    .limit(1);
  if (!booking) return page("予約が見つかりません", "該当の予約が見つかりませんでした。", 404);
  if (booking.status === "cancelled") return page("キャンセル済み", "この予約はキャンセル済みです。", 409);
  if (booking.completedAt) {
    return page("実施済み（設定済み）", "この相談は既に「実施済み」として記録されています。");
  }
  // prefetch guard: can't be conducted before its scheduled time
  if (booking.scheduledAt && booking.scheduledAt.getTime() > Date.now()) {
    return page("まだ実施時刻前です", "相談の実施予定時刻より前です。実施後にこのリンクを開いてください。", 425);
  }

  try {
    await db
      .update(advisoryInquiries)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(advisoryInquiries.id, id), isNull(advisoryInquiries.completedAt)));
  } catch (err) {
    logger.error("[advisory/booking/complete] update failed", { error: err, id });
    return page("エラー", "更新に失敗しました。時間をおいて再度お試しください。", 500);
  }

  return page("実施済みにしました", "この相談を「実施済み」として記録しました。ありがとうございます。");
}
