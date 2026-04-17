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
  type PaymentFailedEmailData,
  type DialPurchaseConfirmedEmailData,
  type DialResultsReadyEmailData,
  type DialAdditionalCycleEmailData,
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

export interface PaymentFailedNotificationData {
  subscriptionId: string;
  userId: string;
  tier: string;
  errorMessage?: string;
}

export interface DialPurchaseNotificationData {
  sessionId: string;
  purchaseId: string;
  purchaseType: string;
  email: string;
  guestToken?: string;
}

export interface DialResultsNotificationData {
  sessionId: string;
  purchaseType: string;
  email: string;
}

export interface DialAdditionalCycleNotificationData {
  sessionId: string;
  email: string;
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
   * Send notification when subscription payment fails
   */
  async onPaymentFailed(data: PaymentFailedNotificationData): Promise<NotificationResult> {
    try {
      const user = await userRepository.findById(data.userId);

      if (!user) {
        logger.error('[NotificationService] User not found for payment failure notification', {
          userId: data.userId,
          subscriptionId: data.subscriptionId,
        });
        return { success: false, errors: ['User not found'] };
      }

      const emailData: PaymentFailedEmailData = {
        userName: user.name || user.email,
        tier: data.tier.charAt(0).toUpperCase() + data.tier.slice(1),
        errorMessage: data.errorMessage,
        updatePaymentUrl: `${APP_URL}/dashboard/settings/billing`,
      };

      const result = await emailService.sendPaymentFailed(
        { email: user.email, name: user.name || undefined },
        emailData
      );

      logger.info('[NotificationService] Payment failure notification sent', {
        subscriptionId: data.subscriptionId,
        userId: data.userId,
        success: result.success,
      });

      return {
        success: result.success,
        studentEmailSent: result.success,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send payment failure notification', {
        error,
        subscriptionId: data.subscriptionId,
        userId: data.userId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send notification when a MUEDial purchase is completed
   */
  async onDialPurchaseCompleted(data: DialPurchaseNotificationData): Promise<NotificationResult> {
    if (!data.email) {
      return { success: false, errors: ['No email provided'] };
    }

    try {
      const sessionUrl = data.guestToken
        ? `${APP_URL}/dial/session/${data.sessionId}?token=${data.guestToken}`
        : `${APP_URL}/dial/session/${data.sessionId}`;

      const emailData: DialPurchaseConfirmedEmailData = {
        email: data.email,
        purchaseType: data.purchaseType,
        sessionUrl,
      };

      const result = await emailService.sendDialPurchaseConfirmed(
        { email: data.email },
        emailData,
      );

      logger.info('[NotificationService] Dial purchase notification sent', {
        sessionId: data.sessionId,
        success: result.success,
      });

      return {
        success: result.success,
        studentEmailSent: result.success,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send dial purchase notification', {
        error,
        sessionId: data.sessionId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send notification when MUEDial mix results are ready
   */
  async onDialResultsReady(data: DialResultsNotificationData): Promise<NotificationResult> {
    if (!data.email) {
      return { success: false, errors: ['No email provided'] };
    }

    try {
      const emailData: DialResultsReadyEmailData = {
        email: data.email,
        purchaseType: data.purchaseType,
        downloadUrl: `${APP_URL}/dial/session/${data.sessionId}`,
      };

      const result = await emailService.sendDialResultsReady(
        { email: data.email },
        emailData,
      );

      logger.info('[NotificationService] Dial results notification sent', {
        sessionId: data.sessionId,
        success: result.success,
      });

      return {
        success: result.success,
        studentEmailSent: result.success,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send dial results notification', {
        error,
        sessionId: data.sessionId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send notification when a MUEDial additional cycle is purchased
   */
  async onDialAdditionalCyclePurchased(data: DialAdditionalCycleNotificationData): Promise<NotificationResult> {
    if (!data.email) {
      return { success: false, errors: ['No email provided'] };
    }

    try {
      const emailData: DialAdditionalCycleEmailData = {
        email: data.email,
        sessionUrl: `${APP_URL}/dial/session/${data.sessionId}`,
      };

      const result = await emailService.sendDialAdditionalCyclePurchased(
        { email: data.email },
        emailData,
      );

      logger.info('[NotificationService] Dial additional cycle notification sent', {
        sessionId: data.sessionId,
        success: result.success,
      });

      return {
        success: result.success,
        studentEmailSent: result.success,
        errors: result.error ? [result.error] : undefined,
      };
    } catch (error) {
      logger.error('[NotificationService] Failed to send dial additional cycle notification', {
        error,
        sessionId: data.sessionId,
      });
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async onBonusBudgetThreshold(percentUsed: number, cumulativeCostUsd: number): Promise<void> {
    const msg = `[BonusCampaign] Budget threshold crossed: ${percentUsed.toFixed(1)}% used ($${cumulativeCostUsd.toFixed(2)})`;
    logger.warn(msg);

    const alertEmail = process.env.OPERATOR_ALERT_EMAIL;
    if (!alertEmail || !emailService.isConfigured()) return;

    try {
      await emailService.sendAdminAlert(alertEmail, msg);
    } catch (err) {
      logger.error('[NotificationService] Failed to send budget threshold alert', { err });
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
