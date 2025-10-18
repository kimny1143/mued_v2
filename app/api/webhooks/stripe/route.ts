import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db";
import { reservations, subscriptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Stripe Webhookイベント用の型定義
interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook Error: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  // イベントタイプに応じて処理
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // サブスクリプションの場合
      if (session.mode === 'subscription') {
        const { userId, tier } = session.metadata || {};

        if (!userId || !tier) {
          console.error("Missing userId or tier in subscription session metadata");
          break;
        }

        try {
          // サブスクリプション情報を取得
          const stripeSubscriptionId = session.subscription as string;
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as unknown as StripeSubscriptionWithPeriods;

          // 既存のサブスクリプションを確認
          const [existingSub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

          if (existingSub) {
            // 既存のサブスクリプションを更新
            await db
              .update(subscriptions)
              .set({
                stripeSubscriptionId,
                stripeCustomerId: session.customer as string,
                tier,
                status: 'active',
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, existingSub.id));

            console.log(`Subscription updated for user: ${userId}`);
          } else {
            // 新規サブスクリプションを作成
            await db.insert(subscriptions).values({
              userId,
              stripeSubscriptionId,
              stripeCustomerId: session.customer as string,
              tier,
              status: 'active',
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
              aiMaterialsUsed: 0,
              reservationsUsed: 0,
            });

            console.log(`Subscription created for user: ${userId}`);
          }

          // Stripe Customer IDをusersテーブルに保存
          await db
            .update(users)
            .set({ stripeCustomerId: session.customer as string })
            .where(eq(users.id, userId));

        } catch (error) {
          console.error("Error handling subscription checkout:", error);
        }
        break;
      }

      // 予約の場合（既存の処理）
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

    // サブスクリプション作成
    case "customer.subscription.created": {
      const subscription = event.data.object as StripeSubscriptionWithPeriods;
      const { userId, tier } = subscription.metadata || {};

      if (!userId || !tier) {
        console.error("Missing userId or tier in subscription metadata");
        break;
      }

      try {
        // サブスクリプションレコードを作成または更新
        const [existingSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (existingSub) {
          await db
            .update(subscriptions)
            .set({
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer as string,
              tier,
              status: subscription.status === 'active' ? 'active' : subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSub.id));
        } else {
          await db.insert(subscriptions).values({
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            tier,
            status: subscription.status === 'active' ? 'active' : subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            aiMaterialsUsed: 0,
            reservationsUsed: 0,
          });
        }

        console.log(`Subscription created: ${subscription.id} for user: ${userId}`);
      } catch (error) {
        console.error("Error creating subscription:", error);
      }
      break;
    }

    // サブスクリプション更新
    case "customer.subscription.updated": {
      const subscription = event.data.object as StripeSubscriptionWithPeriods;
      const { tier } = subscription.metadata || {};

      try {
        const [existingSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (!existingSub) {
          console.error(`Subscription not found: ${subscription.id}`);
          break;
        }

        // ステータスマッピング
        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          unpaid: 'unpaid',
          canceled: 'cancelled',
          incomplete: 'past_due',
          incomplete_expired: 'cancelled',
          trialing: 'active',
          paused: 'cancelled',
        };

        await db
          .update(subscriptions)
          .set({
            tier: tier || existingSub.tier,
            status: statusMap[subscription.status] || 'active',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSub.id));

        console.log(`Subscription updated: ${subscription.id}`);
      } catch (error) {
        console.error("Error updating subscription:", error);
      }
      break;
    }

    // サブスクリプション削除/キャンセル
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      try {
        const [existingSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (!existingSub) {
          console.error(`Subscription not found: ${subscription.id}`);
          break;
        }

        // サブスクリプションをキャンセル状態に更新
        await db
          .update(subscriptions)
          .set({
            status: 'cancelled',
            tier: 'freemium', // フリーミアムにダウングレード
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSub.id));

        console.log(`Subscription cancelled: ${subscription.id}`);
      } catch (error) {
        console.error("Error cancelling subscription:", error);
      }
      break;
    }

    // 請求成功（月次リセット）
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as StripeInvoiceWithSubscription;
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

      if (!subscriptionId) break;

      try {
        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!sub) {
          console.error(`Subscription not found: ${subscriptionId}`);
          break;
        }

        // 月次使用量をリセット
        await db
          .update(subscriptions)
          .set({
            aiMaterialsUsed: 0,
            reservationsUsed: 0,
            status: 'active', // 支払い成功で必ずアクティブに
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        console.log(`Usage reset for subscription: ${subscriptionId}`);
      } catch (error) {
        console.error("Error resetting usage:", error);
      }
      break;
    }

    // 請求失敗
    case "invoice.payment_failed": {
      const invoice = event.data.object as StripeInvoiceWithSubscription;
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

      if (!subscriptionId) break;

      try {
        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!sub) {
          console.error(`Subscription not found: ${subscriptionId}`);
          break;
        }

        // ステータスを past_due に更新
        await db
          .update(subscriptions)
          .set({
            status: 'past_due',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        console.log(`Payment failed for subscription: ${subscriptionId}`);

        // TODO: ユーザーにメール通知を送信
      } catch (error) {
        console.error("Error handling payment failure:", error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}