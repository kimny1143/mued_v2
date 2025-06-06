// 予約関連の型定義
export interface Reservation {
  id: string;
  studentId: string;
  mentorId: string;
  lessonSlotId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus: 'PENDING' | 'SETUP_COMPLETED' | 'PAID' | 'REFUNDED';
  studentMessage?: string;
  mentorMessage?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  lessonSlot?: LessonSlot;
  student?: User;
  mentor?: User;
}

export interface LessonSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
  createdAt: string;
  updatedAt: string;
  mentor?: User;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: 'STUDENT' | 'MENTOR' | 'ADMIN';
}

export interface Session {
  id: string;
  reservationId: string;
  startedAt?: string;
  endedAt?: string;
  studentFeedback?: string;
  mentorFeedback?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reservation?: Reservation;
}

// UI関連の型定義
export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lesson' | 'available_slot';
  status?: string;
  metadata?: any;
}