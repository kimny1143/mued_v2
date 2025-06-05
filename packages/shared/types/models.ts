// @mued/shared/types/models - Shared model types

export interface User {
  id: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  profileData?: Record<string, any>;
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

export interface LessonSlot {
  id: string;
  mentorId: string;
  studentId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  price: number;
  currency: string;
  status: 'available' | 'pending' | 'approved' | 'completed' | 'cancelled';
  description?: string;
  topics?: string[];
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  studentId: string;
  lessonSlotId: string;
  status: 'pending_mentor_approval' | 'pending_student_payment' | 'payment_setup_pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  paymentStatus: 'pending' | 'setup_required' | 'completed' | 'failed' | 'refunded' | 'processing';
  paymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lessonSlot?: LessonSlot;
  student?: User;
}

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