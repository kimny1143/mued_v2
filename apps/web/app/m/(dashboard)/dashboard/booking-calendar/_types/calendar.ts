// カレンダー関連の型定義

export interface LessonSlot {
  id: string;
  teacherId: string;      // APIが返すcamelCaseに合わせる
  startTime: string;      // start_time -> startTime
  endTime: string;        // end_time -> endTime
  hourlyRate: number;     // hourly_rate -> hourlyRate
  currency?: string;
  minHours?: number;      // min_hours -> minHours
  maxHours?: number;      // max_hours -> maxHours
  isAvailable: boolean;   // is_available -> isAvailable
  createdAt: string;      // created_at -> createdAt
  updatedAt: string;      // updated_at -> updatedAt
  teacher?: {             // mentor -> teacher
    id: string;
    name: string | null;
    email?: string;
    image?: string | null;
  };
  reservations?: Array<{
    id: string;
    bookedStartTime: string;
    bookedEndTime: string;
    status: string;
    student?: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  hourlySlots?: any[];
  durationConstraints?: {
    minDuration: number;
    maxDuration: number;
    minHours: number | null;
    maxHours: number | null;
  };
}

export interface Reservation {
  id: string;
  slotId: string;           // lesson_slot_id -> slotId
  studentId: string;        // student_id -> studentId
  status: string;           // APIが大文字を返すためstringに
  bookedStartTime: string;  // APIが返す形式に合わせる
  bookedEndTime: string;
  totalAmount?: number;     // total_amount -> totalAmount
  durationMinutes?: number; // duration_minutes -> durationMinutes
  createdAt?: string;       // created_at -> createdAt
  updatedAt?: string;       // updated_at -> updatedAt
  notes?: string | null;
  student?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  lessonSlots?: {           // lesson_slot -> lessonSlots
    startTime: string;
    endTime: string;
    users?: {
      id: string;
      name: string | null;
      image?: string | null;
    };
  };
}

export interface TimeSlot {
  hour: number;
  minute: number;
  slots: LessonSlot[];
  reservations: Reservation[];
}

export interface DaySlots {
  date: Date;
  slots: LessonSlot[];
  reservations: Reservation[];
}

export type SlotStatus = 'available' | 'partial' | 'full' | 'unavailable';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'slot' | 'reservation';
  status: string;
  data: LessonSlot | Reservation;
}