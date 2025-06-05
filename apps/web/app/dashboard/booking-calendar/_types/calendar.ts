// 予約カレンダー関連の型定義

// 基本の時間スロット
export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  hourlyRate?: number;
  reservations?: Array<{
    id: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'PENDING_APPROVAL';
    bookedStartTime?: string;
    bookedEndTime?: string;
  }>;
}

// 拡張された時間スロット（メンター情報と予約状況を含む）
export interface ExtendedTimeSlot extends TimeSlot {
  mentorId: string;
  mentorName: string | null;
  bookingStatus: 'available' | 'partial' | 'full' | 'unavailable';
  reservationCount: number;
  bookedTime: number; // 分単位
  availableTime: number; // 分単位
  bookingRate: number; // パーセント
}

// 生徒の予約情報
export interface MyReservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'PENDING_APPROVAL';
  bookedStartTime: string;
  bookedEndTime: string;
  createdAt: string;
  slot?: {
    id: string;
    teacherId: string;
    teacher?: {
      id: string;
      name: string | null;
    };
  };
}

// 他の予約情報（プライバシー保護のため限定的な情報のみ）
export interface OtherReservation {
  id: string;
  slotId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'PENDING_APPROVAL';
  bookedStartTime: string;
  bookedEndTime: string;
  studentId: string; // 表示には使用しない（プライバシー保護）
} 