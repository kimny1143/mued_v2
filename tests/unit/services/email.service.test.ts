/**
 * EmailService Unit Tests
 *
 * Tests:
 * - emailTemplates: 9 template generators (subject, html content, text content)
 * - EmailService convenience methods: correct template + tag delegation to send()
 * - EmailService.isConfigured: env var check
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Env setup (must run before module loads — RESEND_API_KEY is captured at module level)
// ========================================

vi.hoisted(() => {
  process.env.RESEND_API_KEY = 'test-resend-key';
});

// ========================================
// Mocks
// ========================================

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ========================================
// Imports
// ========================================

import { emailTemplates, emailService } from '@/lib/services/email.service';
import type {
  ReservationEmailData,
  PaymentEmailData,
  CancellationEmailData,
  ReminderEmailData,
  PaymentFailedEmailData,
  DialPurchaseConfirmedEmailData,
  DialResultsReadyEmailData,
  DialAdditionalCycleEmailData,
} from '@/lib/services/email.service';

// ========================================
// Fixtures
// ========================================

const reservationData: ReservationEmailData = {
  studentName: 'Taro Student',
  mentorName: 'Hanako Mentor',
  lessonDate: '2026年4月10日(金)',
  lessonTime: '19:00',
  duration: '1時間',
  price: '¥5,000',
  reservationId: 'res-12345678-abcd',
  dashboardUrl: 'https://mued.jp/dashboard/lessons',
};

const paymentData: PaymentEmailData = {
  studentName: 'Taro Student',
  mentorName: 'Hanako Mentor',
  lessonDate: '2026年4月10日(金)',
  amount: '¥5,000',
  paymentId: 'pi_1234567890abcdef',
  receiptUrl: 'https://stripe.com/receipt/123',
};

const cancellationData: CancellationEmailData = {
  recipientName: 'Taro Student',
  otherPartyName: 'Hanako Mentor',
  lessonDate: '2026年4月10日(金)',
  lessonTime: '19:00',
  reason: 'Schedule conflict',
  refundAmount: '¥5,000',
};

const reminderData: ReminderEmailData = {
  studentName: 'Taro Student',
  mentorName: 'Hanako Mentor',
  lessonDate: '2026年4月10日(金)',
  lessonTime: '19:00',
  hoursUntil: 24,
  dashboardUrl: 'https://mued.jp/dashboard/lessons',
};

const paymentFailedData: PaymentFailedEmailData = {
  userName: 'Taro User',
  tier: 'Standard',
  errorMessage: 'Card declined',
  updatePaymentUrl: 'https://mued.jp/dashboard/settings/billing',
};

const dialPurchaseData: DialPurchaseConfirmedEmailData = {
  email: 'buyer@example.com',
  purchaseType: 'omakase',
  sessionUrl: 'https://mued.jp/dial/session/sess-001',
};

const dialResultsData: DialResultsReadyEmailData = {
  email: 'creator@example.com',
  purchaseType: 'dialogue',
  downloadUrl: 'https://mued.jp/dial/session/sess-002',
};

const dialAdditionalCycleData: DialAdditionalCycleEmailData = {
  email: 'repeat@example.com',
  sessionUrl: 'https://mued.jp/dial/session/sess-003',
};

// ========================================
// Template Generator Tests
// ========================================

describe('emailTemplates', () => {
  describe('reservationConfirmedStudent', () => {
    it('returns subject with lesson date', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.subject).toBe('予約が確定しました - 2026年4月10日(金)');
    });

    it('includes student name in html', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.html).toContain('Taro Student');
    });

    it('includes mentor name in html', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.html).toContain('Hanako Mentor');
    });

    it('includes lesson details in html', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.html).toContain('19:00');
      expect(result.html).toContain('1時間');
      expect(result.html).toContain('¥5,000');
    });

    it('truncates reservationId to 8 chars', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.html).toContain('res-1234');
      expect(result.html).not.toContain('res-12345678-abcd');
      expect(result.text).toContain('res-1234');
    });

    it('includes dashboard URL', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.html).toContain('https://mued.jp/dashboard/lessons');
      expect(result.text).toContain('https://mued.jp/dashboard/lessons');
    });

    it('includes cancellation instructions', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.text).toContain('キャンセル');
      expect(result.text).toContain('24時間前');
    });

    it('returns valid HTML structure', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('</html>');
    });

    it('returns plain text version', () => {
      const result = emailTemplates.reservationConfirmedStudent(reservationData);
      expect(result.text).not.toContain('<');
      expect(result.text).toContain('予約が確定しました');
    });
  });

  describe('reservationConfirmedMentor', () => {
    it('returns subject with lesson date', () => {
      const result = emailTemplates.reservationConfirmedMentor(reservationData);
      expect(result.subject).toBe('新規予約 - 2026年4月10日(金)');
    });

    it('addresses mentor by name', () => {
      const result = emailTemplates.reservationConfirmedMentor(reservationData);
      expect(result.html).toContain('Hanako Mentor 様');
    });

    it('shows student name as the new booking', () => {
      const result = emailTemplates.reservationConfirmedMentor(reservationData);
      expect(result.text).toContain('生徒: Taro Student');
    });
  });

  describe('paymentCompleted', () => {
    it('returns payment subject', () => {
      const result = emailTemplates.paymentCompleted(paymentData);
      expect(result.subject).toBe('お支払いが完了しました');
    });

    it('truncates paymentId to 12 chars', () => {
      const result = emailTemplates.paymentCompleted(paymentData);
      expect(result.html).toContain('pi_123456789');
      expect(result.text).toContain('pi_123456789');
    });

    it('includes receipt URL when provided', () => {
      const result = emailTemplates.paymentCompleted(paymentData);
      expect(result.html).toContain('https://stripe.com/receipt/123');
      expect(result.text).toContain('https://stripe.com/receipt/123');
    });

    it('omits receipt link when no URL', () => {
      const result = emailTemplates.paymentCompleted({
        ...paymentData,
        receiptUrl: undefined,
      });
      expect(result.html).not.toContain('領収書を表示');
    });
  });

  describe('cancellation', () => {
    it('returns subject with lesson date', () => {
      const result = emailTemplates.cancellation(cancellationData);
      expect(result.subject).toBe('レッスンがキャンセルされました - 2026年4月10日(金)');
    });

    it('includes reason when provided', () => {
      const result = emailTemplates.cancellation(cancellationData);
      expect(result.html).toContain('Schedule conflict');
      expect(result.text).toContain('Schedule conflict');
    });

    it('omits reason when not provided', () => {
      const result = emailTemplates.cancellation({
        ...cancellationData,
        reason: undefined,
      });
      expect(result.text).not.toContain('理由:');
    });

    it('includes refund amount when provided', () => {
      const result = emailTemplates.cancellation(cancellationData);
      expect(result.html).toContain('¥5,000');
    });

    it('omits refund when not provided', () => {
      const result = emailTemplates.cancellation({
        ...cancellationData,
        refundAmount: undefined,
      });
      expect(result.text).not.toContain('返金額:');
    });
  });

  describe('reminder', () => {
    it('returns subject with hours until', () => {
      const result = emailTemplates.reminder(reminderData);
      expect(result.subject).toBe('レッスンリマインダー - 24時間後');
    });

    it('includes hours until in body', () => {
      const result = emailTemplates.reminder(reminderData);
      expect(result.html).toContain('24時間');
      expect(result.text).toContain('24時間');
    });

    it('includes dashboard URL', () => {
      const result = emailTemplates.reminder(reminderData);
      expect(result.html).toContain('https://mued.jp/dashboard/lessons');
    });
  });

  describe('dialPurchaseConfirmed', () => {
    it('returns bilingual subject', () => {
      const result = emailTemplates.dialPurchaseConfirmed(dialPurchaseData);
      expect(result.subject).toBe('MUEDial — セッションの準備ができました / Your session is ready');
    });

    it('uses omakase (non-dialogue) content branch', () => {
      const result = emailTemplates.dialPurchaseConfirmed(dialPurchaseData);
      // omakase path: auto-mix text (not dialogue text)
      expect(result.html).toContain('AIが自動でミックスを仕上げます');
      expect(result.text).toContain('AIが自動でミックスを処理');
    });

    it('includes session URL', () => {
      const result = emailTemplates.dialPurchaseConfirmed(dialPurchaseData);
      expect(result.html).toContain('https://mued.jp/dial/session/sess-001');
    });
  });

  describe('dialResultsReady', () => {
    it('returns English subject', () => {
      const result = emailTemplates.dialResultsReady(dialResultsData);
      expect(result.subject).toBe('Your MUEDial mix is ready!');
    });

    it('includes download URL', () => {
      const result = emailTemplates.dialResultsReady(dialResultsData);
      expect(result.html).toContain('https://mued.jp/dial/session/sess-002');
      expect(result.text).toContain('https://mued.jp/dial/session/sess-002');
    });

    it('includes purchase type', () => {
      const result = emailTemplates.dialResultsReady(dialResultsData);
      expect(result.html).toContain('dialogue');
    });
  });

  describe('dialAdditionalCyclePurchased', () => {
    it('returns English subject', () => {
      const result = emailTemplates.dialAdditionalCyclePurchased(dialAdditionalCycleData);
      expect(result.subject).toBe('Your additional mix cycle is ready');
    });

    it('includes session URL', () => {
      const result = emailTemplates.dialAdditionalCyclePurchased(dialAdditionalCycleData);
      expect(result.html).toContain('https://mued.jp/dial/session/sess-003');
    });
  });

  describe('paymentFailed', () => {
    it('returns urgent subject', () => {
      const result = emailTemplates.paymentFailed(paymentFailedData);
      expect(result.subject).toBe('【重要】お支払いに失敗しました - ご確認ください');
    });

    it('includes tier name', () => {
      const result = emailTemplates.paymentFailed(paymentFailedData);
      expect(result.html).toContain('Standardプラン');
      expect(result.text).toContain('Standardプラン');
    });

    it('includes error message when provided', () => {
      const result = emailTemplates.paymentFailed(paymentFailedData);
      expect(result.html).toContain('Card declined');
      expect(result.text).toContain('Card declined');
    });

    it('omits error block when no error message', () => {
      const result = emailTemplates.paymentFailed({
        ...paymentFailedData,
        errorMessage: undefined,
      });
      expect(result.html).not.toContain('エラー内容');
    });

    it('includes payment update URL', () => {
      const result = emailTemplates.paymentFailed(paymentFailedData);
      expect(result.html).toContain('https://mued.jp/dashboard/settings/billing');
    });
  });
});

// ========================================
// EmailService Class Tests
// ========================================

describe('EmailService', () => {
  let mockSend: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on send() to verify convenience methods delegate correctly
    mockSend = vi.spyOn(emailService, 'send').mockResolvedValue({
      success: true,
      messageId: 'msg-001',
    });
  });

  describe('convenience methods', () => {
    it('sendReservationConfirmationToStudent uses correct template and tags', async () => {
      await emailService.sendReservationConfirmationToStudent(
        { email: 'student@example.com' },
        reservationData
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: 'student@example.com' },
          subject: '予約が確定しました - 2026年4月10日(金)',
          tags: [
            { name: 'type', value: 'reservation_confirmed' },
            { name: 'role', value: 'student' },
          ],
        })
      );
    });

    it('sendReservationNotificationToMentor uses correct template and tags', async () => {
      await emailService.sendReservationNotificationToMentor(
        { email: 'mentor@example.com' },
        reservationData
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: 'mentor@example.com' },
          subject: '新規予約 - 2026年4月10日(金)',
          tags: [
            { name: 'type', value: 'reservation_confirmed' },
            { name: 'role', value: 'mentor' },
          ],
        })
      );
    });

    it('sendPaymentCompleted uses payment_completed tag', async () => {
      await emailService.sendPaymentCompleted({ email: 'a@b.com' }, paymentData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'payment_completed' }],
        })
      );
    });

    it('sendCancellation uses cancellation tag', async () => {
      await emailService.sendCancellation({ email: 'a@b.com' }, cancellationData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'cancellation' }],
        })
      );
    });

    it('sendReminder uses reminder tag', async () => {
      await emailService.sendReminder({ email: 'a@b.com' }, reminderData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'reminder' }],
        })
      );
    });

    it('sendDialPurchaseConfirmed uses dial_purchase_confirmed tag', async () => {
      await emailService.sendDialPurchaseConfirmed({ email: 'a@b.com' }, dialPurchaseData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'dial_purchase_confirmed' }],
        })
      );
    });

    it('sendDialResultsReady uses dial_results_ready tag', async () => {
      await emailService.sendDialResultsReady({ email: 'a@b.com' }, dialResultsData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'dial_results_ready' }],
        })
      );
    });

    it('sendDialAdditionalCyclePurchased uses dial_additional_cycle tag', async () => {
      await emailService.sendDialAdditionalCyclePurchased({ email: 'a@b.com' }, dialAdditionalCycleData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'dial_additional_cycle' }],
        })
      );
    });

    it('sendPaymentFailed uses payment_failed tag', async () => {
      await emailService.sendPaymentFailed({ email: 'a@b.com' }, paymentFailedData);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ name: 'type', value: 'payment_failed' }],
        })
      );
    });

    it('passes html and text from template to send', async () => {
      await emailService.sendReminder({ email: 'a@b.com' }, reminderData);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('レッスンが近づいています');
      expect(callArgs.text).toContain('レッスンが近づいています');
    });

    it('propagates send result back to caller', async () => {
      mockSend.mockResolvedValue({ success: false, error: 'Rate limited' });

      const result = await emailService.sendReminder({ email: 'a@b.com' }, reminderData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limited');
    });
  });

  describe('isConfigured', () => {
    it('returns true when RESEND_API_KEY was set at module load', () => {
      expect(emailService.isConfigured()).toBe(true);
    });
  });
});
