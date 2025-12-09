/**
 * Notification Service - High-level notification orchestration
 *
 * Orchestrates sending notifications across different channels:
 * - Email (via EmailService)
 * - Future: Push notifications, SMS, in-app notifications
 *
 * Integrates with:
 * - Reservation system
 * - Payment/Webhook handlers
 * - Reminder cron jobs
 */

import { logger } from '@/lib/utils/logger';
import { userRepository } from '@/lib/repositories';
import {
  emailService,
  type ReservationEmailData,
  type PaymentEmailData,
  type CancellationEmailData,
  type ReminderEmailData,
} from './email.service';
import { formatInTimeZone } from 'date-fns-tz';

// ========================================
// Configuration
// ========================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';
const TIMEZONE = 'Asia/Tokyo';

// ========================================
// Type Definitions
// ========================================

export interface ReservationNotificationData {
  reservationId: string;
  studentId: string;
  mentorId: string;
  startTime: Date;
  endTime: Date;
  price: string;
}

export interface PaymentNotificationData {
  reservationId: string;
  studentId: string;
  mentorId: string;
  amount: string;
  paymentIntentId: string;
  startTime: Date;
  receiptUrl?: string;
}

export interface CancellationNotificationData {
  reservationId: string;
  studentId: string;
  mentorId: string;
  startTime: Date;
  cancelledBy: 'student' | 'mentor' | 'system';
  reason?: string;
  refundAmount?: string;
}

export interface ReminderNotificationData {
  reservationId: string;
  studentId: string;
  mentorId: string;
  startTime: Date;
  hoursUntil: number;
}

interface NotificationResult {
  success: boolean;
  studentEmailSent?: boolean;
  mentorEmailSent?: boolean;
  errors?: string[];
}

// ========================================
// Helper Functions
// ========================================

function formatDate(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'yyyy年M月d日(E)');
}

function formatTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'HH:mm');
}

function calculateDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`;
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  return `¥${num.toLocaleString('ja-JP')}`;
}

// ========================================
// Notification Service Class
// ========================================

class NotificationService {
  /**
   * Send notifications when a reservation is confirmed
   */
  async onReservationConfirmed(data: ReservationNotificationData): Promise<NotificationResult> {
    const errors: string[] = [];

    try {
      // Fetch user details
      const [student, mentor] = await Promise.all([
        userRepository.findById(data.studentId),
        userRepository.findById(data.mentorId),
      ]);

      if (!student || !mentor) {
        logger.error('[NotificationService] User not found for reservation notification', {
          studentId: data.studentId,
          mentorId: data.mentorId,
          studentFound: !!student,
          mentorFound: !!mentor,
        });
        return {
          success: false,
          errors: ['User not found'],
        };
      }

      const emailData: ReservationEmailData = {
        studentName: student.name || student.email,
        mentorName: mentor.name || mentor.email,
        lessonDate: formatDate(data.startTime),
        lessonTime: formatTime(data.startTime),
        duration: calculateDuration(data.startTime, data.endTime),
        price: formatPrice(data.price),
        reservationId: data.reservationId,
        dashboardUrl: `${APP_URL}/dashboard/lessons`,
      };

      // Send emails in parallel
      const [studentResult, mentorResult] = await Promise.all([
        emailService.sendReservationConfirmationToStudent(
          { email: student.email, name: student.name || undefined },
          emailData
        ),
        emailService.sendReservationNotificationToMentor(
          { email: mentor.email, name: mentor.name || undefined },
          emailData
        ),
      ]);

      if (!studentResult.success) {
        errors.push(`Student email failed: ${studentResult.error}`);
      }
      if (!mentorResult.success) {
        errors.push(`Mentor email failed: ${mentorResult.error}`);
      }

      logger.info('[NotificationService] Reservation confirmation sent', {
        reservationId: data.reservationId,
        studentEmailSent: studentResult.success,
        mentorEmailSent: mentorResult.success,
      });

      return {
        success: errors.length === 0,
        studentEmailSent: studentResult.success,
        mentorEmailSent: mentorResult.success,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send reservation notifications', {
        error,
        reservationId: data.reservationId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send notification when payment is completed
   */
  async onPaymentCompleted(data: PaymentNotificationData): Promise<NotificationResult> {
    try {
      const [student, mentor] = await Promise.all([
        userRepository.findById(data.studentId),
        userRepository.findById(data.mentorId),
      ]);

      if (!student || !mentor) {
        logger.error('[NotificationService] User not found for payment notification', {
          studentId: data.studentId,
          mentorId: data.mentorId,
        });
        return { success: false, errors: ['User not found'] };
      }

      const emailData: PaymentEmailData = {
        studentName: student.name || student.email,
        mentorName: mentor.name || mentor.email,
        lessonDate: formatDate(data.startTime),
        amount: formatPrice(data.amount),
        paymentId: data.paymentIntentId,
        receiptUrl: data.receiptUrl,
      };

      const result = await emailService.sendPaymentCompleted(
        { email: student.email, name: student.name || undefined },
        emailData
      );

      logger.info('[NotificationService] Payment notification sent', {
        reservationId: data.reservationId,
        success: result.success,
      });

      return {
        success: result.success,
        studentEmailSent: result.success,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send payment notification', {
        error,
        reservationId: data.reservationId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send notifications when a reservation is cancelled
   */
  async onReservationCancelled(data: CancellationNotificationData): Promise<NotificationResult> {
    const errors: string[] = [];

    try {
      const [student, mentor] = await Promise.all([
        userRepository.findById(data.studentId),
        userRepository.findById(data.mentorId),
      ]);

      if (!student || !mentor) {
        logger.error('[NotificationService] User not found for cancellation notification', {
          studentId: data.studentId,
          mentorId: data.mentorId,
        });
        return { success: false, errors: ['User not found'] };
      }

      const lessonDate = formatDate(data.startTime);
      const lessonTime = formatTime(data.startTime);

      // Send to student
      const studentData: CancellationEmailData = {
        recipientName: student.name || student.email,
        otherPartyName: mentor.name || mentor.email,
        lessonDate,
        lessonTime,
        reason: data.reason,
        refundAmount: data.refundAmount ? formatPrice(data.refundAmount) : undefined,
      };

      // Send to mentor
      const mentorData: CancellationEmailData = {
        recipientName: mentor.name || mentor.email,
        otherPartyName: student.name || student.email,
        lessonDate,
        lessonTime,
        reason: data.reason,
      };

      const [studentResult, mentorResult] = await Promise.all([
        emailService.sendCancellation(
          { email: student.email, name: student.name || undefined },
          studentData
        ),
        emailService.sendCancellation(
          { email: mentor.email, name: mentor.name || undefined },
          mentorData
        ),
      ]);

      if (!studentResult.success) {
        errors.push(`Student email failed: ${studentResult.error}`);
      }
      if (!mentorResult.success) {
        errors.push(`Mentor email failed: ${mentorResult.error}`);
      }

      logger.info('[NotificationService] Cancellation notifications sent', {
        reservationId: data.reservationId,
        cancelledBy: data.cancelledBy,
        studentEmailSent: studentResult.success,
        mentorEmailSent: mentorResult.success,
      });

      return {
        success: errors.length === 0,
        studentEmailSent: studentResult.success,
        mentorEmailSent: mentorResult.success,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send cancellation notifications', {
        error,
        reservationId: data.reservationId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send lesson reminder
   */
  async sendReminder(data: ReminderNotificationData): Promise<NotificationResult> {
    try {
      const [student, mentor] = await Promise.all([
        userRepository.findById(data.studentId),
        userRepository.findById(data.mentorId),
      ]);

      if (!student || !mentor) {
        logger.error('[NotificationService] User not found for reminder', {
          studentId: data.studentId,
          mentorId: data.mentorId,
        });
        return { success: false, errors: ['User not found'] };
      }

      const emailData: ReminderEmailData = {
        studentName: student.name || student.email,
        mentorName: mentor.name || mentor.email,
        lessonDate: formatDate(data.startTime),
        lessonTime: formatTime(data.startTime),
        hoursUntil: data.hoursUntil,
        dashboardUrl: `${APP_URL}/dashboard/lessons`,
      };

      const result = await emailService.sendReminder(
        { email: student.email, name: student.name || undefined },
        emailData
      );

      logger.info('[NotificationService] Reminder sent', {
        reservationId: data.reservationId,
        hoursUntil: data.hoursUntil,
        success: result.success,
      });

      return {
        success: result.success,
        studentEmailSent: result.success,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send reminder', {
        error,
        reservationId: data.reservationId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Check if notification service is available
   */
  isAvailable(): boolean {
    return emailService.isConfigured();
  }
}

// ========================================
// Singleton Instance
// ========================================

export const notificationService = new NotificationService();
export { NotificationService };
