// @mued/shared/types/models - Shared model types

// User関連の型定義
export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string | null;
  phoneNumber?: string;
  avatarUrl?: string;
  image?: string | null;
  bio?: string;
  profileData?: Record<string, any>;
  plan?: string;
  roleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  userId: string;
  role: 'student' | 'mentor' | 'admin';
  specializations?: string[];
  yearsOfExperience?: number;
  mentorProfile?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
  mentorId: string;
  teacherId?: string; // 互換性のため
  studentId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  price: number;
  hourlyRate?: number;
  currency: string;
  status: 'available' | 'pending' | 'approved' | 'completed' | 'cancelled';
  isAvailable?: boolean;
  description?: string;
  topics?: string[];
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  teacher?: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
  };
  reservations?: Reservation[];
  createdAt: Date;
  updatedAt: Date;
}

// 予約ステータスの列挙型
export enum ReservationStatus {
  PENDING_MENTOR_APPROVAL = 'pending_mentor_approval',
  PENDING_STUDENT_PAYMENT = 'pending_student_payment',
  PAYMENT_SETUP_PENDING = 'payment_setup_pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  // Legacy statuses for compatibility
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PENDING = 'PENDING'
}

// 支払いステータスの列挙型
export enum PaymentStatus {
  PENDING = 'pending',
  SETUP_REQUIRED = 'setup_required',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PROCESSING = 'processing'
}

// キャンセル理由の列挙型
export enum CancelReason {
  STUDENT_REQUEST = 'STUDENT_REQUEST',
  MENTOR_REQUEST = 'MENTOR_REQUEST',
  ADMIN_REQUEST = 'ADMIN_REQUEST',
  EMERGENCY = 'EMERGENCY',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// 予約関連の型定義
export interface Reservation {
  id: string;
  studentId: string;
  lessonSlotId: string;
  slotId?: string; // 互換性のため
  status: ReservationStatus | keyof typeof ReservationStatus;
  paymentStatus: PaymentStatus | keyof typeof PaymentStatus;
  paymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paymentMethod?: string;
  notes?: string;
  bookedStartTime?: string | Date;
  bookedEndTime?: string | Date;
  totalAmount?: number;
  canceledAt?: Date | null;
  canceledBy?: string | null;
  cancelReason?: CancelReason | null;
  rescheduledFrom?: string | null;
  rescheduledTo?: string | null;
  createdAt: Date | string;
  updatedAt: Date;
  lessonSlot?: LessonSlot;
  slot?: LessonSlot; // 互換性のため
  student?: User | {
    id: string;
    name: string | null;
    email: string;
  };
  payments?: Payment | null;
}

// 支払い関連の型定義
export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  currency: string;
  status: PaymentStatus | keyof typeof PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  chargeExecutedAt?: Date | null;
  refundedAt?: Date | null;
  refundAmount?: number | null;
  refundReason?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// サブスクリプション関連の型定義
export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  priceId: string;
  plan: 'free' | 'basic' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// セッション関連の型定義
export interface Session {
  id: string;
  reservationId: string;
  startedAt?: Date;
  endedAt?: Date;
  actualDuration?: number;
  feedbackRating?: number;
  feedbackText?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// チャット関連の型定義
export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender_id?: string; // 互換性のため
  senderType: 'student' | 'instructor' | 'system';
  sender_type?: 'student' | 'instructor' | 'system'; // 互換性のため
  roomId: string;
  room_id?: string; // 互換性のため
  timestamp: string;
  files?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  fileName: string;
  file_name?: string; // 互換性のため
  fileUrl: string;
  file_url?: string; // 互換性のため
  fileType: string;
  file_type?: string; // 互換性のため
  fileSize: number;
  file_size?: number; // 互換性のため
}

export interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: string;
  last_message?: string; // 互換性のため
  lastMessageTime?: string;
  last_message_time?: string; // 互換性のため
  unreadCount?: number;
  unread_count?: number; // 互換性のため
  participants: ChatParticipant[];
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  avatar_url?: string; // 互換性のため
  role: 'student' | 'instructor';
}