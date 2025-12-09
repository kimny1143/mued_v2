import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db";
import { reservations, subscriptions, users, webhookEvents, lessonSlots } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateStripeConfig } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

// Drizzle transaction type
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 環境変数の検証
const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = stripeConfig.webhookSecret;

// GETリクエストに対応（エンドポイントの動作確認用）
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Stripe webhook endpoint is running",
    endpoint: "/api/webhooks/stripe"
  });
}

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

  // 冪等性チェック: 既に処理済みのイベントかチェック
  const [existingEvent] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, event.id))
    .limit(1);

  if (existingEvent) {
    // 処理中のイベントは再試行を許可（Stripeの再送対応）
    if (existingEvent.status === "processed") {
      logger.debug(`Event ${event.id} already processed, skipping.`);
      return NextResponse.json({ received: true, skipped: true });
    }
    // processing または failed の場合は再処理を試みる
    logger.info(`Retrying event ${event.id} (status: ${existingEvent.status})`);
  }

  // トランザクション内でイベント処理 + webhook記録
  try {
    await db.transaction(async (tx) => {
      // Webhookイベントを記録または更新（upsert）
      if (existingEvent) {
        await tx
          .update(webhookEvents)
          .set({
            status: "processing",
            errorMessage: null,
          })
          .where(eq(webhookEvents.eventId, event.id));
      } else {
        await tx.insert(webhookEvents).values({
          eventId: event.id,
          type: event.type,
          source: "stripe",
          status: "processing",
          payload: event.data.object as unknown as Record<string, unknown>,
        });
      }

      // イベントタイプに応じて処理（トランザクション内で実行）
      await processStripeEvent(tx, event);

      // 処理成功時はステータスを更新
      await tx
        .update(webhookEvents)
        .set({
          status: "processed",
          completedAt: new Date(),
        })
        .where(eq(webhookEvents.eventId, event.id));
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);

    // エラー時はステータスを failed に更新（トランザクション外で）
    try {
      await db
        .update(webhookEvents)
        .set({
          status: "failed",
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(webhookEvents.eventId, event.id));
    } catch (updateError) {
      console.error("Failed to update webhook status:", updateError);
    }

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// イベント処理ロジックを別関数に分離
async function processStripeEvent(tx: Transaction, event: Stripe.Event) {
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
          const [existingSub] = await tx
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

          if (existingSub) {
            // 既存のサブスクリプションを更新
            await tx
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

            logger.debug(`Subscription updated for user: ${userId}`);
          } else {
            // 新規サブスクリプションを作成
            await tx.insert(subscriptions).values({
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

            logger.debug(`Subscription created for user: ${userId}`);
          }

          // Stripe Customer IDをusersテーブルに保存
          await tx
            .update(users)
            .set({ stripeCustomerId: session.customer as string })
            .where(eq(users.id, userId));

        } catch (error) {
          console.error("Error handling subscription checkout:", error);
          throw error;
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
        await tx
          .update(reservations)
          .set({
            paymentStatus: "completed",
            status: "paid",
            stripePaymentIntentId: session.payment_intent as string,
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        logger.debug(`Payment completed for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error updating reservation:", error);
        throw error; // トランザクションをロールバックするために再スロー
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservationId;

      if (!reservationId) break;

      try {
        // セッションの有効期限が切れた場合、支払いステータスをリセット
        await tx
          .update(reservations)
          .set({
            paymentStatus: "pending",
            stripeSessionId: null,
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        logger.debug(`Payment session expired for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error updating reservation:", error);
        throw error;
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // メタデータから予約IDを取得
      const reservationId = paymentIntent.metadata?.reservationId;

      if (!reservationId) break;

      try {
        await tx
          .update(reservations)
          .set({
            paymentStatus: "failed",
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        logger.debug(`Payment failed for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error updating reservation:", error);
        throw error;
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
        const [existingSub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (existingSub) {
          await tx
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
          await tx.insert(subscriptions).values({
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

        logger.debug(`Subscription created: ${subscription.id} for user: ${userId}`);
      } catch (error) {
        console.error("Error creating subscription:", error);
        throw error;
      }
      break;
    }

    // サブスクリプション更新
    case "customer.subscription.updated": {
      const subscription = event.data.object as StripeSubscriptionWithPeriods;
      const { tier } = subscription.metadata || {};

      try {
        const [existingSub] = await tx
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

        await tx
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

        logger.debug(`Subscription updated: ${subscription.id}`);
      } catch (error) {
        console.error("Error updating subscription:", error);
        throw error;
      }
      break;
    }

    // サブスクリプション削除/キャンセル
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      try {
        const [existingSub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (!existingSub) {
          console.error(`Subscription not found: ${subscription.id}`);
          break;
        }

        // サブスクリプションをキャンセル状態に更新
        await tx
          .update(subscriptions)
          .set({
            status: 'cancelled',
            tier: 'freemium', // フリーミアムにダウングレード
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSub.id));

        logger.debug(`Subscription cancelled: ${subscription.id}`);
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        throw error;
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
        const [sub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!sub) {
          console.error(`Subscription not found: ${subscriptionId}`);
          break;
        }

        // 月次使用量をリセット
        await tx
          .update(subscriptions)
          .set({
            aiMaterialsUsed: 0,
            reservationsUsed: 0,
            status: 'active', // 支払い成功で必ずアクティブに
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        logger.debug(`Usage reset for subscription: ${subscriptionId}`);
      } catch (error) {
        console.error("Error resetting usage:", error);
        throw error;
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
        const [sub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!sub) {
          console.error(`Subscription not found: ${subscriptionId}`);
          break;
        }

        // ステータスを past_due に更新
        await tx
          .update(subscriptions)
          .set({
            status: 'past_due',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        logger.debug(`Payment failed for subscription: ${subscriptionId}`);

        // TODO: ユーザーにメール通知を送信
      } catch (error) {
        console.error("Error handling payment failure:", error);
        throw error;
      }
      break;
    }

    // 返金処理
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

      if (!paymentIntentId) {
        logger.debug("No payment_intent in charge.refunded event");
        break;
      }

      try {
        // PaymentIntentIDから予約を検索
        const [reservation] = await tx
          .select()
          .from(reservations)
          .where(eq(reservations.stripePaymentIntentId, paymentIntentId))
          .limit(1);

        if (!reservation) {
          logger.debug(`No reservation found for payment_intent: ${paymentIntentId}`);
          break;
        }

        // 全額返金かどうかをチェック
        const isFullRefund = charge.amount_refunded === charge.amount;

        if (isFullRefund) {
          // 全額返金の場合は予約をキャンセル状態に
          await tx
            .update(reservations)
            .set({
              status: "cancelled",
              paymentStatus: "refunded",
              cancelReason: "Payment refunded by Stripe",
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, reservation.id));

          // スロットの容量を解放（FOR UPDATE でロック）
          const [slot] = await tx
            .select()
            .from(lessonSlots)
            .where(eq(lessonSlots.id, reservation.slotId))
            .for("update")
            .limit(1);

          if (slot && slot.currentCapacity > 0) {
            await tx
              .update(lessonSlots)
              .set({
                currentCapacity: sql`${lessonSlots.currentCapacity} - 1`,
                status: slot.currentCapacity === 1 ? "available" : slot.status,
                updatedAt: new Date(),
              })
              .where(eq(lessonSlots.id, slot.id));

            logger.info(`Slot capacity released for slot: ${slot.id}`);
          }

          logger.info(`Full refund processed for reservation: ${reservation.id}`);
        } else {
          // 部分返金の場合は状態のみ更新
          await tx
            .update(reservations)
            .set({
              paymentStatus: "partial_refund",
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, reservation.id));

          logger.info(`Partial refund processed for reservation: ${reservation.id}`);
        }

        // TODO: ユーザーとメンターにメール通知を送信
      } catch (error) {
        console.error("Error processing refund:", error);
        throw error;
      }
      break;
    }

    // Payment Intent キャンセル（予約キャンセル対応）
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const reservationId = paymentIntent.metadata?.reservationId;

      if (!reservationId) break;

      try {
        // 予約を取得
        const [reservation] = await tx
          .select()
          .from(reservations)
          .where(eq(reservations.id, reservationId))
          .limit(1);

        if (!reservation) {
          logger.debug(`Reservation not found: ${reservationId}`);
          break;
        }

        // 予約をキャンセル状態に更新
        await tx
          .update(reservations)
          .set({
            status: "cancelled",
            paymentStatus: "cancelled",
            cancelReason: paymentIntent.cancellation_reason || "Payment intent cancelled",
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        // スロットの容量を解放（支払い前でも仮予約でブロックしていた場合）
        const [slot] = await tx
          .select()
          .from(lessonSlots)
          .where(eq(lessonSlots.id, reservation.slotId))
          .for("update")
          .limit(1);

        if (slot && slot.currentCapacity > 0) {
          await tx
            .update(lessonSlots)
            .set({
              currentCapacity: sql`${lessonSlots.currentCapacity} - 1`,
              status: slot.currentCapacity === 1 ? "available" : slot.status,
              updatedAt: new Date(),
            })
            .where(eq(lessonSlots.id, slot.id));

          logger.info(`Slot capacity released for cancelled payment: ${slot.id}`);
        }

        logger.info(`Payment cancelled for reservation: ${reservationId}`);
      } catch (error) {
        console.error("Error handling payment cancellation:", error);
        throw error;
      }
      break;
    }

    default:
      logger.debug(`Unhandled event type: ${event.type}`);
  }
}