import { differenceInHours, differenceInMinutes } from 'date-fns';
import { CancelReason } from '@/lib/types/reservation';

/**
 * キャンセルポリシーを管理するクラス
 * 
 * ポリシー:
 * - 生徒: レッスン開始24時間前までキャンセル可能（無料）
 * - 講師: レッスン開始2時間前までキャンセル可能（無料）
 * - 管理者: いつでもキャンセル可能
 * - 緊急事態: いつでもキャンセル可能（無料）
 */
export class CancellationPolicy {
  // キャンセル可能時間の定数
  static readonly STUDENT_CANCEL_HOURS = 24;
  static readonly MENTOR_CANCEL_HOURS = 2;
  
  /**
   * 生徒がキャンセル可能かどうかを判定
   */
  static canStudentCancel(lessonStartTime: Date): boolean {
    const hoursUntilLesson = differenceInHours(lessonStartTime, new Date());
    return hoursUntilLesson >= this.STUDENT_CANCEL_HOURS;
  }
  
  /**
   * 講師がキャンセル可能かどうかを判定
   */
  static canMentorCancel(lessonStartTime: Date): boolean {
    const hoursUntilLesson = differenceInHours(lessonStartTime, new Date());
    return hoursUntilLesson >= this.MENTOR_CANCEL_HOURS;
  }
  
  /**
   * 管理者は常にキャンセル可能
   */
  static canAdminCancel(): boolean {
    return true;
  }
  
  /**
   * ロールに基づいてキャンセル可能かどうかを判定
   */
  static canCancel(
    role: 'student' | 'mentor' | 'admin',
    lessonStartTime: Date,
    cancelReason?: CancelReason
  ): boolean {
    // 緊急事態の場合は常にキャンセル可能
    if (cancelReason === CancelReason.EMERGENCY || cancelReason === CancelReason.SYSTEM_ERROR) {
      return true;
    }
    
    switch (role) {
      case 'student':
        return this.canStudentCancel(lessonStartTime);
      case 'mentor':
        return this.canMentorCancel(lessonStartTime);
      case 'admin':
        return this.canAdminCancel();
      default:
        return false;
    }
  }
  
  /**
   * キャンセル料を計算
   */
  static calculateCancellationFee(
    role: 'student' | 'mentor' | 'admin',
    lessonStartTime: Date,
    totalAmount: number,
    cancelReason?: CancelReason
  ): number {
    // 緊急事態やシステムエラーの場合はキャンセル料なし
    if (cancelReason === CancelReason.EMERGENCY || cancelReason === CancelReason.SYSTEM_ERROR) {
      return 0;
    }
    
    // 管理者によるキャンセルはキャンセル料なし
    if (role === 'admin') {
      return 0;
    }
    
    // 講師都合のキャンセルはキャンセル料なし
    if (cancelReason === CancelReason.MENTOR_REQUEST) {
      return 0;
    }
    
    // 生徒のキャンセル料計算
    if (role === 'student') {
      if (this.canStudentCancel(lessonStartTime)) {
        return 0; // 24時間前までは無料
      } else {
        return totalAmount; // 24時間以内は100%のキャンセル料
      }
    }
    
    return 0;
  }
  
  /**
   * キャンセル可能時間までの残り時間を取得
   */
  static getTimeUntilCancelDeadline(
    role: 'student' | 'mentor' | 'admin',
    lessonStartTime: Date
  ): {
    hours: number;
    minutes: number;
    canCancel: boolean;
  } {
    const now = new Date();
    const totalMinutesUntilLesson = differenceInMinutes(lessonStartTime, now);
    
    let deadlineHours: number;
    switch (role) {
      case 'student':
        deadlineHours = this.STUDENT_CANCEL_HOURS;
        break;
      case 'mentor':
        deadlineHours = this.MENTOR_CANCEL_HOURS;
        break;
      case 'admin':
        return { hours: 0, minutes: 0, canCancel: true };
      default:
        return { hours: 0, minutes: 0, canCancel: false };
    }
    
    const deadlineMinutes = deadlineHours * 60;
    const minutesUntilDeadline = totalMinutesUntilLesson - deadlineMinutes;
    
    return {
      hours: Math.floor(minutesUntilDeadline / 60),
      minutes: minutesUntilDeadline % 60,
      canCancel: minutesUntilDeadline > 0
    };
  }
  
  /**
   * キャンセル理由の妥当性をチェック
   */
  static isValidCancelReason(
    reason: CancelReason,
    role: 'student' | 'mentor' | 'admin'
  ): boolean {
    switch (role) {
      case 'student':
        return reason === CancelReason.STUDENT_REQUEST || reason === CancelReason.EMERGENCY;
      case 'mentor':
        return reason === CancelReason.MENTOR_REQUEST || reason === CancelReason.EMERGENCY;
      case 'admin':
        return Object.values(CancelReason).includes(reason);
      default:
        return false;
    }
  }
  
  /**
   * キャンセルポリシーの詳細情報を取得
   */
  static getPolicyDetails(role: 'student' | 'mentor' | 'admin') {
    switch (role) {
      case 'student':
        return {
          cancelDeadlineHours: this.STUDENT_CANCEL_HOURS,
          description: 'レッスン開始24時間前までキャンセル可能（無料）',
          lateCancelFee: '100%のキャンセル料が発生します'
        };
      case 'mentor':
        return {
          cancelDeadlineHours: this.MENTOR_CANCEL_HOURS,
          description: 'レッスン開始2時間前までキャンセル可能',
          lateCancelFee: 'キャンセル料は発生しません'
        };
      case 'admin':
        return {
          cancelDeadlineHours: 0,
          description: 'いつでもキャンセル可能',
          lateCancelFee: 'キャンセル料は発生しません'
        };
      default:
        return {
          cancelDeadlineHours: 0,
          description: 'キャンセル権限がありません',
          lateCancelFee: ''
        };
    }
  }
}

/**
 * キャンセルポリシーの結果型
 */
export interface CancellationPolicyResult {
  canCancel: boolean;
  cancellationFee: number;
  reason?: string;
  timeUntilDeadline?: {
    hours: number;
    minutes: number;
  };
}

/**
 * 包括的なキャンセルポリシーチェック
 */
export function checkCancellationPolicy(
  role: 'student' | 'mentor' | 'admin',
  lessonStartTime: Date,
  totalAmount: number,
  cancelReason?: CancelReason
): CancellationPolicyResult {
  const canCancel = CancellationPolicy.canCancel(role, lessonStartTime, cancelReason);
  const cancellationFee = CancellationPolicy.calculateCancellationFee(
    role,
    lessonStartTime,
    totalAmount,
    cancelReason
  );
  const timeInfo = CancellationPolicy.getTimeUntilCancelDeadline(role, lessonStartTime);
  
  let reason: string | undefined;
  if (!canCancel) {
    const policyDetails = CancellationPolicy.getPolicyDetails(role);
    reason = `キャンセル期限を過ぎています。${policyDetails.description}`;
  }
  
  return {
    canCancel,
    cancellationFee,
    reason,
    timeUntilDeadline: timeInfo.canCancel ? {
      hours: timeInfo.hours,
      minutes: timeInfo.minutes
    } : undefined
  };
} 