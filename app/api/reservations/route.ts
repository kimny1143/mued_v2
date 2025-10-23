import { NextResponse } from "next/server";
import { db } from "@/db";
import { reservations, lessonSlots, users } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/actions/user";
import { checkCanCreateReservation, incrementReservationUsage } from "@/lib/middleware/usage-limiter";
import { z } from "zod";

// 入力バリデーションスキーマ
const createReservationSchema = z.object({
  slotId: z.string().uuid("Invalid slot ID format"),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

export async function GET() {
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

    // Check usage limits
    const usageCheck = await checkCanCreateReservation(user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason,
          upgradeRequired: true,
          limits: usageCheck.limits
        },
        { status: 403 }
      );
    }

    // 入力バリデーション
    const body = await request.json();
    const validation = createReservationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { slotId, notes } = validation.data;

    // トランザクションで予約作成を実行（競合状態を防止）
    try {
      const reservation = await db.transaction(async (tx) => {
        // スロット情報を取得（行レベルロックで排他制御）
        // FOR UPDATE により、同時に複数のリクエストが来ても順番に処理される
        const slots = await tx.execute<{
          id: string;
          mentor_id: string;
          current_capacity: number;
          max_capacity: number;
          price: string;
          start_time: Date;
          end_time: Date;
          status: string;
        }>(
          sql`
            SELECT * FROM lesson_slots
            WHERE id = ${slotId}
            FOR UPDATE
          `
        );

        const slot = slots.rows[0];
        if (!slot) {
          throw new Error("Lesson slot not found");
        }

        // 空き状況を確認
        if (slot.current_capacity >= slot.max_capacity) {
          throw new Error("This slot is fully booked");
        }

        // 予約を作成
        const [newReservation] = await tx
          .insert(reservations)
          .values({
            slotId: slot.id,
            studentId: user.id,
            mentorId: slot.mentor_id,
            status: "pending",
            paymentStatus: "pending",
            amount: slot.price,
            notes,
          })
          .returning();

        // スロットの現在の予約数を更新（アトミック）
        await tx
          .update(lessonSlots)
          .set({
            currentCapacity: slot.current_capacity + 1,
            status: slot.current_capacity + 1 >= slot.max_capacity ? "booked" : "available",
            updatedAt: new Date(),
          })
          .where(eq(lessonSlots.id, slotId));

        // 使用量カウンターをインクリメント（トランザクション内）
        await incrementReservationUsage(user.id);

        return newReservation;
      });

      return NextResponse.json({ reservation });
    } catch (txError) {
      // トランザクションエラーを適切にハンドリング
      if (txError instanceof Error) {
        if (txError.message === "Lesson slot not found") {
          return NextResponse.json(
            { error: "Lesson slot not found" },
            { status: 404 }
          );
        }
        if (txError.message === "This slot is fully booked") {
          return NextResponse.json(
            { error: "This slot is fully booked" },
            { status: 400 }
          );
        }
      }
      // その他のエラーは外側のcatchで処理
      throw txError;
    }
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}