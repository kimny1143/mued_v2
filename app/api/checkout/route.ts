import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { reservations, lessonSlots, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/actions/user";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await request.json();

    // 予約情報を取得（認可チェック付き）
    const [reservation] = await db
      .select({
        id: reservations.id,
        amount: reservations.amount,
        status: reservations.status,
        paymentStatus: reservations.paymentStatus,
        studentId: reservations.studentId,
        slot: {
          id: lessonSlots.id,
          startTime: lessonSlots.startTime,
          endTime: lessonSlots.endTime,
        },
        mentor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(reservations)
      .leftJoin(lessonSlots, eq(reservations.slotId, lessonSlots.id))
      .leftJoin(users, eq(reservations.mentorId, users.id))
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.studentId, user.id) // 認可チェック: 予約の所有者のみ決済可能
        )
      )
      .limit(1);

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found or unauthorized" },
        { status: 404 }
      );
    }

    // 既に支払い済みの場合
    if (reservation.paymentStatus === "completed") {
      return NextResponse.json(
        { error: "This reservation has already been paid" },
        { status: 400 }
      );
    }

    // 予約が承認されていない場合
    if (reservation.status !== "approved" && reservation.status !== "pending") {
      return NextResponse.json(
        { error: "This reservation is not approved yet" },
        { status: 400 }
      );
    }

    // Stripe Checkoutセッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `レッスン予約: ${reservation.mentor?.name}先生`,
              description: `日時: ${new Date(reservation.slot?.startTime || "").toLocaleString("ja-JP")}`,
            },
            unit_amount: parseInt(reservation.amount),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations?payment=cancelled`,
      metadata: {
        reservationId: reservation.id,
        userId: user.id,
      },
    });

    // 予約にStripeセッションIDを保存
    await db
      .update(reservations)
      .set({
        stripeSessionId: session.id,
        paymentStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationId));

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}