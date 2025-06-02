/**
 * 決済フロー判定とポリシー管理
 * 
 * 新ポリシー（Setup Intent → 2時間前自動実行）と
 * 旧ポリシー（即座決済）の互換性を確保
 */

import { differenceInHours, isAfter } from 'date-fns';

// 新ポリシー適用開始日
const NEW_POLICY_START_DATE = new Date('2024-07-01T00:00:00Z');

/**
 * 新しい決済フローを使用するかどうかを判定
 * @param reservationDate 予約作成日時
 * @returns 新フローを使用する場合はtrue
 */
export function shouldUseNewPaymentFlow(reservationDate: Date): boolean {
  return isAfter(reservationDate, NEW_POLICY_START_DATE);
}

/**
 * レッスン開始時刻に基づいて新フローを使用するかどうかを判定
 * @param lessonStartTime レッスン開始時刻
 * @returns 新フローを使用する場合はtrue
 */
export function shouldUseNewPaymentFlowByLessonTime(lessonStartTime: Date): boolean {
  return isAfter(lessonStartTime, NEW_POLICY_START_DATE);
}

/**
 * 決済実行タイミングを判定
 * @param lessonStartTime レッスン開始時刻
 * @param useNewFlow 新フローを使用するかどうか
 * @returns 決済実行タイミング情報
 */
export function getPaymentExecutionTiming(
  lessonStartTime: Date, 
  useNewFlow: boolean = shouldUseNewPaymentFlowByLessonTime(lessonStartTime)
) {
  if (!useNewFlow) {
    return {
      shouldExecuteImmediately: true,
      executionTime: new Date(),
      hoursUntilExecution: 0,
      isAutoExecution: false
    };
  }

  const now = new Date();
  const twoHoursBeforeLesson = new Date(lessonStartTime.getTime() - 2 * 60 * 60 * 1000);
  
  // レッスン開始までの時間（時間単位）を計算
  const hoursUntilLesson = differenceInHours(lessonStartTime, now);
  
  // 2時間前の時刻までの時間を計算
  const hoursUntilExecutionTime = differenceInHours(twoHoursBeforeLesson, now);
  
  // デバッグログ追加
  console.log('💰 決済タイミング計算:', {
    now: now.toISOString(),
    nowJST: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    lessonStartTime: lessonStartTime.toISOString(),
    lessonStartTimeJST: lessonStartTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    twoHoursBeforeLesson: twoHoursBeforeLesson.toISOString(),
    twoHoursBeforeLessonJST: twoHoursBeforeLesson.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    hoursUntilLesson: hoursUntilLesson,
    hoursUntilExecutionTime: hoursUntilExecutionTime,
    shouldExecuteImmediately: hoursUntilLesson <= 2
  });

  return {
    shouldExecuteImmediately: hoursUntilLesson <= 2,  // レッスンまで2時間以内なら即座実行
    executionTime: twoHoursBeforeLesson,
    hoursUntilExecution: Math.max(0, hoursUntilExecutionTime),
    isAutoExecution: true
  };
}

/**
 * 決済ステータスに基づいて次のアクションを決定
 * @param paymentStatus 現在の決済ステータス
 * @param lessonStartTime レッスン開始時刻
 * @returns 次のアクション情報
 */
export function getNextPaymentAction(
  paymentStatus: string | null,
  lessonStartTime: Date
) {
  const useNewFlow = shouldUseNewPaymentFlowByLessonTime(lessonStartTime);
  const timing = getPaymentExecutionTiming(lessonStartTime, useNewFlow);

  if (!paymentStatus) {
    return {
      action: useNewFlow ? 'SETUP_REQUIRED' : 'PAYMENT_REQUIRED',
      message: useNewFlow 
        ? 'カード情報の登録が必要です' 
        : '決済処理が必要です',
      canProceed: true
    };
  }

  switch (paymentStatus) {
    case 'PENDING':
      return {
        action: 'WAIT_PAYMENT',
        message: '決済処理中です',
        canProceed: false
      };

    case 'SETUP_COMPLETED':
      if (timing.shouldExecuteImmediately) {
        return {
          action: 'EXECUTE_PAYMENT',
          message: '決済を実行します',
          canProceed: true
        };
      }
      return {
        action: 'WAIT_AUTO_EXECUTION',
        message: `レッスン開始2時間前（${timing.executionTime.toLocaleString('ja-JP')}）に自動決済されます`,
        canProceed: true,
        executionTime: timing.executionTime
      };

    case 'SUCCEEDED':
      return {
        action: 'COMPLETED',
        message: '決済が完了しています',
        canProceed: true
      };

    case 'CANCELED':
      return {
        action: 'RETRY_REQUIRED',
        message: '決済がキャンセルされました。再度お試しください',
        canProceed: false
      };

    default:
      return {
        action: 'UNKNOWN',
        message: '決済状況を確認中です',
        canProceed: false
      };
  }
}

/**
 * 予約の決済フロータイプを判定
 * @param reservation 予約情報
 * @returns フロータイプ
 */
export function getReservationPaymentFlowType(reservation: {
  createdAt: Date;
  bookedStartTime: Date;
  payments?: { status: string } | null;
}) {
  const useNewFlow = shouldUseNewPaymentFlow(reservation.createdAt);
  const paymentAction = getNextPaymentAction(
    reservation.payments?.status || null,
    reservation.bookedStartTime
  );

  return {
    flowType: useNewFlow ? 'NEW_FLOW' : 'LEGACY_FLOW',
    useNewFlow,
    currentAction: paymentAction,
    description: useNewFlow 
      ? 'Setup Intent → 2時間前自動実行' 
      : '即座決済実行'
  };
}

/**
 * 決済フロー移行期間中の特別処理
 * @param reservationDate 予約作成日
 * @returns 移行期間の処理情報
 */
export function getTransitionPeriodHandling(reservationDate: Date) {
  const daysSinceNewPolicy = differenceInHours(reservationDate, NEW_POLICY_START_DATE) / 24;
  
  // 新ポリシー開始から30日間は移行期間とする
  const isTransitionPeriod = daysSinceNewPolicy >= 0 && daysSinceNewPolicy <= 30;
  
  return {
    isTransitionPeriod,
    daysSinceNewPolicy: Math.max(0, daysSinceNewPolicy),
    shouldShowMigrationNotice: isTransitionPeriod,
    migrationMessage: isTransitionPeriod 
      ? '新しい決済システムに移行しました。カード情報を事前登録し、レッスン開始2時間前に自動決済されます。'
      : null
  };
} 