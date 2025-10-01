import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessonSlots, users } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get("mentorId");
    const onlyAvailable = searchParams.get("available") === "true";

    // 条件を構築
    const conditions = [];

    // 未来のスロットのみ取得
    conditions.push(gte(lessonSlots.startTime, new Date()));

    // メンターIDが指定されている場合
    if (mentorId) {
      conditions.push(eq(lessonSlots.mentorId, mentorId));
    }

    // 利用可能なスロットのみ
    if (onlyAvailable) {
      conditions.push(eq(lessonSlots.status, "available"));
    }

    // レッスンスロットを取得（メンター情報と一緒に）
    const slots = await db
      .select({
        id: lessonSlots.id,
        mentorId: lessonSlots.mentorId,
        startTime: lessonSlots.startTime,
        endTime: lessonSlots.endTime,
        price: lessonSlots.price,
        maxCapacity: lessonSlots.maxCapacity,
        currentCapacity: lessonSlots.currentCapacity,
        status: lessonSlots.status,
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

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching lesson slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson slots" },
      { status: 500 }
    );
  }
}