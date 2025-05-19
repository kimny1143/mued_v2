import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createCheckoutSession } from '@/lib/stripe';
import { Prisma } from '@prisma/client';

// モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    lessonSlot: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    reservation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: vi.fn(),
}));

describe('予約の同時実行テスト', () => {
  const mockSlot = {
    id: 'test-slot-1',
    startTime: new Date('2024-05-20T10:00:00Z'),
    endTime: new Date('2024-05-20T11:00:00Z'),
    isAvailable: true,
    teacher: {
      id: 'teacher-1',
      name: 'Test Teacher',
    },
  };

  const mockReservation = {
    id: 'reservation-1',
    slotId: 'test-slot-1',
    studentId: 'student-1',
    status: 'PENDING',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // モックの初期設定
    (prisma.lessonSlot.findUnique as Mock).mockResolvedValue(mockSlot);
    (prisma.lessonSlot.update as Mock).mockResolvedValue({ ...mockSlot, isAvailable: false });
    (prisma.reservation.create as Mock).mockResolvedValue(mockReservation);
    (createCheckoutSession as Mock).mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  it('同時予約の競合を検出できること', async () => {
    // 最初の予約リクエスト
    const firstReservation = prisma.$transaction(async (tx) => {
      const slot = await tx.lessonSlot.update({
        where: { id: 'test-slot-1', isAvailable: true },
        data: { isAvailable: false },
      });
      return await tx.reservation.create({
        data: {
          slotId: slot.id,
          studentId: 'student-1',
          status: 'PENDING',
        },
      });
    });

    // 2つ目の予約リクエスト（同時実行）
    const secondReservation = prisma.$transaction(async (tx) => {
      const slot = await tx.lessonSlot.update({
        where: { id: 'test-slot-1', isAvailable: true },
        data: { isAvailable: false },
      });
      return await tx.reservation.create({
        data: {
          slotId: slot.id,
          studentId: 'student-2',
          status: 'PENDING',
        },
      });
    });

    // 最初の予約は成功
    await expect(firstReservation).resolves.toBeDefined();
    
    // 2つ目の予約は失敗（スロットが既に予約済み）
    await expect(secondReservation).rejects.toThrow();
  });

  it('楽観的ロックが機能すること', async () => {
    // 最初の更新
    const firstUpdate = prisma.lessonSlot.update({
      where: { id: 'test-slot-1', isAvailable: true },
      data: { isAvailable: false },
    });

    // 2つ目の更新（同時実行）
    const secondUpdate = prisma.lessonSlot.update({
      where: { id: 'test-slot-1', isAvailable: true },
      data: { isAvailable: false },
    });

    // 最初の更新は成功
    await expect(firstUpdate).resolves.toBeDefined();
    
    // 2つ目の更新は失敗（楽観的ロック）
    await expect(secondUpdate).rejects.toThrow();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });
}); 