import { NextResponse } from "next/server";
import { db } from "@/db";
import { reservations, lessonSlots, users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/actions/user";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーの予約を取得（生徒として、またはメンターとして）
    const userReservations = await db
      .select({
        id: reservations.id,
        slotId: reservations.slotId,
        studentId: reservations.studentId,
        mentorId: reservations.mentorId,
        status: reservations.status,
        paymentStatus: reservations.paymentStatus,
        amount: reservations.amount,
        notes: reservations.notes,
        createdAt: reservations.createdAt,
        slot: {
          startTime: lessonSlots.startTime,
          endTime: lessonSlots.endTime,
        },
        student: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        mentor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(reservations)
      .leftJoin(lessonSlots, eq(reservations.slotId, lessonSlots.id))
      .leftJoin(users, eq(reservations.studentId, users.id))
      .where(
        or(
          eq(reservations.studentId, user.id),
          eq(reservations.mentorId, user.id)
        )
      );

    return NextResponse.json({ reservations: userReservations });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slotId, notes } = await request.json();

    // スロット情報を取得
    const [slot] = await db
      .select()
      .from(lessonSlots)
      .where(eq(lessonSlots.id, slotId))
      .limit(1);

    if (!slot) {
      return NextResponse.json(
        { error: "Lesson slot not found" },
        { status: 404 }
      );
    }

    // 空き状況を確認
    if (slot.currentCapacity >= slot.maxCapacity) {
      return NextResponse.json(
        { error: "This slot is fully booked" },
        { status: 400 }
      );
    }

    // 予約を作成
    const [reservation] = await db
      .insert(reservations)
      .values({
        slotId: slot.id,
        studentId: user.id,
        mentorId: slot.mentorId,
        status: "pending",
        paymentStatus: "pending",
        amount: slot.price,
        notes,
      })
      .returning();

    // スロットの現在の予約数を更新
    await db
      .update(lessonSlots)
      .set({
        currentCapacity: slot.currentCapacity + 1,
        status: slot.currentCapacity + 1 >= slot.maxCapacity ? "booked" : "available",
        updatedAt: new Date(),
      })
      .where(eq(lessonSlots.id, slotId));

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}