import { ReservationStatus, PaymentStatus } from '@prisma/client';

// CancelReasonの型定義（Prismaから生成されるまでの暫定）
export enum CancelReason {
  STUDENT_REQUEST = 'STUDENT_REQUEST',
  MENTOR_REQUEST = 'MENTOR_REQUEST',
  ADMIN_REQUEST = 'ADMIN_REQUEST',
  EMERGENCY = 'EMERGENCY',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// キャンセル関連の型定義
export interface CancellationData {
  canceledAt?: Date;
  canceledBy?: string;
  cancelReason?: CancelReason;
  rescheduledFrom?: string;
  rescheduledTo?: string;
}

// 返金関連の型定義
export interface RefundData {
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
}

// キャンセルリクエストの型定義
export interface CancelReservationRequest {
  reservationId: string;
  reason: CancelReason;
  notes?: string;
}

// リスケジュールリクエストの型定義
export interface RescheduleReservationRequest {
  reservationId: string;
  newSlotId: string;
  newStartTime: Date;
  newEndTime: Date;
  reason?: string;
}

// 返金リクエストの型定義
export interface RefundRequest {
  reservationId: string;
  refundAmount: number;
  reason: string;
}

// キャンセルポリシーの結果型
export interface CancellationPolicyResult {
  canCancel: boolean;
  cancellationFee: number;
  reason?: string;
}

// 予約の拡張型（キャンセル・リスケジュール情報を含む）
export interface ReservationWithCancellation {
  id: string;
  status: ReservationStatus;
  bookedStartTime: Date;
  bookedEndTime: Date;
  totalAmount: number;
  canceledAt?: Date | null;
  canceledBy?: string | null;
  cancelReason?: CancelReason | null;
  rescheduledFrom?: string | null;
  rescheduledTo?: string | null;
  payments?: {
    id: string;
    status: PaymentStatus;
    chargeExecutedAt?: Date | null;
    refundedAt?: Date | null;
    refundAmount?: number | null;
    refundReason?: string | null;
  } | null;
}

// メール通知用の型定義
export interface NotificationData {
  type: 'cancellation' | 'reschedule' | 'refund' | 'payment_reminder';
  reservationId: string;
  userId: string;
  metadata?: Record<string, string | number | boolean>;
} 