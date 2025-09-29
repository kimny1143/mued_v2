import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessonSlots, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [slot] = await db
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
      .where(eq(lessonSlots.id, id))
      .limit(1);

    if (!slot) {
      return NextResponse.json(
        { error: "Lesson slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Error fetching lesson slot:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson slot" },
      { status: 500 }
    );
  }
}