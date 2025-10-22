import { NextResponse } from "next/server";
import { db } from "@/db";
import { reservations, lessonSlots, users } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/actions/user";
import { alias } from "drizzle-orm/pg-core";

// テーブルエイリアスを作成（JOINバグ修正）
const students = alias(users, "students");
const mentors = alias(users, "mentors");

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
          id: students.id,
          name: students.name,
          email: students.email,
        },
        mentor: {
          id: mentors.id,
          name: mentors.name,
          email: mentors.email,
        },
      })
      .from(reservations)
      .leftJoin(lessonSlots, eq(reservations.slotId, lessonSlots.id))
      .leftJoin(students, eq(reservations.studentId, students.id))
      .leftJoin(mentors, eq(reservations.mentorId, mentors.id))
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

    // トランザクション処理で競合状態を防止
    const result = await db.transaction(async (tx) => {
      // スロット情報を取得
      const [slot] = await tx
        .select()
        .from(lessonSlots)
        .where(eq(lessonSlots.id, slotId))
        .limit(1);

      if (!slot) {
        throw new Error("Lesson slot not found");
      }

      // 空き状況を確認
      if (slot.currentCapacity >= slot.maxCapacity) {
        throw new Error("This slot is fully booked");
      }

      // 予約を作成
      const [reservation] = await tx
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

      // スロットの現在の予約数を原子的に更新（競合状態修正）
      await tx
        .update(lessonSlots)
        .set({
          currentCapacity: sql`${lessonSlots.currentCapacity} + 1`,
          status: sql`CASE WHEN ${lessonSlots.currentCapacity} + 1 >= ${lessonSlots.maxCapacity} THEN 'booked' ELSE 'available' END`,
          updatedAt: new Date(),
        })
        .where(eq(lessonSlots.id, slotId));

      return reservation;
    });

    return NextResponse.json({ reservation: result });
  } catch (error) {
    console.error("Error creating reservation:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create reservation";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("not found") ? 404 : errorMessage.includes("fully booked") ? 400 : 500 }
    );
  }
}