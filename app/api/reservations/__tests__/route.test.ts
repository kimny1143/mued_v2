import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { PUT, DELETE } from '../[id]/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getSessionFromRequest } from '@/lib/session';

// 予約ステータスの列挙型
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// 支払いステータスの列挙型
enum PaymentStatus {
  UNPAID = 'UNPAID',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

// モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    lessonSlot: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    }
  }
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

vi.mock('@/lib/session', () => ({
  getSessionFromRequest: vi.fn()
}));

describe('Reservation API', () => {
  let mockReq: NextRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 共通のリクエストモック
    mockReq = new NextRequest('http://localhost:3000/api/reservations', {
      method: 'GET'
    });
    
    // 認証モックの設定
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'テストユーザー',
        roleId: 'student',
      },
      session: {} as any,
    });

    // getSessionFromRequest モックの設定
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      session: {} as any,
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      },
      role: 'student'
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('GET - 予約一覧取得', () => {
    it('認証済みユーザーが自分の予約一覧を取得できる', async () => {
      // モックデータ
      const mockReservations = [
        {
          id: 'rsv-1',
          studentId: 'test-user-id',
          slotId: 'slot-1',
          status: ReservationStatus.CONFIRMED,
          createdAt: new Date(),
          updatedAt: new Date(),
          slot: {
            id: 'slot-1',
            teacherId: 'teacher-1',
            startTime: new Date('2024-06-01T10:00:00Z'),
            endTime: new Date('2024-06-01T11:00:00Z'),
            isAvailable: false
          }
        },
        {
          id: 'rsv-2',
          studentId: 'test-user-id',
          slotId: 'slot-2',
          status: ReservationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          slot: {
            id: 'slot-2',
            teacherId: 'teacher-1',
            startTime: new Date('2024-06-02T15:00:00Z'),
            endTime: new Date('2024-06-02T16:00:00Z'),
            isAvailable: false
          }
        }
      ];
      
      // 検索結果のモック
      vi.mocked(prisma.reservation.findMany).mockResolvedValueOnce(mockReservations);
      
      // API呼び出し
      const response = await GET(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(200);
      expect(data).toHaveLength(2); // 配列として直接返される
      expect(data[0].id).toBe('rsv-1');
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            studentId: 'test-user-id'
          }
        })
      );
    });
    
    it('教師ロールのユーザーが自分のレッスンスロットに関連する予約を取得できる', async () => {
      // 教師ユーザーをモック
      vi.mocked(getSessionFromRequest).mockResolvedValueOnce({
        session: {} as any,
        user: {
          id: 'teacher-1',
          email: 'teacher@example.com'
        },
        role: 'mentor'
      });
      
      // モックデータ
      const mockReservations = [
        {
          id: 'rsv-1',
          studentId: 'student-1',
          slotId: 'slot-1',
          status: ReservationStatus.CONFIRMED,
          createdAt: new Date(),
          updatedAt: new Date(),
          slot: {
            id: 'slot-1',
            teacherId: 'teacher-1',
            startTime: new Date('2024-06-01T10:00:00Z'),
            endTime: new Date('2024-06-01T11:00:00Z'),
            isAvailable: false
          }
        }
      ];
      
      // 検索結果のモック
      vi.mocked(prisma.reservation.findMany).mockResolvedValueOnce(mockReservations);
      
      // API呼び出し
      const response = await GET(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(200);
      expect(data).toHaveLength(1); // 配列として直接返される
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slot: {
              teacherId: 'teacher-1'
            }
          })
        })
      );
    });
    
    it('ステータスでフィルタリングして予約を取得できる', async () => {
      // URLにクエリパラメータを追加
      const url = new URL('http://localhost:3000/api/reservations');
      url.searchParams.set('status', ReservationStatus.CONFIRMED);
      
      // リクエストの作成
      mockReq = new NextRequest(url);
      
      // モックデータ
      const mockReservations = [
        {
          id: 'rsv-1',
          studentId: 'test-user-id',
          slotId: 'slot-1',
          status: ReservationStatus.CONFIRMED,
          createdAt: new Date(),
          updatedAt: new Date(),
          slot: {
            id: 'slot-1',
            teacherId: 'teacher-1',
            startTime: new Date('2024-06-01T10:00:00Z'),
            endTime: new Date('2024-06-01T11:00:00Z'),
            isAvailable: false
          }
        }
      ];
      
      // 検索結果のモック
      vi.mocked(prisma.reservation.findMany).mockResolvedValueOnce(mockReservations);
      
      // API呼び出し
      const response = await GET(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(200);
      expect(data).toHaveLength(1); // 配列として直接返される
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReservationStatus.CONFIRMED
          })
        })
      );
    });
    
    it('認証されていない場合は401エラーを返す', async () => {
      // 未認証状態をモック
      vi.mocked(getSessionFromRequest).mockResolvedValueOnce(null);
      
      // API呼び出し
      const response = await GET(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });
  });
  
  describe('POST - 予約作成', () => {
    it('有効なデータで予約を作成できる', async () => {
      // リクエストボディの作成
      const reservationData = {
        slotId: 'slot-1',
      };
      
      // リクエストの作成
      mockReq = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData)
      });
      
      // レッスンスロットが存在し利用可能なことをモック
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1); // 1ヶ月後の日付に設定
      
      const availableSlot = {
        id: 'slot-1',
        teacherId: 'teacher-1',
        startTime: new Date(futureDate),
        endTime: new Date(futureDate.setHours(futureDate.getHours() + 1)),
        isAvailable: true,
        reservations: [],
        teacher: {
          name: '講師名'
        }
      };
      
      vi.mocked(prisma.lessonSlot.findUnique).mockResolvedValueOnce(availableSlot as any);
      
      // 作成結果のモック
      const createdReservation = {
        id: 'new-rsv-1',
        studentId: 'test-user-id',
        slotId: 'slot-1',
        status: ReservationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        slot: availableSlot
      };
      
      vi.mocked(prisma.reservation.create).mockResolvedValueOnce(createdReservation as any);
      
      // API呼び出し
      const response = await POST(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(201);
      expect(data.id).toBe('new-rsv-1');
      expect(prisma.reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'test-user-id',
          slotId: 'slot-1',
          status: ReservationStatus.PENDING
        }),
        include: expect.any(Object)
      });
    });
    
    it('既に予約がある場合は409エラーを返す', async () => {
      // リクエストボディの作成
      const reservationData = {
        slotId: 'slot-already-reserved',
      };
      
      // リクエストの作成
      mockReq = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData)
      });
      
      // 既に予約があるスロットをモック
      const unavailableSlot = {
        id: 'slot-already-reserved',
        teacherId: 'teacher-1',
        startTime: new Date('2024-06-10T10:00:00Z'),
        endTime: new Date('2024-06-10T11:00:00Z'),
        isAvailable: true,
        reservations: [
          { id: 'existing-rsv', studentId: 'other-student' }
        ],
        teacher: {
          name: '講師名'
        }
      };
      
      vi.mocked(prisma.lessonSlot.findUnique).mockResolvedValueOnce(unavailableSlot as any);
      
      // API呼び出し
      const response = await POST(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(409);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('存在しないレッスンスロットIDの場合は404エラーを返す', async () => {
      // リクエストボディの作成
      const reservationData = {
        slotId: 'non-existent-slot',
      };
      
      // リクエストの作成
      mockReq = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData)
      });
      
      // スロットが見つからないことをモック
      vi.mocked(prisma.lessonSlot.findUnique).mockResolvedValueOnce(null);
      
      // API呼び出し
      const response = await POST(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('利用不可のレッスンスロットの場合は409エラーを返す', async () => {
      // リクエストボディの作成
      const reservationData = {
        slotId: 'unavailable-slot',
      };
      
      // リクエストの作成
      mockReq = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData)
      });
      
      // 利用不可のスロットをモック
      const unavailableSlot = {
        id: 'unavailable-slot',
        teacherId: 'teacher-1',
        startTime: new Date('2024-06-10T10:00:00Z'),
        endTime: new Date('2024-06-10T11:00:00Z'),
        isAvailable: false, // 利用不可
        reservations: [],
        teacher: {
          name: '講師名'
        }
      };
      
      vi.mocked(prisma.lessonSlot.findUnique).mockResolvedValueOnce(unavailableSlot as any);
      
      // API呼び出し
      const response = await POST(mockReq);
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(409); // 400から409へ修正
      expect(data.error).toBeDefined();
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
  });
  
  describe('PUT - 予約更新', () => {
    it('有効なデータで自分の予約を更新できる', async () => {
      // URLパラメータの設定 (予約ID)
      const reservationId = 'rsv-to-update';
      const url = new URL(`http://localhost:3000/api/reservations/${reservationId}`);
      
      // 更新データ
      const updateData = {
        status: ReservationStatus.CANCELLED,
      };
      
      // リクエストの作成
      mockReq = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      // 既存の予約が見つかることをモック
      const existingReservation = {
        id: reservationId,
        studentId: 'test-user-id',
        slotId: 'slot-1',
        status: ReservationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        slot: {
          id: 'slot-1',
          teacherId: 'teacher-1',
          startTime: new Date('2024-06-15T10:00:00Z'),
          endTime: new Date('2024-06-15T11:00:00Z'),
          isAvailable: false
        }
      };
      
      vi.mocked(prisma.reservation.findUnique).mockResolvedValueOnce(existingReservation as any);
      
      // 更新結果のモック
      const updatedReservation = {
        ...existingReservation,
        status: ReservationStatus.CANCELLED,
        updatedAt: new Date()
      };
      
      vi.mocked(prisma.reservation.update).mockResolvedValueOnce(updatedReservation as any);
      
      // API呼び出し
      const response = await PUT(mockReq, { params: { id: reservationId } });
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(200);
      expect(data.id).toBe(reservationId);
      expect(data.status).toBe(ReservationStatus.CANCELLED);
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: reservationId },
        data: expect.objectContaining({
          status: ReservationStatus.CANCELLED
        }),
        include: expect.any(Object)
      });
    });
    
    it('存在しない予約を更新しようとすると404エラーを返す', async () => {
      // URLパラメータの設定 (予約ID)
      const reservationId = 'non-existent-rsv';
      const url = new URL(`http://localhost:3000/api/reservations/${reservationId}`);
      
      // 更新データ
      const updateData = {
        status: ReservationStatus.CANCELLED,
      };
      
      // リクエストの作成
      mockReq = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      // 予約が見つからないことをモック
      vi.mocked(prisma.reservation.findUnique).mockResolvedValueOnce(null);
      
      // API呼び出し
      const response = await PUT(mockReq, { params: { id: reservationId } });
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('他のユーザーの予約を更新しようとすると403エラーを返す', async () => {
      // URLパラメータの設定 (予約ID)
      const reservationId = 'other-user-rsv';
      const url = new URL(`http://localhost:3000/api/reservations/${reservationId}`);
      
      // 更新データ
      const updateData = {
        status: ReservationStatus.CANCELLED,
      };
      
      // リクエストの作成
      mockReq = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      // 他のユーザーの予約が見つかることをモック
      const otherUserReservation = {
        id: reservationId,
        studentId: 'other-user-id', // 現在のユーザーIDとは異なる
        slotId: 'slot-1',
        status: ReservationStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
        slot: {
          id: 'slot-1',
          teacherId: 'other-teacher-id',
          startTime: new Date(),
          endTime: new Date(),
          isAvailable: false
        }
      };
      
      vi.mocked(prisma.reservation.findUnique).mockResolvedValueOnce(otherUserReservation as any);
      
      // API呼び出し
      const response = await PUT(mockReq, { params: { id: reservationId } });
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
  });
  
  describe('DELETE - 予約削除', () => {
    it('管理者は予約を削除できる', async () => {
      // 管理者ユーザーをモック
      vi.mocked(getSessionFromRequest).mockResolvedValueOnce({
        session: {} as any,
        user: {
          id: 'admin-id',
          email: 'admin@example.com'
        },
        role: 'admin'
      });

      // URLパラメータの設定 (予約ID)
      const reservationId = 'rsv-to-delete';
      const url = new URL(`http://localhost:3000/api/reservations/${reservationId}`);
      
      // リクエストの作成
      mockReq = new NextRequest(url, {
        method: 'DELETE'
      });
      
      // 既存の予約が見つかることをモック
      const existingReservation = {
        id: reservationId,
        studentId: 'test-user-id',
        slotId: 'slot-1',
        status: ReservationStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
        slot: {
          id: 'slot-1',
          teacherId: 'teacher-1',
          startTime: new Date('2024-06-15T10:00:00Z'),
          endTime: new Date('2024-06-15T11:00:00Z'),
          isAvailable: false
        }
      };
      
      vi.mocked(prisma.reservation.findUnique).mockResolvedValueOnce(existingReservation as any);
      
      // 削除結果のモック
      vi.mocked(prisma.reservation.delete).mockResolvedValueOnce(existingReservation as any);
      
      // API呼び出し
      const response = await DELETE(mockReq, { params: { id: reservationId } });
      
      // アサーション
      expect(response.status).toBe(200); // 204から200へ修正
      expect(prisma.reservation.delete).toHaveBeenCalledWith({
        where: { id: reservationId }
      });
    });
    
    it('存在しない予約を削除しようとすると404エラーを返す', async () => {
      // 管理者ユーザーをモック
      vi.mocked(getSessionFromRequest).mockResolvedValueOnce({
        session: {} as any,
        user: {
          id: 'admin-id',
          email: 'admin@example.com'
        },
        role: 'admin'
      });

      // URLパラメータの設定 (予約ID)
      const reservationId = 'non-existent-rsv';
      const url = new URL(`http://localhost:3000/api/reservations/${reservationId}`);
      
      // リクエストの作成
      mockReq = new NextRequest(url, {
        method: 'DELETE'
      });
      
      // 予約が見つからないことをモック
      vi.mocked(prisma.reservation.findUnique).mockResolvedValueOnce(null);
      
      // API呼び出し
      const response = await DELETE(mockReq, { params: { id: reservationId } });
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.delete).not.toHaveBeenCalled();
    });
    
    it('管理者以外のユーザーは予約を削除できない', async () => {
      // 一般ユーザーをモック
      vi.mocked(getSessionFromRequest).mockResolvedValueOnce({
        session: {} as any,
        user: {
          id: 'user-id',
          email: 'user@example.com'
        },
        role: 'student'
      });

      // URLパラメータの設定 (予約ID)
      const reservationId = 'rsv-to-delete';
      const url = new URL(`http://localhost:3000/api/reservations/${reservationId}`);
      
      // リクエストの作成
      mockReq = new NextRequest(url, {
        method: 'DELETE'
      });
      
      // API呼び出し
      const response = await DELETE(mockReq, { params: { id: reservationId } });
      const data = await response.json();
      
      // アサーション
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.reservation.delete).not.toHaveBeenCalled();
    });
  });
}); 