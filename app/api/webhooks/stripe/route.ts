import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // イベントタイプに応じて処理
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // 予約IDを取得
      const reservationId = session.metadata?.reservationId;

      if (!reservationId) {
        console.error("No reservationId in session metadata");
        break;
      }

      try {
        // 予約の支払いステータスを更新
        await db
          .update(reservations)
          .set({
            paymentStatus: "completed",
            status: "paid",
            stripePaymentIntentId: session.payment_intent as string,
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        console.log(`Payment completed for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error updating reservation:", error);
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservationId;

      if (!reservationId) break;

      try {
        // セッションの有効期限が切れた場合、支払いステータスをリセット
        await db
          .update(reservations)
          .set({
            paymentStatus: "pending",
            stripeSessionId: null,
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        console.log(`Payment session expired for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error updating reservation:", error);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // メタデータから予約IDを取得
      const reservationId = paymentIntent.metadata?.reservationId;

      if (!reservationId) break;

      try {
        await db
          .update(reservations)
          .set({
            paymentStatus: "failed",
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        console.log(`Payment failed for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error updating reservation:", error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}