// @mued/shared/constants/status - Status constants

export const RESERVATION_STATUS_LABELS = {
  pending_mentor_approval: '承認待ち',
  pending_student_payment: '支払い待ち',
  payment_setup_pending: '支払い設定待ち',
  confirmed: '確定',
  completed: '完了',
  cancelled: 'キャンセル',
  rejected: '却下',
  // Legacy statuses
  PENDING_APPROVAL: '承認待ち',
  APPROVED: '承認済み',
  PENDING: '保留中',
} as const;

export const PAYMENT_STATUS_LABELS = {
  pending: '支払い待ち',
  setup_required: '設定必要',
  completed: '完了',
  failed: '失敗',
  refunded: '返金済み',
  processing: '処理中',
} as const;

export const SESSION_STATUS_LABELS = {
  scheduled: '予定',
  in_progress: '進行中',
  completed: '完了',
  cancelled: 'キャンセル',
} as const;

export const SUBSCRIPTION_STATUS_LABELS = {
  active: '有効',
  canceled: 'キャンセル済み',
  past_due: '支払い遅延',
  trialing: 'トライアル中',
  incomplete: '未完了',
  incomplete_expired: '期限切れ',
} as const;