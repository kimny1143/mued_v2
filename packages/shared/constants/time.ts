// @mued/shared/constants/time - Time-related constants

/**
 * ミリ秒単位の時間定数
 */
export const TIME_IN_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // Approximate
  YEAR: 365 * 24 * 60 * 60 * 1000, // Approximate
} as const;

/**
 * デフォルトのタイムゾーン
 */
export const DEFAULT_TIMEZONE = 'Asia/Tokyo';

/**
 * レッスンの標準的な時間設定
 */
export const LESSON_DURATION = {
  MIN_HOURS: 1,
  MAX_HOURS: 4,
  DEFAULT_HOURS: 1,
} as const;

/**
 * 予約に関する時間制限
 */
export const BOOKING_TIME_LIMITS = {
  MIN_ADVANCE_HOURS: 24, // 最低24時間前までに予約
  MAX_ADVANCE_DAYS: 30, // 最大30日先まで予約可能
  CANCELLATION_DEADLINE_HOURS: 24, // キャンセルは24時間前まで
} as const;

/**
 * 営業時間（デフォルト）
 */
export const BUSINESS_HOURS = {
  START: 9, // 9:00
  END: 21, // 21:00
  DAYS: [1, 2, 3, 4, 5, 6], // 月曜から土曜（0=日曜）
} as const;