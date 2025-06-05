import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

/**
 * 返金処理の結果型
 */
export interface RefundResult {
  success: boolean;
  refund?: Stripe.Refund;
  error?: string;
  refundAmount: number;
  refundId?: string;
}

/**
 * 返金理由の型定義
 */
export type RefundReason = 
  | 'duplicate' 
  | 'fraudulent' 
  | 'requested_by_customer';

/**
 * Payment Intentに対する返金処理
 */
export async function processRefund(
  paymentIntentId: string,
  refundAmount?: number,
  reason: RefundReason = 'requested_by_customer',
  metadata?: Record<string, string>
): Promise<RefundResult> {
  try {
    console.log('🔄 返金処理開始:', {
      paymentIntentId,
      refundAmount,
      reason,
      metadata
    });

    // Payment Intentの詳細を取得
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `返金できません。決済ステータス: ${paymentIntent.status}`,
        refundAmount: 0
      };
    }

    // 返金可能金額をチェック
    const chargedAmount = paymentIntent.amount;
    // Stripe APIの型定義の問題を回避するため、安全にアクセス
    const alreadyRefunded = (paymentIntent as unknown as { amount_refunded?: number }).amount_refunded || 0;
    const availableForRefund = chargedAmount - alreadyRefunded;
    
    if (availableForRefund <= 0) {
      return {
        success: false,
        error: '既に全額返金済みです',
        refundAmount: 0
      };
    }

    // 返金金額の決定（指定がない場合は全額返金）
    const actualRefundAmount = refundAmount ? 
      Math.min(refundAmount, availableForRefund) : 
      availableForRefund;

    // Stripe返金処理
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: actualRefundAmount,
      reason,
      metadata: {
        ...metadata,
        refund_timestamp: new Date().toISOString(),
        original_amount: chargedAmount.toString(),
        refund_amount: actualRefundAmount.toString()
      }
    });

    console.log('✅ Stripe返金完了:', {
      refundId: refund.id,
      amount: actualRefundAmount,
      status: refund.status
    });

    return {
      success: true,
      refund,
      refundAmount: actualRefundAmount,
      refundId: refund.id
    };

  } catch (error) {
    console.error('❌ Stripe返金エラー:', error);
    
    let errorMessage = '返金処理中にエラーが発生しました';
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripeエラー: ${error.message}`;
    }

    return {
      success: false,
      error: errorMessage,
      refundAmount: 0
    };
  }
}

/**
 * 予約に関連する返金処理（データベース更新込み）
 */
export async function processReservationRefund(
  reservationId: string,
  refundReason: string,
  refundAmount?: number,
  adminUserId?: string
): Promise<RefundResult> {
  try {
    console.log('🔄 予約返金処理開始:', {
      reservationId,
      refundReason,
      refundAmount,
      adminUserId
    });

    // 予約と決済情報を取得
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        payments: true,
        users: {
          select: { id: true, name: true, email: true }
        },
        lesson_slots: {
          include: {
            users: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!reservation) {
      return {
        success: false,
        error: '予約が見つかりません',
        refundAmount: 0
      };
    }

    if (!reservation.payments) {
      return {
        success: false,
        error: '決済情報が見つかりません',
        refundAmount: 0
      };
    }

    const payment = reservation.payments;

    // 既に返金済みかチェック
    const paymentWithRefund = payment as unknown as { refunded_at?: Date; refund_amount?: number };
    if (paymentWithRefund.refunded_at) {
      return {
        success: false,
        error: '既に返金処理済みです',
        refundAmount: paymentWithRefund.refund_amount || 0
      };
    }

    // Payment Intentが存在するかチェック
    if (!payment.stripe_payment_id) {
      return {
        success: false,
        error: 'Stripe決済IDが見つかりません',
        refundAmount: 0
      };
    }

    // Stripe返金処理
    const refundResult = await processRefund(
      payment.stripe_payment_id,
      refundAmount,
      'requested_by_customer',
      {
        reservation_id: reservationId,
        student_id: reservation.student_id,
        teacher_id: reservation.lesson_slots.teacher_id,
        refund_reason: refundReason,
        admin_user_id: adminUserId || 'system'
      }
    );

    if (!refundResult.success) {
      return refundResult;
    }

    // データベース更新（トランザクション）
    await prisma.$transaction(async (tx) => {
      // 決済テーブルの返金情報更新
      await tx.payments.update({
        where: { id: payment.id },
        data: {
          refunded_at: new Date(),
          refund_amount: refundResult.refundAmount,
          refund_reason: refundReason,
          updated_at: new Date()
        }
      });

      // 予約ステータスをCANCELEDに更新（まだでない場合）
      if (reservation.status !== 'CANCELED') {
        await tx.reservations.update({
          where: { id: reservationId },
          data: {
            status: 'CANCELED',
            canceled_at: new Date(),
            canceled_by: adminUserId || 'system',
            cancel_reason: 'ADMIN_REQUEST',
            updated_at: new Date()
          }
        });
      }
    });

    console.log('✅ 予約返金処理完了:', {
      reservationId,
      refundAmount: refundResult.refundAmount,
      refundId: refundResult.refundId
    });

    return refundResult;

  } catch (error) {
    console.error('❌ 予約返金処理エラー:', error);
    return {
      success: false,
      error: `予約返金処理中にエラーが発生しました: ${String(error)}`,
      refundAmount: 0
    };
  }
}

/**
 * 返金可能金額を取得
 */
export async function getRefundableAmount(paymentIntentId: string): Promise<{
  success: boolean;
  refundableAmount: number;
  totalAmount: number;
  alreadyRefunded: number;
  error?: string;
}> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    const totalAmount = paymentIntent.amount;
    const alreadyRefunded = (paymentIntent as unknown as { amount_refunded?: number }).amount_refunded || 0;
    const refundableAmount = totalAmount - alreadyRefunded;

    return {
      success: true,
      refundableAmount,
      totalAmount,
      alreadyRefunded
    };

  } catch (error) {
    console.error('返金可能金額取得エラー:', error);
    return {
      success: false,
      refundableAmount: 0,
      totalAmount: 0,
      alreadyRefunded: 0,
      error: String(error)
    };
  }
}

/**
 * 返金履歴を取得
 */
export async function getRefundHistory(paymentIntentId: string): Promise<{
  success: boolean;
  refunds: Stripe.Refund[];
  error?: string;
}> {
  try {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100
    });

    return {
      success: true,
      refunds: refunds.data
    };

  } catch (error) {
    console.error('返金履歴取得エラー:', error);
    return {
      success: false,
      refunds: [],
      error: String(error)
    };
  }
}

/**
 * 返金ステータスを確認
 */
export async function checkRefundStatus(refundId: string): Promise<{
  success: boolean;
  refund?: Stripe.Refund;
  error?: string;
}> {
  try {
    const refund = await stripe.refunds.retrieve(refundId);
    
    return {
      success: true,
      refund
    };

  } catch (error) {
    console.error('返金ステータス確認エラー:', error);
    return {
      success: false,
      error: String(error)
    };
  }
} 