/**
 * ケース変換ユーティリティ
 * データベース（スネークケース）とフロントエンド（キャメルケース）間の変換を行う
 */

// 基本的なケース変換関数
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// データベースとフロントエンド間のオブジェクト型定義
type DbLessonSlot = {
  id: string;
  teacher_id: string;
  start_time: Date;
  end_time: Date;
  hourly_rate: number;
  currency: string;
  min_hours: number;
  max_hours: number | null;
  min_duration: number | null;
  max_duration: number | null;
  is_available: boolean;
  // descriptionフィールドは存在しない
  // description: string | null;
  created_at: Date;
  updated_at: Date;
  users?: { id: string; name: string | null; image: string | null };
  reservations?: DbReservation[];
};

type DbReservation = {
  id: string;
  slot_id: string;
  student_id: string;
  status: string;
  payment_id: string | null;
  booked_start_time: Date;
  booked_end_time: Date;
  hours_booked: number;
  total_amount: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  duration_minutes: number | null;
  approved_at?: Date | null;
  approved_by?: string | null;
  rejected_at?: Date | null;
  rejection_reason?: string | null;
  canceled_at?: Date | null;
  canceled_by?: string | null;
  cancel_reason?: string | null;
  rescheduled_from?: string | null;
  rescheduled_to?: string | null;
  users?: { id: string; name: string | null; email: string | null };
};

type FrontendLessonSlot = {
  id: string;
  teacherId: string;
  startTime: Date;
  endTime: Date;
  hourlyRate: number;
  currency: string;
  minHours: number;
  maxHours: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  isAvailable: boolean;
  // descriptionフィールドは存在しない
  // description: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher?: { id: string; name: string | null; image: string | null };
  reservations?: FrontendReservation[];
};

type FrontendReservation = {
  id: string;
  slotId: string;
  studentId: string;
  status: string;
  paymentId: string | null;
  bookedStartTime: Date;
  bookedEndTime: Date;
  hoursBooked: number;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  durationMinutes: number | null;
  student?: { id: string; name: string | null; email: string | null };
};

type LessonSlotRequestData = {
  startTime?: string;
  endTime?: string;
  hourlyRate?: string | number;
  currency?: string;
  minHours?: string | number;
  maxHours?: string | number | null;
  minDuration?: string | number;
  maxDuration?: string | number | null;
  // descriptionフィールドは存在しない
  // description?: string;
  isAvailable?: boolean;
};

// オブジェクトのキー変換（浅い変換）
export function camelToSnakeKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = value;
  }
  return result;
}

export function snakeToCamelKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] = value;
  }
  return result;
}

// レッスンスロット専用の変換関数
export function convertLessonSlotToResponse(slot: DbLessonSlot): FrontendLessonSlot {
  return {
    id: slot.id,
    teacherId: slot.teacher_id,
    startTime: slot.start_time,
    endTime: slot.end_time,
    hourlyRate: slot.hourly_rate,
    currency: slot.currency,
    minHours: slot.min_hours,
    maxHours: slot.max_hours,
    minDuration: slot.min_duration,
    maxDuration: slot.max_duration,
    isAvailable: slot.is_available,
    // descriptionフィールドは存在しない
    // description: slot.description,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
    // teacher情報が含まれている場合
    ...(slot.users && { teacher: slot.users }),
    // 予約情報が含まれている場合
    ...(slot.reservations && {
      reservations: slot.reservations.map((reservation: DbReservation): FrontendReservation => ({
        id: reservation.id,
        slotId: reservation.slot_id,
        studentId: reservation.student_id,
        status: reservation.status,
        paymentId: reservation.payment_id,
        bookedStartTime: reservation.booked_start_time,
        bookedEndTime: reservation.booked_end_time,
        hoursBooked: reservation.hours_booked,
        totalAmount: reservation.total_amount,
        notes: reservation.notes,
        createdAt: reservation.created_at,
        updatedAt: reservation.updated_at,
        durationMinutes: reservation.duration_minutes,
        // student情報が含まれている場合
        ...(reservation.users && { student: reservation.users })
      }))
    })
  };
}

// レッスンスロット配列の変換（一覧API用）
export function convertLessonSlotsArrayToResponse(slots: DbLessonSlot[]): Array<FrontendLessonSlot & { hourlySlots: unknown[]; durationConstraints: Record<string, unknown> }> {
  return slots.map(slot => {
    const baseSlot = convertLessonSlotToResponse(slot);
    
    // hourlySlots情報を生成する場合（generateHourlySlots用のデータ変換が必要）
    const slotForHourlyGeneration = {
      id: slot.id,
      startTime: slot.start_time,
      endTime: slot.end_time,
      teacherId: slot.teacher_id,
      isAvailable: slot.is_available,
      reservations: (slot.reservations || []).map((reservation: DbReservation) => ({
        id: reservation.id,
        bookedStartTime: reservation.booked_start_time,
        bookedEndTime: reservation.booked_end_time,
        status: reservation.status
      })),
      hourlyRate: slot.hourly_rate,
      currency: slot.currency
    };
    
    // generateHourlySlots関数が利用可能な場合のみ実行
    // 注意: 循環参照を避けるため、generateHourlySlots呼び出しは各API内で直接行う
    const hourlySlots: unknown[] = [];
    
    return {
      ...baseSlot,
      hourlySlots,
      // 分単位の予約時間制約を明示的に含める
      durationConstraints: {
        minDuration: slot.min_duration || 60,
        maxDuration: slot.max_duration || 90,
        minHours: slot.min_hours,
        maxHours: slot.max_hours
      }
    };
  });
}

// 予約データの変換
export function convertReservationToResponse(reservation: DbReservation): FrontendReservation & Record<string, unknown> {
  return {
    id: reservation.id,
    slotId: reservation.slot_id,
    studentId: reservation.student_id,
    status: reservation.status,
    paymentId: reservation.payment_id,
    bookedStartTime: reservation.booked_start_time,
    bookedEndTime: reservation.booked_end_time,
    hoursBooked: reservation.hours_booked,
    totalAmount: reservation.total_amount,
    notes: reservation.notes,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at,
    durationMinutes: reservation.duration_minutes,
    approvedAt: reservation.approved_at,
    approvedBy: reservation.approved_by,
    rejectedAt: reservation.rejected_at,
    rejectionReason: reservation.rejection_reason,
    canceledAt: reservation.canceled_at,
    canceledBy: reservation.canceled_by,
    cancelReason: reservation.cancel_reason,
    rescheduledFrom: reservation.rescheduled_from,
    rescheduledTo: reservation.rescheduled_to
  };
}

// フロントエンドからのリクエストデータ変換（キャメルケース→スネークケース）
export function convertLessonSlotRequestToDb(data: LessonSlotRequestData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  // 基本フィールドの変換
  if (data.startTime) result.start_time = new Date(data.startTime);
  if (data.endTime) result.end_time = new Date(data.endTime);
  if (data.hourlyRate !== undefined) result.hourly_rate = parseInt(String(data.hourlyRate), 10);
  if (data.currency) result.currency = data.currency;
  // descriptionフィールドはデータベースに存在しないため除外
  // if (data.description !== undefined) {
  //   result.description = data.description && data.description.trim() ? data.description : null;
  // }
  if (data.isAvailable !== undefined) result.is_available = Boolean(data.isAvailable);
  
  // 時間ベースの設定（minHours/maxHours優先、フォールバックでminDuration/maxDuration）
  if (data.minHours !== undefined) {
    const minHours = parseInt(String(data.minHours), 10);
    result.min_hours = minHours;
    result.min_duration = minHours * 60; // 時間を分に変換
  } else if (data.minDuration !== undefined) {
    const minDuration = parseInt(String(data.minDuration), 10);
    result.min_duration = minDuration;
    result.min_hours = Math.ceil(minDuration / 60); // 分を時間に変換（切り上げ）
  }
  
  if (data.maxHours !== undefined) {
    const maxHours = data.maxHours !== null ? parseInt(String(data.maxHours), 10) : null;
    result.max_hours = maxHours;
    result.max_duration = maxHours !== null ? maxHours * 60 : null; // 時間を分に変換
  } else if (data.maxDuration !== undefined) {
    const maxDuration = data.maxDuration !== null ? parseInt(String(data.maxDuration), 10) : null;
    result.max_duration = maxDuration;
    result.max_hours = maxDuration !== null ? Math.ceil(maxDuration / 60) : null; // 分を時間に変換（切り上げ）
  }
  
  // 自動設定フィールド
  result.updated_at = new Date();
  
  return result;
} 