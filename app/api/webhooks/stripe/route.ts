import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db";
import { reservations, subscriptions, users, webhookEvents, lessonSlots, dialSessions, dialPurchases, dialSubscriptions, dialCreditPacks, dialCreditExpiry, dialSubscriptionEvents } from "@/db/schema";
import { eq, sql, and, gt, or, isNull } from "drizzle-orm";
import { DIAL_SUB_PLANS, CANCEL_GRACE_DAYS, CREDIT_PACK_EXPIRY_MONTHS, type DialSubTier } from '@/lib/dial/pricing';
import { grantFirstPurchaseBonus } from '@/lib/dial/bonus-campaign';
import { validateStripeConfig } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { notificationService } from "@/lib/services/notification.service";

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
  last_payment_error?: {
    message?: string;
  } | null;
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

      // ─── MUEDial: Route dial-specific checkouts ───────────────
      if (session.metadata?.service === 'dial') {
        if (session.metadata.purchaseType === 'additional_cycle') {
          await handleDialAdditionalCycle(tx, session);
        } else if (session.metadata.purchaseType === 'credit_pack') {
          await handleDialCreditPackCompleted(tx, session);
        } else {
          await handleDialCheckoutCompleted(tx, session, event.id);
        }
        break;
      }

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
        // 予約情報を取得
        const [reservation] = await tx
          .select({
            id: reservations.id,
            studentId: reservations.studentId,
            mentorId: reservations.mentorId,
            amount: reservations.amount,
            slotId: reservations.slotId,
          })
          .from(reservations)
          .where(eq(reservations.id, reservationId))
          .limit(1);

        if (!reservation) {
          console.error(`Reservation not found: ${reservationId}`);
          break;
        }

        // スロット情報を取得
        const [slot] = await tx
          .select()
          .from(lessonSlots)
          .where(eq(lessonSlots.id, reservation.slotId))
          .limit(1);

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

        // 通知を送信（トランザクション外で非同期実行）
        if (slot) {
          setImmediate(async () => {
            try {
              await notificationService.onPaymentCompleted({
                reservationId: reservation.id,
                studentId: reservation.studentId,
                mentorId: reservation.mentorId,
                amount: reservation.amount,
                paymentIntentId: session.payment_intent as string,
                startTime: slot.startTime,
              });
            } catch (notifyError) {
              logger.error('Failed to send payment notification', { error: notifyError });
            }
          });
        }
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

      // ─── MUEDial subscription update ───────────────
      if (subscription.metadata?.service === 'dial') {
        await handleDialSubscriptionUpdated(tx, subscription, event.id);
        break;
      }

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

      // ─── MUEDial subscription deleted ───────────────
      if (subscription.metadata?.service === 'dial') {
        await handleDialSubscriptionDeleted(tx, subscription, event.id);
        break;
      }

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
            tier: 'free', // Freeにダウングレード
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

      // ─── MUEDial subscription credit reset ───────────────
      const [dialSub] = await tx
        .select()
        .from(dialSubscriptions)
        .where(eq(dialSubscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (dialSub) {
        // Grant new credits with no expiry (unlimited rollover while subscribed)
        const grantedAt = new Date();

        await tx.insert(dialCreditExpiry).values({
          subscriptionId: dialSub.id,
          credits: dialSub.mixCreditsTotal,
          creditsRemaining: dialSub.mixCreditsTotal,
          grantedAt,
          expiresAt: null, // No expiry — active subscriber rollover
        });

        // Recalculate total remaining (all valid grants)
        const validGrants = await tx
          .select()
          .from(dialCreditExpiry)
          .where(and(
            eq(dialCreditExpiry.subscriptionId, dialSub.id),
            gt(dialCreditExpiry.creditsRemaining, 0),
            or(isNull(dialCreditExpiry.expiresAt), gt(dialCreditExpiry.expiresAt, grantedAt)),
          ));

        const totalRemaining = validGrants.reduce(
          (sum, g) => sum + g.creditsRemaining, 0
        );

        await tx
          .update(dialSubscriptions)
          .set({
            mixCreditsRemaining: totalRemaining,
            status: 'active',
            updatedAt: grantedAt,
          })
          .where(eq(dialSubscriptions.id, dialSub.id));

        logger.debug(`MUEDial ${dialSub.mixCreditsTotal}cr granted for subscription: ${subscriptionId} (total remaining: ${totalRemaining}cr, no expiry while subscribed)`);
        break;
      }

      // ─── MUEDnote subscription reset ───────────────
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

        // 月次使用量をリセット（全カウンターをリセット）
        await tx
          .update(subscriptions)
          .set({
            aiMaterialsUsed: 0,
            reservationsUsed: 0,
            hooConversationsUsed: 0, // Hoo スレッド数リセット
            hooTurnsUsed: 0,          // Hoo ターン数リセット
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

        // Log state transition for dial subscriptions (for D30/D60 retention analytics)
        const [dialSub] = await tx
          .select()
          .from(dialSubscriptions)
          .where(eq(dialSubscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (dialSub) {
          await tx.insert(dialSubscriptionEvents).values({
            subscriptionId: dialSub.id,
            userId: dialSub.userId,
            eventType: 'invoice.payment_failed',
            stripeEventId: event.id,
            fromStatus: dialSub.status,
            toStatus: 'past_due',
            cancelAtPeriodEnd: dialSub.cancelAtPeriodEnd,
            currentPeriodEnd: dialSub.currentPeriodEnd,
            stripeSubscriptionId: subscriptionId,
          });
        }

        // Send payment failure notification to user
        setImmediate(async () => {
          try {
            await notificationService.onPaymentFailed({
              subscriptionId: sub.id,
              userId: sub.userId,
              tier: sub.tier,
              errorMessage: invoice.last_payment_error?.message || undefined,
            });
          } catch (notifyError) {
            logger.error('Failed to send payment failure notification', { error: notifyError });
          }
        });
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

        // キャンセル通知を送信（全額返金時のみ）
        if (isFullRefund) {
          const [slot] = await tx
            .select()
            .from(lessonSlots)
            .where(eq(lessonSlots.id, reservation.slotId))
            .limit(1);

          if (slot) {
            setImmediate(async () => {
              try {
                await notificationService.onReservationCancelled({
                  reservationId: reservation.id,
                  studentId: reservation.studentId,
                  mentorId: reservation.mentorId,
                  startTime: slot.startTime,
                  cancelledBy: 'system',
                  reason: 'Payment refunded',
                  refundAmount: (charge.amount_refunded / 100).toString(),
                });
              } catch (notifyError) {
                logger.error('Failed to send refund notification', { error: notifyError });
              }
            });
          }
        }
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

// ========================================
// MUEDial Webhook Handlers
// ========================================

// Credit amounts per tier — sourced from pricing constants (backward compat: all tiers retained)
const DIAL_SUB_CREDITS: Record<string, number> = {
  hoo_pass: DIAL_SUB_PLANS.hoo_pass.credits,
  basic: DIAL_SUB_PLANS.basic.credits,
  pro: DIAL_SUB_PLANS.pro.credits,
  studio: DIAL_SUB_PLANS.studio.credits,
};

async function handleDialCheckoutCompleted(
  tx: Transaction,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const { dialSessionId, tier, userId, credits } = session.metadata || {};
  // Support both old (purchaseId) and new (purchaseIds) metadata formats
  const purchaseIds = session.metadata?.purchaseIds
    ? session.metadata.purchaseIds.split(',')
    : session.metadata?.purchaseId
      ? [session.metadata.purchaseId]
      : [];
  const mixType = session.metadata?.mixType || session.metadata?.purchaseType || '';

  if (session.mode === 'payment') {
    // One-time purchase
    if (!dialSessionId || purchaseIds.length === 0) {
      logger.error('[Dial Webhook] Missing metadata for one-time purchase');
      return;
    }

    // Update all purchase records
    const customerCountry = session.customer_details?.address?.country || null;
    for (const pid of purchaseIds) {
      await tx
        .update(dialPurchases)
        .set({
          status: 'completed',
          customerCountry,
          stripePaymentIntentId: session.payment_intent as string,
          completedAt: new Date(),
        })
        .where(eq(dialPurchases.id, pid));
    }

    // Update session payment status
    await tx
      .update(dialSessions)
      .set({
        paymentStatus: 'paid',
        stripeCheckoutSessionId: session.id,
        updatedAt: new Date(),
      })
      .where(eq(dialSessions.id, dialSessionId));

    logger.info(`[Dial Webhook] Purchase completed: ${purchaseIds.join(',')} (mix=${mixType})`);

    // Fetch guest token + userId for email link and bonus eligibility
    const [dialSession] = await tx
      .select({ guestToken: dialSessions.guestToken, userId: dialSessions.userId })
      .from(dialSessions)
      .where(eq(dialSessions.id, dialSessionId))
      .limit(1);

    // Grant first-purchase 400cr bonus for authenticated users
    let bonusResult: { granted: boolean; newCumulativeCostUsd?: number; crossedThreshold?: number } = { granted: false };
    if (dialSession?.userId) {
      bonusResult = await grantFirstPurchaseBonus(dialSession.userId, tx);
    }

    // Send email notification (async, non-blocking)
    setImmediate(async () => {
      try {
        await notificationService.onDialPurchaseCompleted({
          sessionId: dialSessionId,
          purchaseId: purchaseIds[0],
          purchaseType: mixType || 'omakase',
          email: session.customer_email || session.customer_details?.email || '',
          guestToken: dialSession?.guestToken ?? undefined,
        });
      } catch (error) {
        logger.error('[Dial Webhook] Failed to send purchase notification', { error });
      }

      // Budget threshold alert — only fires when a new 80/95/100% milestone is crossed
      if (bonusResult.crossedThreshold !== undefined && bonusResult.newCumulativeCostUsd !== undefined) {
        try {
          await notificationService.onBonusBudgetThreshold(
            bonusResult.crossedThreshold,
            bonusResult.newCumulativeCostUsd,
          );
        } catch (error) {
          logger.error('[Dial Webhook] Failed to send budget threshold alert', { error });
        }
      }
    });
  } else if (session.mode === 'subscription') {
    // Subscription purchase
    if (!userId || !tier) {
      logger.error('[Dial Webhook] Missing userId or tier for subscription');
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as unknown as StripeSubscriptionWithPeriods;
    const totalCredits = parseInt(credits || '0') || DIAL_SUB_CREDITS[tier] || 1000;
    const customerCountry = session.customer_details?.address?.country || null;

    // Upsert dial subscription
    const [existingSub] = await tx
      .select()
      .from(dialSubscriptions)
      .where(eq(dialSubscriptions.userId, userId))
      .limit(1);

    let subscriptionId: string;

    if (existingSub) {
      await tx
        .update(dialSubscriptions)
        .set({
          tier: tier as DialSubTier,
          status: 'active',
          stripeSubscriptionId,
          stripeCustomerId: session.customer as string,
          customerCountry,
          mixCreditsRemaining: totalCredits,
          mixCreditsTotal: totalCredits,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(dialSubscriptions.id, existingSub.id));
      subscriptionId = existingSub.id;
    } else {
      const [newSub] = await tx.insert(dialSubscriptions).values({
        userId,
        tier: tier as DialSubTier,
        status: 'active',
        stripeSubscriptionId,
        stripeCustomerId: session.customer as string,
        customerCountry,
        mixCreditsRemaining: totalCredits,
        mixCreditsTotal: totalCredits,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      }).returning({ id: dialSubscriptions.id });
      subscriptionId = newSub.id;
    }

    // Create credit grant with no expiry (unlimited rollover while subscribed)
    const grantedAt = new Date();

    await tx.insert(dialCreditExpiry).values({
      subscriptionId,
      credits: totalCredits,
      creditsRemaining: totalCredits,
      grantedAt,
      expiresAt: null, // No expiry — active subscriber rollover
    });

    await tx.insert(dialSubscriptionEvents).values({
      subscriptionId,
      userId,
      eventType: 'checkout.session.completed',
      stripeEventId: eventId,
      fromStatus: null,
      toStatus: 'active',
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      stripeSubscriptionId,
    });

    logger.info(`[Dial Webhook] Subscription created: ${stripeSubscriptionId} for user: ${userId}, ${totalCredits}cr granted (no expiry while subscribed)`);

    // Grant first-purchase 400cr bonus — best-effort, must not block credit delivery
    try {
      const bonusResult = await grantFirstPurchaseBonus(userId, tx);
      setImmediate(async () => {
        if (bonusResult.crossedThreshold !== undefined && bonusResult.newCumulativeCostUsd !== undefined) {
          try {
            await notificationService.onBonusBudgetThreshold(
              bonusResult.crossedThreshold,
              bonusResult.newCumulativeCostUsd,
            );
          } catch (error) {
            logger.error('[Dial Webhook] Failed to send budget threshold alert', { error });
          }
        }
      });
    } catch (error) {
      logger.warn('[Dial Webhook] Bonus grant failed — credit delivery unaffected', { userId, error });
    }
  }
}

async function handleDialAdditionalCycle(
  tx: Transaction,
  session: Stripe.Checkout.Session,
) {
  const { dialSessionId, purchaseId } = session.metadata || {};

  if (!dialSessionId || !purchaseId) {
    logger.error('[Dial Webhook] Missing metadata for additional cycle purchase');
    return;
  }

  // Update purchase status
  await tx
    .update(dialPurchases)
    .set({
      status: 'completed',
      stripePaymentIntentId: session.payment_intent as string,
      completedAt: new Date(),
    })
    .where(eq(dialPurchases.id, purchaseId));

  // Increment additionalCyclesPurchased on the session
  const [dialSession] = await tx
    .select()
    .from(dialSessions)
    .where(eq(dialSessions.id, dialSessionId))
    .limit(1);

  if (dialSession) {
    await tx
      .update(dialSessions)
      .set({
        additionalCyclesPurchased: dialSession.additionalCyclesPurchased + 1,
        updatedAt: new Date(),
      })
      .where(eq(dialSessions.id, dialSessionId));
  }

  logger.info(`[Dial Webhook] Additional cycle purchased for session: ${dialSessionId}`);

  // Send email notification (async, non-blocking)
  setImmediate(async () => {
    try {
      await notificationService.onDialAdditionalCyclePurchased({
        sessionId: dialSessionId,
        email: session.customer_email || session.customer_details?.email || '',
      });
    } catch (error) {
      logger.error('[Dial Webhook] Failed to send additional cycle notification', { error });
    }
  });
}

async function handleDialCreditPackCompleted(
  tx: Transaction,
  session: Stripe.Checkout.Session,
) {
  const { creditPackId, userId } = session.metadata || {};

  if (!creditPackId || !userId) {
    logger.error('[Dial Webhook] Missing metadata for credit pack purchase');
    return;
  }

  const customerCountry = session.customer_details?.address?.country || null;
  const completedAt = new Date();
  const expiresAt = new Date(completedAt);
  expiresAt.setMonth(expiresAt.getMonth() + CREDIT_PACK_EXPIRY_MONTHS);

  const result = await tx
    .update(dialCreditPacks)
    .set({
      status: 'completed',
      customerCountry,
      stripePaymentIntentId: session.payment_intent as string,
      completedAt,
      expiresAt,
    })
    .where(eq(dialCreditPacks.id, creditPackId))
    .returning({ id: dialCreditPacks.id });

  if (result.length === 0) {
    logger.error(`[Dial Webhook] Credit pack not found: ${creditPackId} for user: ${userId}`);
    return;
  }

  logger.info(`[Dial Webhook] Credit pack completed: ${creditPackId} for user: ${userId} (country: ${customerCountry}, expires: ${expiresAt.toISOString()})`);

  // Grant first-purchase 400cr bonus — best-effort, must not block credit delivery
  try {
    const bonusResult = await grantFirstPurchaseBonus(userId, tx);
    setImmediate(async () => {
      if (bonusResult.crossedThreshold !== undefined && bonusResult.newCumulativeCostUsd !== undefined) {
        try {
          await notificationService.onBonusBudgetThreshold(
            bonusResult.crossedThreshold,
            bonusResult.newCumulativeCostUsd,
          );
        } catch (error) {
          logger.error('[Dial Webhook] Failed to send budget threshold alert', { error });
        }
      }
    });
  } catch (error) {
    logger.warn('[Dial Webhook] Bonus grant failed — credit delivery unaffected', { userId, error });
  }
}

async function handleDialSubscriptionUpdated(
  tx: Transaction,
  subscription: StripeSubscriptionWithPeriods,
  eventId: string,
) {
  const [existingSub] = await tx
    .select()
    .from(dialSubscriptions)
    .where(eq(dialSubscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!existingSub) {
    logger.error(`[Dial Webhook] Subscription not found: ${subscription.id}`);
    return;
  }

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
    paused: 'cancelled',
  };

  const prevStatus = existingSub.status;
  const newStatus = statusMap[subscription.status] || 'active';

  await tx
    .update(dialSubscriptions)
    .set({
      status: newStatus,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(dialSubscriptions.id, existingSub.id));

  await tx.insert(dialSubscriptionEvents).values({
    subscriptionId: existingSub.id,
    userId: existingSub.userId,
    eventType: 'customer.subscription.updated',
    stripeEventId: eventId,
    fromStatus: prevStatus,
    toStatus: newStatus,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    stripeSubscriptionId: subscription.id,
  });

  logger.debug(`[Dial Webhook] Subscription updated: ${subscription.id} (${prevStatus} → ${newStatus})`);
}

async function handleDialSubscriptionDeleted(
  tx: Transaction,
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const [existingSub] = await tx
    .select()
    .from(dialSubscriptions)
    .where(eq(dialSubscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!existingSub) {
    logger.error(`[Dial Webhook] Subscription not found for deletion: ${subscription.id}`);
    return;
  }

  const prevStatus = existingSub.status;
  const now = new Date();

  await tx
    .update(dialSubscriptions)
    .set({
      status: 'cancelled',
      cancelAtPeriodEnd: false,
      updatedAt: now,
    })
    .where(eq(dialSubscriptions.id, existingSub.id));

  // Set 30-day grace period on all remaining grants (rollover credits)
  const graceExpiry = new Date(now);
  graceExpiry.setDate(graceExpiry.getDate() + CANCEL_GRACE_DAYS);

  await tx
    .update(dialCreditExpiry)
    .set({ expiresAt: graceExpiry })
    .where(and(
      eq(dialCreditExpiry.subscriptionId, existingSub.id),
      gt(dialCreditExpiry.creditsRemaining, 0),
      or(isNull(dialCreditExpiry.expiresAt), gt(dialCreditExpiry.expiresAt, now)),
    ));

  await tx.insert(dialSubscriptionEvents).values({
    subscriptionId: existingSub.id,
    userId: existingSub.userId,
    eventType: 'customer.subscription.deleted',
    stripeEventId: eventId,
    fromStatus: prevStatus,
    toStatus: 'cancelled',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: existingSub.currentPeriodEnd,
    stripeSubscriptionId: subscription.id,
  });

  logger.info(`[Dial Webhook] Subscription cancelled: ${subscription.id}. Remaining credits expire ${graceExpiry.toISOString()} (${CANCEL_GRACE_DAYS}-day grace)`);
}