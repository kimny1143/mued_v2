/**
 * NotificationService Unit Tests
 *
 * Tests all 8 notification methods + isAvailable:
 * - onReservationConfirmed: student + mentor email, user lookup
 * - onPaymentCompleted: student email only
 * - onReservationCancelled: student + mentor email
 * - sendReminder: student email only
 * - onPaymentFailed: single user email
 * - onDialPurchaseCompleted: direct email (no user lookup)
 * - onDialResultsReady: direct email (no user lookup)
 * - onDialAdditionalCyclePurchased: direct email (no user lookup)
 * - isAvailable: delegates to emailService.isConfigured
 *
 * Also tests helper function behavior indirectly (date/time formatting, price formatting, duration calc).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

const mockFindById = vi.fn();
vi.mock('@/lib/repositories', () => ({
  userRepository: {
    findById: (...args: any[]) => mockFindById(...args),
  },
}));

const mockSendReservationConfirmationToStudent = vi.fn();
const mockSendReservationNotificationToMentor = vi.fn();
const mockSendPaymentCompleted = vi.fn();
const mockSendCancellation = vi.fn();
const mockSendReminder = vi.fn();
const mockSendPaymentFailed = vi.fn();
const mockSendDialPurchaseConfirmed = vi.fn();
const mockSendDialResultsReady = vi.fn();
const mockSendDialAdditionalCyclePurchased = vi.fn();
const mockIsConfigured = vi.fn();

vi.mock('@/lib/services/email.service', () => ({
  emailService: {
    sendReservationConfirmationToStudent: (...args: any[]) =>
      mockSendReservationConfirmationToStudent(...args),
    sendReservationNotificationToMentor: (...args: any[]) =>
      mockSendReservationNotificationToMentor(...args),
    sendPaymentCompleted: (...args: any[]) => mockSendPaymentCompleted(...args),
    sendCancellation: (...args: any[]) => mockSendCancellation(...args),
    sendReminder: (...args: any[]) => mockSendReminder(...args),
    sendPaymentFailed: (...args: any[]) => mockSendPaymentFailed(...args),
    sendDialPurchaseConfirmed: (...args: any[]) => mockSendDialPurchaseConfirmed(...args),
    sendDialResultsReady: (...args: any[]) => mockSendDialResultsReady(...args),
    sendDialAdditionalCyclePurchased: (...args: any[]) =>
      mockSendDialAdditionalCyclePurchased(...args),
    isConfigured: () => mockIsConfigured(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { notificationService, NotificationService } from '@/lib/services/notification.service';
import type {
  ReservationNotificationData,
  PaymentNotificationData,
  CancellationNotificationData,
  ReminderNotificationData,
  PaymentFailedNotificationData,
  DialPurchaseNotificationData,
  DialResultsNotificationData,
  DialAdditionalCycleNotificationData,
} from '@/lib/services/notification.service';

// ========================================
// Fixtures
// ========================================

const studentUser = {
  id: 'student-uuid',
  email: 'student@example.com',
  name: 'Taro Student',
  clerkId: 'clerk_student',
};

const mentorUser = {
  id: 'mentor-uuid',
  email: 'mentor@example.com',
  name: 'Hanako Mentor',
  clerkId: 'clerk_mentor',
};

const userNoName = {
  id: 'noname-uuid',
  email: 'noname@example.com',
  name: null,
  clerkId: 'clerk_noname',
};

function makeReservationData(overrides?: Partial<ReservationNotificationData>): ReservationNotificationData {
  return {
    reservationId: 'res-001',
    studentId: 'student-uuid',
    mentorId: 'mentor-uuid',
    startTime: new Date('2026-04-10T10:00:00Z'),
    endTime: new Date('2026-04-10T11:00:00Z'),
    price: '5000',
    ...overrides,
  };
}

function makePaymentData(overrides?: Partial<PaymentNotificationData>): PaymentNotificationData {
  return {
    reservationId: 'res-001',
    studentId: 'student-uuid',
    mentorId: 'mentor-uuid',
    amount: '5000',
    paymentIntentId: 'pi_123',
    startTime: new Date('2026-04-10T10:00:00Z'),
    receiptUrl: 'https://stripe.com/receipt/123',
    ...overrides,
  };
}

function makeCancellationData(overrides?: Partial<CancellationNotificationData>): CancellationNotificationData {
  return {
    reservationId: 'res-001',
    studentId: 'student-uuid',
    mentorId: 'mentor-uuid',
    startTime: new Date('2026-04-10T10:00:00Z'),
    cancelledBy: 'student',
    reason: 'Schedule conflict',
    refundAmount: '5000',
    ...overrides,
  };
}

function makeReminderData(overrides?: Partial<ReminderNotificationData>): ReminderNotificationData {
  return {
    reservationId: 'res-001',
    studentId: 'student-uuid',
    mentorId: 'mentor-uuid',
    startTime: new Date('2026-04-10T10:00:00Z'),
    hoursUntil: 24,
    ...overrides,
  };
}

// ========================================
// Setup
// ========================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default: both users found
  mockFindById.mockImplementation((id: string) => {
    if (id === 'student-uuid') return Promise.resolve(studentUser);
    if (id === 'mentor-uuid') return Promise.resolve(mentorUser);
    if (id === 'noname-uuid') return Promise.resolve(userNoName);
    return Promise.resolve(null);
  });

  // Default: all emails succeed
  mockSendReservationConfirmationToStudent.mockResolvedValue({ success: true });
  mockSendReservationNotificationToMentor.mockResolvedValue({ success: true });
  mockSendPaymentCompleted.mockResolvedValue({ success: true });
  mockSendCancellation.mockResolvedValue({ success: true });
  mockSendReminder.mockResolvedValue({ success: true });
  mockSendPaymentFailed.mockResolvedValue({ success: true });
  mockSendDialPurchaseConfirmed.mockResolvedValue({ success: true });
  mockSendDialResultsReady.mockResolvedValue({ success: true });
  mockSendDialAdditionalCyclePurchased.mockResolvedValue({ success: true });
});

// ========================================
// Tests
// ========================================

describe('NotificationService', () => {
  it('exports a singleton instance', () => {
    expect(notificationService).toBeInstanceOf(NotificationService);
  });

  // ----------------------------------------
  // onReservationConfirmed
  // ----------------------------------------
  describe('onReservationConfirmed', () => {
    it('sends emails to both student and mentor on success', async () => {
      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(true);
      expect(result.studentEmailSent).toBe(true);
      expect(result.mentorEmailSent).toBe(true);
      expect(result.errors).toBeUndefined();

      // Verify student email
      expect(mockSendReservationConfirmationToStudent).toHaveBeenCalledWith(
        { email: 'student@example.com', name: 'Taro Student' },
        expect.objectContaining({
          studentName: 'Taro Student',
          mentorName: 'Hanako Mentor',
          reservationId: 'res-001',
        })
      );

      // Verify mentor email
      expect(mockSendReservationNotificationToMentor).toHaveBeenCalledWith(
        { email: 'mentor@example.com', name: 'Hanako Mentor' },
        expect.objectContaining({
          studentName: 'Taro Student',
          mentorName: 'Hanako Mentor',
        })
      );
    });

    it('formats duration correctly for 1 hour', async () => {
      await notificationService.onReservationConfirmed(makeReservationData());

      const emailData = mockSendReservationConfirmationToStudent.mock.calls[0][1];
      expect(emailData.duration).toBe('1時間');
    });

    it('formats duration correctly for 90 minutes', async () => {
      const data = makeReservationData({
        endTime: new Date('2026-04-10T11:30:00Z'),
      });
      await notificationService.onReservationConfirmed(data);

      const emailData = mockSendReservationConfirmationToStudent.mock.calls[0][1];
      expect(emailData.duration).toBe('1時間30分');
    });

    it('formats duration correctly for less than 1 hour', async () => {
      const data = makeReservationData({
        endTime: new Date('2026-04-10T10:30:00Z'),
      });
      await notificationService.onReservationConfirmed(data);

      const emailData = mockSendReservationConfirmationToStudent.mock.calls[0][1];
      expect(emailData.duration).toBe('30分');
    });

    it('formats price with yen symbol and thousands separator', async () => {
      const data = makeReservationData({ price: '15000' });
      await notificationService.onReservationConfirmed(data);

      const emailData = mockSendReservationConfirmationToStudent.mock.calls[0][1];
      expect(emailData.price).toBe('¥15,000');
    });

    it('uses email as name fallback when user name is null', async () => {
      mockFindById.mockImplementation((id: string) => {
        if (id === 'student-uuid') return Promise.resolve(userNoName);
        if (id === 'mentor-uuid') return Promise.resolve(mentorUser);
        return Promise.resolve(null);
      });

      await notificationService.onReservationConfirmed(
        makeReservationData({ studentId: 'student-uuid' })
      );

      const emailData = mockSendReservationConfirmationToStudent.mock.calls[0][1];
      expect(emailData.studentName).toBe('noname@example.com');

      // name param should be undefined (not null)
      const toArg = mockSendReservationConfirmationToStudent.mock.calls[0][0];
      expect(toArg.name).toBeUndefined();
    });

    it('returns failure when student not found', async () => {
      mockFindById.mockImplementation((id: string) => {
        if (id === 'mentor-uuid') return Promise.resolve(mentorUser);
        return Promise.resolve(null);
      });

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.errors).toContain('User not found');
      expect(mockSendReservationConfirmationToStudent).not.toHaveBeenCalled();
    });

    it('returns failure when mentor not found', async () => {
      mockFindById.mockImplementation((id: string) => {
        if (id === 'student-uuid') return Promise.resolve(studentUser);
        return Promise.resolve(null);
      });

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.errors).toContain('User not found');
    });

    it('reports partial success when student email fails', async () => {
      mockSendReservationConfirmationToStudent.mockResolvedValue({
        success: false,
        error: 'SMTP timeout',
      });

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.studentEmailSent).toBe(false);
      expect(result.mentorEmailSent).toBe(true);
      expect(result.errors).toEqual(['Student email failed: SMTP timeout']);
    });

    it('reports partial success when mentor email fails', async () => {
      mockSendReservationNotificationToMentor.mockResolvedValue({
        success: false,
        error: 'Invalid address',
      });

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.studentEmailSent).toBe(true);
      expect(result.mentorEmailSent).toBe(false);
      expect(result.errors).toEqual(['Mentor email failed: Invalid address']);
    });

    it('reports both errors when both emails fail', async () => {
      mockSendReservationConfirmationToStudent.mockResolvedValue({
        success: false,
        error: 'err1',
      });
      mockSendReservationNotificationToMentor.mockResolvedValue({
        success: false,
        error: 'err2',
      });

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('catches unexpected exceptions', async () => {
      mockFindById.mockRejectedValue(new Error('DB connection lost'));

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['DB connection lost']);
    });

    it('handles non-Error exceptions', async () => {
      mockFindById.mockRejectedValue('string error');

      const result = await notificationService.onReservationConfirmed(makeReservationData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Unknown error']);
    });

    it('includes dashboardUrl in email data', async () => {
      await notificationService.onReservationConfirmed(makeReservationData());

      const emailData = mockSendReservationConfirmationToStudent.mock.calls[0][1];
      expect(emailData.dashboardUrl).toContain('/dashboard/lessons');
    });
  });

  // ----------------------------------------
  // onPaymentCompleted
  // ----------------------------------------
  describe('onPaymentCompleted', () => {
    it('sends payment email to student', async () => {
      const result = await notificationService.onPaymentCompleted(makePaymentData());

      expect(result.success).toBe(true);
      expect(result.studentEmailSent).toBe(true);

      expect(mockSendPaymentCompleted).toHaveBeenCalledWith(
        { email: 'student@example.com', name: 'Taro Student' },
        expect.objectContaining({
          studentName: 'Taro Student',
          mentorName: 'Hanako Mentor',
          paymentId: 'pi_123',
          receiptUrl: 'https://stripe.com/receipt/123',
        })
      );
    });

    it('formats amount with yen symbol', async () => {
      await notificationService.onPaymentCompleted(makePaymentData({ amount: '8000' }));

      const emailData = mockSendPaymentCompleted.mock.calls[0][1];
      expect(emailData.amount).toBe('¥8,000');
    });

    it('returns failure when users not found', async () => {
      mockFindById.mockResolvedValue(null);

      const result = await notificationService.onPaymentCompleted(makePaymentData());

      expect(result.success).toBe(false);
      expect(result.errors).toContain('User not found');
    });

    it('returns error when email send fails', async () => {
      mockSendPaymentCompleted.mockResolvedValue({
        success: false,
        error: 'Rate limited',
      });

      const result = await notificationService.onPaymentCompleted(makePaymentData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Rate limited']);
    });

    it('catches exceptions', async () => {
      mockFindById.mockRejectedValue(new Error('Timeout'));

      const result = await notificationService.onPaymentCompleted(makePaymentData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Timeout']);
    });
  });

  // ----------------------------------------
  // onReservationCancelled
  // ----------------------------------------
  describe('onReservationCancelled', () => {
    it('sends cancellation emails to both parties', async () => {
      const result = await notificationService.onReservationCancelled(makeCancellationData());

      expect(result.success).toBe(true);
      expect(result.studentEmailSent).toBe(true);
      expect(result.mentorEmailSent).toBe(true);
      expect(mockSendCancellation).toHaveBeenCalledTimes(2);
    });

    it('passes correct data to student email', async () => {
      await notificationService.onReservationCancelled(makeCancellationData());

      // First call = student
      const [toArg, dataArg] = mockSendCancellation.mock.calls[0];
      expect(toArg.email).toBe('student@example.com');
      expect(dataArg.recipientName).toBe('Taro Student');
      expect(dataArg.otherPartyName).toBe('Hanako Mentor');
      expect(dataArg.reason).toBe('Schedule conflict');
      expect(dataArg.refundAmount).toBe('¥5,000');
    });

    it('passes correct data to mentor email (no refund)', async () => {
      await notificationService.onReservationCancelled(makeCancellationData());

      // Second call = mentor
      const [toArg, dataArg] = mockSendCancellation.mock.calls[1];
      expect(toArg.email).toBe('mentor@example.com');
      expect(dataArg.recipientName).toBe('Hanako Mentor');
      expect(dataArg.otherPartyName).toBe('Taro Student');
      expect(dataArg.refundAmount).toBeUndefined();
    });

    it('handles missing refundAmount', async () => {
      await notificationService.onReservationCancelled(
        makeCancellationData({ refundAmount: undefined })
      );

      const [, dataArg] = mockSendCancellation.mock.calls[0];
      expect(dataArg.refundAmount).toBeUndefined();
    });

    it('returns failure when users not found', async () => {
      mockFindById.mockResolvedValue(null);

      const result = await notificationService.onReservationCancelled(makeCancellationData());

      expect(result.success).toBe(false);
      expect(mockSendCancellation).not.toHaveBeenCalled();
    });

    it('reports partial failure', async () => {
      mockSendCancellation
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Bounce' });

      const result = await notificationService.onReservationCancelled(makeCancellationData());

      expect(result.success).toBe(false);
      expect(result.studentEmailSent).toBe(true);
      expect(result.mentorEmailSent).toBe(false);
    });

    it('catches exceptions', async () => {
      mockFindById.mockRejectedValue(new Error('Network error'));

      const result = await notificationService.onReservationCancelled(makeCancellationData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Network error']);
    });
  });

  // ----------------------------------------
  // sendReminder
  // ----------------------------------------
  describe('sendReminder', () => {
    it('sends reminder email to student', async () => {
      const result = await notificationService.sendReminder(makeReminderData());

      expect(result.success).toBe(true);
      expect(result.studentEmailSent).toBe(true);

      expect(mockSendReminder).toHaveBeenCalledWith(
        { email: 'student@example.com', name: 'Taro Student' },
        expect.objectContaining({
          studentName: 'Taro Student',
          mentorName: 'Hanako Mentor',
          hoursUntil: 24,
          dashboardUrl: expect.stringContaining('/dashboard/lessons'),
        })
      );
    });

    it('returns failure when users not found', async () => {
      mockFindById.mockResolvedValue(null);

      const result = await notificationService.sendReminder(makeReminderData());

      expect(result.success).toBe(false);
      expect(result.errors).toContain('User not found');
    });

    it('returns error when email send fails', async () => {
      mockSendReminder.mockResolvedValue({ success: false, error: 'Delivery failed' });

      const result = await notificationService.sendReminder(makeReminderData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Delivery failed']);
    });

    it('catches exceptions', async () => {
      mockSendReminder.mockRejectedValue(new Error('API down'));

      const result = await notificationService.sendReminder(makeReminderData());

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['API down']);
    });
  });

  // ----------------------------------------
  // onPaymentFailed
  // ----------------------------------------
  describe('onPaymentFailed', () => {
    const paymentFailedData: PaymentFailedNotificationData = {
      subscriptionId: 'sub_123',
      userId: 'student-uuid',
      tier: 'standard',
      errorMessage: 'Card declined',
    };

    it('sends payment failed email to user', async () => {
      const result = await notificationService.onPaymentFailed(paymentFailedData);

      expect(result.success).toBe(true);
      expect(result.studentEmailSent).toBe(true);

      expect(mockSendPaymentFailed).toHaveBeenCalledWith(
        { email: 'student@example.com', name: 'Taro Student' },
        expect.objectContaining({
          userName: 'Taro Student',
          tier: 'Standard', // first letter capitalized
          errorMessage: 'Card declined',
          updatePaymentUrl: expect.stringContaining('/dashboard/settings/billing'),
        })
      );
    });

    it('capitalizes tier name', async () => {
      await notificationService.onPaymentFailed({ ...paymentFailedData, tier: 'professional' });

      const emailData = mockSendPaymentFailed.mock.calls[0][1];
      expect(emailData.tier).toBe('Professional');
    });

    it('returns failure when user not found', async () => {
      mockFindById.mockResolvedValue(null);

      const result = await notificationService.onPaymentFailed(paymentFailedData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('User not found');
    });

    it('returns error when email fails', async () => {
      mockSendPaymentFailed.mockResolvedValue({ success: false, error: 'Blocked' });

      const result = await notificationService.onPaymentFailed(paymentFailedData);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Blocked']);
    });

    it('catches exceptions', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'));

      const result = await notificationService.onPaymentFailed(paymentFailedData);

      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------
  // onDialPurchaseCompleted
  // ----------------------------------------
  describe('onDialPurchaseCompleted', () => {
    const dialPurchaseData: DialPurchaseNotificationData = {
      sessionId: 'sess-001',
      purchaseId: 'pur-001',
      purchaseType: 'omakase',
      email: 'buyer@example.com',
      guestToken: 'guest-token-123',
    };

    it('sends purchase confirmation email', async () => {
      const result = await notificationService.onDialPurchaseCompleted(dialPurchaseData);

      expect(result.success).toBe(true);
      expect(result.studentEmailSent).toBe(true);

      expect(mockSendDialPurchaseConfirmed).toHaveBeenCalledWith(
        { email: 'buyer@example.com' },
        expect.objectContaining({
          email: 'buyer@example.com',
          purchaseType: 'omakase',
          sessionUrl: expect.stringContaining('/dial/session/sess-001?token=guest-token-123'),
        })
      );
    });

    it('builds session URL without token when guestToken is absent', async () => {
      await notificationService.onDialPurchaseCompleted({
        ...dialPurchaseData,
        guestToken: undefined,
      });

      const emailData = mockSendDialPurchaseConfirmed.mock.calls[0][1];
      expect(emailData.sessionUrl).not.toContain('?token=');
      expect(emailData.sessionUrl).toContain('/dial/session/sess-001');
    });

    it('returns failure when no email provided', async () => {
      const result = await notificationService.onDialPurchaseCompleted({
        ...dialPurchaseData,
        email: '',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email provided');
      expect(mockSendDialPurchaseConfirmed).not.toHaveBeenCalled();
    });

    it('returns error when email send fails', async () => {
      mockSendDialPurchaseConfirmed.mockResolvedValue({ success: false, error: 'Rejected' });

      const result = await notificationService.onDialPurchaseCompleted(dialPurchaseData);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Rejected']);
    });

    it('catches exceptions', async () => {
      mockSendDialPurchaseConfirmed.mockRejectedValue(new Error('Resend API error'));

      const result = await notificationService.onDialPurchaseCompleted(dialPurchaseData);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Resend API error']);
    });
  });

  // ----------------------------------------
  // onDialResultsReady
  // ----------------------------------------
  describe('onDialResultsReady', () => {
    const dialResultsData: DialResultsNotificationData = {
      sessionId: 'sess-002',
      purchaseType: 'dialogue',
      email: 'creator@example.com',
    };

    it('sends results ready email', async () => {
      const result = await notificationService.onDialResultsReady(dialResultsData);

      expect(result.success).toBe(true);

      expect(mockSendDialResultsReady).toHaveBeenCalledWith(
        { email: 'creator@example.com' },
        expect.objectContaining({
          email: 'creator@example.com',
          purchaseType: 'dialogue',
          downloadUrl: expect.stringContaining('/dial/session/sess-002'),
        })
      );
    });

    it('returns failure when no email provided', async () => {
      const result = await notificationService.onDialResultsReady({
        ...dialResultsData,
        email: '',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email provided');
    });

    it('returns error when email send fails', async () => {
      mockSendDialResultsReady.mockResolvedValue({ success: false, error: 'Spam filter' });

      const result = await notificationService.onDialResultsReady(dialResultsData);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Spam filter']);
    });

    it('catches exceptions', async () => {
      mockSendDialResultsReady.mockRejectedValue(new Error('Timeout'));

      const result = await notificationService.onDialResultsReady(dialResultsData);

      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------
  // onDialAdditionalCyclePurchased
  // ----------------------------------------
  describe('onDialAdditionalCyclePurchased', () => {
    const additionalCycleData: DialAdditionalCycleNotificationData = {
      sessionId: 'sess-003',
      email: 'repeat@example.com',
    };

    it('sends additional cycle email', async () => {
      const result = await notificationService.onDialAdditionalCyclePurchased(additionalCycleData);

      expect(result.success).toBe(true);

      expect(mockSendDialAdditionalCyclePurchased).toHaveBeenCalledWith(
        { email: 'repeat@example.com' },
        expect.objectContaining({
          email: 'repeat@example.com',
          sessionUrl: expect.stringContaining('/dial/session/sess-003'),
        })
      );
    });

    it('returns failure when no email provided', async () => {
      const result = await notificationService.onDialAdditionalCyclePurchased({
        ...additionalCycleData,
        email: '',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email provided');
    });

    it('returns error when email send fails', async () => {
      mockSendDialAdditionalCyclePurchased.mockResolvedValue({
        success: false,
        error: 'Quota exceeded',
      });

      const result = await notificationService.onDialAdditionalCyclePurchased(additionalCycleData);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Quota exceeded']);
    });

    it('catches exceptions', async () => {
      mockSendDialAdditionalCyclePurchased.mockRejectedValue(new Error('Network error'));

      const result = await notificationService.onDialAdditionalCyclePurchased(additionalCycleData);

      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------
  // isAvailable
  // ----------------------------------------
  describe('isAvailable', () => {
    it('returns true when email service is configured', () => {
      mockIsConfigured.mockReturnValue(true);
      expect(notificationService.isAvailable()).toBe(true);
    });

    it('returns false when email service is not configured', () => {
      mockIsConfigured.mockReturnValue(false);
      expect(notificationService.isAvailable()).toBe(false);
    });
  });
});
