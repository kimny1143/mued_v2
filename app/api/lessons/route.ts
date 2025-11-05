import { db } from "@/db";
import { lessonSlots, users, reservations } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/actions/user";
import { apiSuccess, apiServerError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get("mentorId");
    const onlyAvailable = searchParams.get("available") === "true";

    // 現在のユーザーを取得
    const currentUser = await getCurrentUser();

    // 条件を構築
    const conditions = [];

    // 未来のスロットのみ取得
    conditions.push(gte(lessonSlots.startTime, new Date()));

    // メンターIDが指定されている場合
    if (mentorId) {
      conditions.push(eq(lessonSlots.mentorId, mentorId));
    }

    // 利用可能なスロットのみ（フィルタ指定時）
    if (onlyAvailable) {
      conditions.push(eq(lessonSlots.status, "available"));
    }

    // レッスンスロットを取得（メンター情報と一緒に）
    const slotsData = await db
      .select({
        id: lessonSlots.id,
        mentorId: lessonSlots.mentorId,
        startTime: lessonSlots.startTime,
        endTime: lessonSlots.endTime,
        price: lessonSlots.price,
        maxCapacity: lessonSlots.maxCapacity,
        currentCapacity: lessonSlots.currentCapacity,
        status: lessonSlots.status,
        tags: lessonSlots.tags,
        mentor: {
          id: users.id,
          name: users.name,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          bio: users.bio,
          skills: users.skills,
        },
      })
      .from(lessonSlots)
      .leftJoin(users, eq(lessonSlots.mentorId, users.id))
      .where(and(...conditions))
      .orderBy(lessonSlots.startTime)
      .limit(50);

    // 現在のユーザーの予約情報を取得（ログインしている場合のみ）
    let userReservations: Record<string, { id: string; slotId: string; status: string; paymentStatus: string }> = {};
    if (currentUser) {
      const userReservationsData = await db
        .select({
          slotId: reservations.slotId,
          id: reservations.id,
          status: reservations.status,
          paymentStatus: reservations.paymentStatus,
        })
        .from(reservations)
        .where(eq(reservations.studentId, currentUser.id));

      userReservations = Object.fromEntries(
        userReservationsData.map((r) => [r.slotId, r])
      );
    }

    // スロットに予約情報を追加
    const slots = slotsData.map((slot) => ({
      ...slot,
      reservation: userReservations[slot.id] || null,
    }));

    return apiSuccess({ slots });
  } catch (error) {
    console.error("Error fetching lesson slots:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to fetch lesson slots"));
  }
}