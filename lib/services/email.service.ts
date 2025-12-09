/**
 * Email Service - Core email sending functionality using Resend
 *
 * Provides type-safe email sending with templates for:
 * - Reservation confirmations (student/mentor)
 * - Payment notifications
 * - Cancellation notices
 * - Reminder emails
 */

import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';

// ========================================
// Configuration
// ========================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'MUED <noreply@mued.jp>';
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT || 'support@mued.jp';

// Initialize Resend client (lazy initialization)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ========================================
// Type Definitions
// ========================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ========================================
// Email Templates
// ========================================

export interface ReservationEmailData {
  studentName: string;
  mentorName: string;
  lessonDate: string;
  lessonTime: string;
  duration: string;
  price: string;
  reservationId: string;
  dashboardUrl: string;
}

export interface PaymentEmailData {
  studentName: string;
  mentorName: string;
  lessonDate: string;
  amount: string;
  paymentId: string;
  receiptUrl?: string;
}

export interface CancellationEmailData {
  recipientName: string;
  otherPartyName: string;
  lessonDate: string;
  lessonTime: string;
  reason?: string;
  refundAmount?: string;
}

export interface ReminderEmailData {
  studentName: string;
  mentorName: string;
  lessonDate: string;
  lessonTime: string;
  hoursUntil: number;
  dashboardUrl: string;
}

// ========================================
// Template Generators
// ========================================

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MUED</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">MUED</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">Music Education Platform</p>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>このメールは自動送信されています。</p>
    <p>ご質問がございましたら、<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> までお問い合わせください。</p>
    <p>&copy; ${new Date().getFullYear()} MUED. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

export const emailTemplates = {
  /**
   * Reservation confirmed - sent to student
   */
  reservationConfirmedStudent(data: ReservationEmailData): { subject: string; html: string; text: string } {
    const subject = `予約が確定しました - ${data.lessonDate}`;

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">予約が確定しました</h2>
      <p>${data.studentName} 様</p>
      <p>レッスンの予約が確定しましたのでお知らせします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">講師</span>
          <span class="value">${data.mentorName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
        <div class="info-row">
          <span class="label">時間</span>
          <span class="value">${data.duration}</span>
        </div>
        <div class="info-row">
          <span class="label">料金</span>
          <span class="value">${data.price}</span>
        </div>
        <div class="info-row">
          <span class="label">予約ID</span>
          <span class="value">${data.reservationId.slice(0, 8)}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">ダッシュボードで確認</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        キャンセルする場合は、レッスン開始24時間前までにダッシュボードからお手続きください。
      </p>
    `);

    const text = `
予約が確定しました

${data.studentName} 様

レッスンの予約が確定しましたのでお知らせします。

講師: ${data.mentorName}
日時: ${data.lessonDate} ${data.lessonTime}
時間: ${data.duration}
料金: ${data.price}
予約ID: ${data.reservationId.slice(0, 8)}

ダッシュボード: ${data.dashboardUrl}

キャンセルする場合は、レッスン開始24時間前までにダッシュボードからお手続きください。
    `.trim();

    return { subject, html, text };
  },

  /**
   * Reservation confirmed - sent to mentor
   */
  reservationConfirmedMentor(data: ReservationEmailData): { subject: string; html: string; text: string } {
    const subject = `新規予約 - ${data.lessonDate}`;

    const html = baseTemplate(`
      <h2 style="color: #2563eb; margin-top: 0;">新しい予約が入りました</h2>
      <p>${data.mentorName} 様</p>
      <p>新しいレッスンの予約が入りましたのでお知らせします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">生徒</span>
          <span class="value">${data.studentName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
        <div class="info-row">
          <span class="label">時間</span>
          <span class="value">${data.duration}</span>
        </div>
        <div class="info-row">
          <span class="label">料金</span>
          <span class="value">${data.price}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">ダッシュボードで確認</a>
      </p>
    `);

    const text = `
新しい予約が入りました

${data.mentorName} 様

新しいレッスンの予約が入りましたのでお知らせします。

生徒: ${data.studentName}
日時: ${data.lessonDate} ${data.lessonTime}
時間: ${data.duration}
料金: ${data.price}

ダッシュボード: ${data.dashboardUrl}
    `.trim();

    return { subject, html, text };
  },

  /**
   * Payment completed notification
   */
  paymentCompleted(data: PaymentEmailData): { subject: string; html: string; text: string } {
    const subject = `お支払いが完了しました`;

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">お支払いが完了しました</h2>
      <p>${data.studentName} 様</p>
      <p>レッスン料金のお支払いが完了しました。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">講師</span>
          <span class="value">${data.mentorName}</span>
        </div>
        <div class="info-row">
          <span class="label">レッスン日</span>
          <span class="value">${data.lessonDate}</span>
        </div>
        <div class="info-row">
          <span class="label">金額</span>
          <span class="value">${data.amount}</span>
        </div>
        <div class="info-row">
          <span class="label">決済ID</span>
          <span class="value">${data.paymentId.slice(0, 12)}</span>
        </div>
      </div>

      ${data.receiptUrl ? `
      <p style="text-align: center;">
        <a href="${data.receiptUrl}" class="button">領収書を表示</a>
      </p>
      ` : ''}
    `);

    const text = `
お支払いが完了しました

${data.studentName} 様

レッスン料金のお支払いが完了しました。

講師: ${data.mentorName}
レッスン日: ${data.lessonDate}
金額: ${data.amount}
決済ID: ${data.paymentId.slice(0, 12)}

${data.receiptUrl ? `領収書: ${data.receiptUrl}` : ''}
    `.trim();

    return { subject, html, text };
  },

  /**
   * Cancellation notification
   */
  cancellation(data: CancellationEmailData): { subject: string; html: string; text: string } {
    const subject = `レッスンがキャンセルされました - ${data.lessonDate}`;

    const html = baseTemplate(`
      <h2 style="color: #dc2626; margin-top: 0;">レッスンがキャンセルされました</h2>
      <p>${data.recipientName} 様</p>
      <p>以下のレッスンがキャンセルされましたのでお知らせします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">相手</span>
          <span class="value">${data.otherPartyName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
        ${data.reason ? `
        <div class="info-row">
          <span class="label">理由</span>
          <span class="value">${data.reason}</span>
        </div>
        ` : ''}
        ${data.refundAmount ? `
        <div class="info-row">
          <span class="label">返金額</span>
          <span class="value">${data.refundAmount}</span>
        </div>
        ` : ''}
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        ご不明な点がございましたら、サポートまでお問い合わせください。
      </p>
    `);

    const text = `
レッスンがキャンセルされました

${data.recipientName} 様

以下のレッスンがキャンセルされましたのでお知らせします。

相手: ${data.otherPartyName}
日時: ${data.lessonDate} ${data.lessonTime}
${data.reason ? `理由: ${data.reason}` : ''}
${data.refundAmount ? `返金額: ${data.refundAmount}` : ''}

ご不明な点がございましたら、サポートまでお問い合わせください。
    `.trim();

    return { subject, html, text };
  },

  /**
   * Lesson reminder
   */
  reminder(data: ReminderEmailData): { subject: string; html: string; text: string } {
    const subject = `レッスンリマインダー - ${data.hoursUntil}時間後`;

    const html = baseTemplate(`
      <h2 style="color: #f59e0b; margin-top: 0;">レッスンが近づいています</h2>
      <p>${data.studentName} 様</p>
      <p>レッスン開始まであと <strong>${data.hoursUntil}時間</strong> です。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">講師</span>
          <span class="value">${data.mentorName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">ダッシュボードで確認</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        レッスンの準備をお忘れなく!
      </p>
    `);

    const text = `
レッスンが近づいています

${data.studentName} 様

レッスン開始まであと ${data.hoursUntil}時間 です。

講師: ${data.mentorName}
日時: ${data.lessonDate} ${data.lessonTime}

ダッシュボード: ${data.dashboardUrl}

レッスンの準備をお忘れなく!
    `.trim();

    return { subject, html, text };
  },
};

// ========================================
// Email Service Class
// ========================================

class EmailService {
  /**
   * Send a single email
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const resend = getResendClient();

      const toAddresses = Array.isArray(options.to)
        ? options.to.map(r => r.email)
        : [options.to.email];

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || SUPPORT_EMAIL,
        tags: options.tags,
      });

      if (error) {
        logger.error('[EmailService] Failed to send email', {
          error: error.message,
          to: toAddresses,
          subject: options.subject,
        });
        return { success: false, error: error.message };
      }

      logger.info('[EmailService] Email sent successfully', {
        messageId: data?.id,
        to: toAddresses,
        subject: options.subject,
      });

      return { success: true, messageId: data?.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[EmailService] Exception while sending email', {
        error: errorMessage,
        subject: options.subject,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send reservation confirmation to student
   */
  async sendReservationConfirmationToStudent(
    to: EmailRecipient,
    data: ReservationEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.reservationConfirmedStudent(data);
    return this.send({
      to,
      ...template,
      tags: [
        { name: 'type', value: 'reservation_confirmed' },
        { name: 'role', value: 'student' },
      ],
    });
  }

  /**
   * Send reservation notification to mentor
   */
  async sendReservationNotificationToMentor(
    to: EmailRecipient,
    data: ReservationEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.reservationConfirmedMentor(data);
    return this.send({
      to,
      ...template,
      tags: [
        { name: 'type', value: 'reservation_confirmed' },
        { name: 'role', value: 'mentor' },
      ],
    });
  }

  /**
   * Send payment completion notification
   */
  async sendPaymentCompleted(
    to: EmailRecipient,
    data: PaymentEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.paymentCompleted(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'payment_completed' }],
    });
  }

  /**
   * Send cancellation notification
   */
  async sendCancellation(
    to: EmailRecipient,
    data: CancellationEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.cancellation(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'cancellation' }],
    });
  }

  /**
   * Send lesson reminder
   */
  async sendReminder(
    to: EmailRecipient,
    data: ReminderEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.reminder(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'reminder' }],
    });
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return !!RESEND_API_KEY;
  }
}

// ========================================
// Singleton Instance
// ========================================

export const emailService = new EmailService();
export { EmailService };
