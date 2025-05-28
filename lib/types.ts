// チャットメッセージ関連の型定義

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'student' | 'instructor' | 'system';
  room_id: string;
  timestamp: string;
  files?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  participants: ChatParticipant[];
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'student' | 'instructor';
}

// 通信用リクエスト/レスポンス型
export interface GetMessagesResponse {
  messages: ChatMessage[];
  has_more: boolean;
  next_cursor?: string;
}

export interface SendMessageRequest {
  content: string;
  room_id: string;
  files?: File[];
}

// ユーザー関連の型定義
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role_id: string;
  plan?: string;
}

// メンター関連の型定義
export interface Mentor {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
  bio?: string;
  specialties?: string[];
  rating?: {
    avgRating: number;
    totalReviews: number;
  };
  availableSlots?: LessonSlot[];
  availableSlotsCount?: number;
}

// レッスンスロット関連の型定義
export interface LessonSlot {
  id: string;
  teacherId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  hourlyRate?: number;
  currency?: string;
  teacher: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
  };
  reservations?: Reservation[];
}

// 予約関連の型定義
export interface Reservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  bookedStartTime: string;
  bookedEndTime: string;
  createdAt: string;
  student?: {
    id: string;
    name: string | null;
    email: string;
  };
  slot?: {
    id: string;
    teacherId: string;
    teacher?: {
      id: string;
      name: string | null;
    };
  };
} 