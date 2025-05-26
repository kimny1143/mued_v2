/**
 * 決済フロー統合ミドルウェア
 * 
 * 予約作成・更新時に新旧決済フローを自動判定し、
 * 適切な処理を実行するためのミドルウェア関数群
 */

import { 
  shouldUseNewPaymentFlow, 
  getPaymentExecutionTiming,
  getNextPaymentAction,
  getReservationPaymentFlowType,
  getTransitionPeriodHandling
} from './payment-flow';

export interface ReservationPaymentContext {
  reservationId: string;
  studentId: string;
  teacherId: string;
  lessonStartTime: Date;
  totalAmount: number;
  createdAt: Date;
}

export interface PaymentFlowResult {
  flowType: 'NEW_FLOW' | 'LEGACY_FLOW';
  nextAction: string;
  redirectUrl?: string;
  setupIntentClientSecret?: string;
  paymentIntentClientSecret?: string;
  message: string;
  requiresUserAction: boolean;
}

/**
 * 予約作成時の決済フロー判定と処理
 * @param context 予約コンテキスト
 * @returns 決済フロー処理結果
 */
export async function handleReservationPaymentFlow(
  context: ReservationPaymentContext
): Promise<PaymentFlowResult> {
  const useNewFlow = shouldUseNewPaymentFlow(context.createdAt);
  
  if (useNewFlow) {
    return await handleNewPaymentFlow(context);
  } else {
    return await handleLegacyPaymentFlow(context);
  }
}

/**
 * 新決済フロー（Setup Intent → 2時間前自動実行）の処理
 */
async function handleNewPaymentFlow(
  context: ReservationPaymentContext
): Promise<PaymentFlowResult> {
  const timing = getPaymentExecutionTiming(context.lessonStartTime, true);
  
  return {
    flowType: 'NEW_FLOW',
    nextAction: 'SETUP_REQUIRED',
    redirectUrl: `/reservations/${context.reservationId}/setup-payment`,
    message: `カード情報を登録してください。レッスン開始2時間前（${timing.executionTime.toLocaleString('ja-JP')}）に自動決済されます。`,
    requiresUserAction: true
  };
}

/**
 * 旧決済フロー（即座決済）の処理
 */
async function handleLegacyPaymentFlow(
  context: ReservationPaymentContext
): Promise<PaymentFlowResult> {
  return {
    flowType: 'LEGACY_FLOW',
    nextAction: 'PAYMENT_REQUIRED',
    redirectUrl: `/reservations/${context.reservationId}/checkout`,
    message: '決済を完了してください。',
    requiresUserAction: true
  };
}

/**
 * 予約の現在の決済状態を取得
 * @param reservationId 予約ID
 * @returns 決済状態情報
 */
export async function getReservationPaymentStatus(reservationId: string) {
  const { prisma } = await import('./prisma');
  
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
    throw new Error('予約が見つかりません');
  }

  const flowInfo = getReservationPaymentFlowType({
    createdAt: reservation.createdAt,
    bookedStartTime: reservation.bookedStartTime,
    payments: reservation.payments
  });

  return {
    reservation,
    flowInfo,
    timing: getPaymentExecutionTiming(reservation.bookedStartTime, flowInfo.useNewFlow)
  };
}

/**
 * 決済フロー移行期間中のユーザー通知メッセージを生成
 * @param reservationDate 予約作成日
 * @returns 通知メッセージ
 */
export function generatePaymentFlowNotification(reservationDate: Date): string | null {
  const transition = getTransitionPeriodHandling(reservationDate);
  
  if (transition.shouldShowMigrationNotice) {
    return transition.migrationMessage;
  }
  
  return null;
}

/**
 * 決済フロー統合のためのAPI応答ヘルパー
 * @param context 予約コンテキスト
 * @returns API応答用のデータ
 */
export async function createPaymentFlowResponse(
  context: ReservationPaymentContext
) {
  const flowResult = await handleReservationPaymentFlow(context);
  const notification = generatePaymentFlowNotification(context.createdAt);
  
  return {
    reservation: {
      id: context.reservationId,
      flowType: flowResult.flowType,
      nextAction: flowResult.nextAction,
      message: flowResult.message
    },
    payment: {
      redirectUrl: flowResult.redirectUrl,
      setupIntentClientSecret: flowResult.setupIntentClientSecret,
      paymentIntentClientSecret: flowResult.paymentIntentClientSecret,
      requiresUserAction: flowResult.requiresUserAction
    },
    notification,
    timing: getPaymentExecutionTiming(context.lessonStartTime)
  };
} 