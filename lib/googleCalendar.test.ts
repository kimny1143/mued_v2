import { describe, expect, it, vi, beforeEach } from 'vitest';
import { 
  getOAuth2Client, 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent,
  deleteCalendarEvent,
  syncLessonSlotsToCalendar,
  syncCalendarToLessonSlots
} from './googleCalendar';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

// PrismaClientのモック
const mockPrismaAccount = {
  findFirst: vi.fn(),
  update: vi.fn(),
};

const mockPrismaLessonSlot = {
  findMany: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

const mockPrismaReservation = {
  findFirst: vi.fn(),
};

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      account: mockPrismaAccount,
      lessonSlot: mockPrismaLessonSlot,
      reservation: mockPrismaReservation,
    })),
  };
});

// GoogleカレンダーAPIのモック
const mockGoogleCalendarEvents = {
  list: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockGoogleOAuth2 = {
  setCredentials: vi.fn(),
  refreshAccessToken: vi.fn(),
};

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(() => mockGoogleOAuth2),
      },
      calendar: vi.fn().mockImplementation(() => ({
        events: mockGoogleCalendarEvents
      })),
    },
  };
});

// LessonSlot型を定義（元のファイルと同じ定義）
interface LessonSlot {
  id: string;
  mentorId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description: string;
  googleCalendarEventId: string | null;
  googleCalendarLink: string | null;
  lastSyncedAt: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
}

describe('Google Calendar Service', () => {
  const mockUserId = 'user-123';
  const mockMentorId = 'mentor-456';
  const mockEvent = {
    id: 'event-789',
    summary: 'テストレッスン',
    description: 'テスト説明',
    start: { dateTime: '2023-06-01T10:00:00+09:00' },
    end: { dateTime: '2023-06-01T11:00:00+09:00' },
    htmlLink: 'https://calendar.google.com/event?id=123',
  };
  const mockLessonSlot = {
    id: 'slot-123',
    mentorId: mockMentorId,
    title: 'テストレッスン',
    description: 'テスト説明',
    startTime: new Date('2023-06-01T10:00:00+09:00'),
    endTime: new Date('2023-06-01T11:00:00+09:00'),
    googleCalendarEventId: 'event-789',
    googleCalendarLink: 'https://calendar.google.com/event?id=123',
    lastSyncedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Prismaモックの設定
    mockPrismaAccount.findFirst.mockResolvedValue({
      id: 'account-123',
      userId: mockUserId,
      provider: 'google',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1時間後
    });

    mockPrismaLessonSlot.findMany.mockResolvedValue([mockLessonSlot]);
    mockPrismaLessonSlot.update.mockResolvedValue(mockLessonSlot);
    mockPrismaLessonSlot.create.mockResolvedValue(mockLessonSlot);
    mockPrismaReservation.findFirst.mockResolvedValue(null);

    // Google API モックの設定
    mockGoogleCalendarEvents.list.mockResolvedValue({
      data: { items: [mockEvent] },
    });
    
    mockGoogleCalendarEvents.insert.mockResolvedValue({
      data: mockEvent,
    });
    
    mockGoogleCalendarEvents.update.mockResolvedValue({
      data: mockEvent,
    });
    
    mockGoogleCalendarEvents.delete.mockResolvedValue({});
    
    mockGoogleOAuth2.refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600 * 1000,
      },
    });
  });

  describe('getOAuth2Client', () => {
    it('Googleアカウント認証情報を取得してOAuth2クライアントを返す', async () => {
      const result = await getOAuth2Client(mockUserId);
      expect(result).toBeDefined();
      
      expect(mockPrismaAccount.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          provider: 'google',
        },
      });
    });
    
    it('アカウントが見つからない場合はエラーをスロー', async () => {
      mockPrismaAccount.findFirst.mockResolvedValue(null);
      
      await expect(getOAuth2Client(mockUserId)).rejects.toThrow('Google認証情報が見つかりません');
    });
    
    it('トークンの有効期限が切れている場合は更新を試みる', async () => {
      mockPrismaAccount.findFirst.mockResolvedValue({
        id: 'account-123',
        userId: mockUserId,
        provider: 'google',
        access_token: 'expired-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1時間前
      });
      
      await getOAuth2Client(mockUserId);
      
      expect(mockGoogleOAuth2.refreshAccessToken).toHaveBeenCalled();
      expect(mockPrismaAccount.update).toHaveBeenCalled();
    });
  });
  
  describe('getCalendarEvents', () => {
    it('指定期間内のカレンダーイベントを取得する', async () => {
      const timeMin = new Date('2023-06-01');
      const timeMax = new Date('2023-06-30');
      
      const events = await getCalendarEvents(mockUserId, timeMin, timeMax);
      
      expect(mockGoogleCalendarEvents.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        privateExtendedProperty: ['isMuedLmsEvent=true'],
      });
      
      expect(events).toEqual([mockEvent]);
    });
  });
  
  describe('createCalendarEvent', () => {
    it('カレンダーイベントを作成する', async () => {
      const event = await createCalendarEvent(mockUserId, mockLessonSlot as LessonSlot);
      
      expect(mockGoogleCalendarEvents.insert).toHaveBeenCalled();
      expect(event).toEqual(mockEvent);
    });
  });
  
  describe('updateCalendarEvent', () => {
    it('カレンダーイベントを更新する', async () => {
      const event = await updateCalendarEvent(mockUserId, mockLessonSlot as LessonSlot);
      
      expect(mockGoogleCalendarEvents.update).toHaveBeenCalled();
      expect(event).toEqual(mockEvent);
    });
    
    it('GoogleカレンダーイベントIDがない場合はエラーをスロー', async () => {
      const slotWithoutEventId = { ...mockLessonSlot, googleCalendarEventId: null };
      
      await expect(updateCalendarEvent(mockUserId, slotWithoutEventId as LessonSlot)).rejects.toThrow('GoogleカレンダーイベントIDがありません');
    });
  });
  
  describe('deleteCalendarEvent', () => {
    it('カレンダーイベントを削除する', async () => {
      const result = await deleteCalendarEvent(mockUserId, mockEvent.id);
      
      expect(mockGoogleCalendarEvents.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: mockEvent.id,
      });
      
      expect(result).toBe(true);
    });
  });
  
  describe('syncLessonSlotsToCalendar', () => {
    it('レッスン枠をGoogleカレンダーに同期する', async () => {
      const results = await syncLessonSlotsToCalendar(mockUserId, mockMentorId);
      
      expect(mockPrismaLessonSlot.findMany).toHaveBeenCalled();
      expect(mockGoogleCalendarEvents.update).toHaveBeenCalled();
      
      expect(results).toEqual({
        created: 0,
        updated: 1,
        errors: 0,
      });
    });
    
    it('googleCalendarEventIdがないレッスン枠は新規作成する', async () => {
      mockPrismaLessonSlot.findMany.mockResolvedValue([{
        ...mockLessonSlot,
        googleCalendarEventId: null,
      }]);
      
      const results = await syncLessonSlotsToCalendar(mockUserId, mockMentorId);
      
      expect(mockGoogleCalendarEvents.insert).toHaveBeenCalled();
      expect(mockPrismaLessonSlot.update).toHaveBeenCalled();
      
      expect(results).toEqual({
        created: 1,
        updated: 0,
        errors: 0,
      });
    });
  });
  
  describe('syncCalendarToLessonSlots', () => {
    it('Googleカレンダーからレッスン枠にイベントを同期する', async () => {
      mockPrismaLessonSlot.findMany.mockResolvedValue([]);
      
      const results = await syncCalendarToLessonSlots(mockUserId, mockMentorId);
      
      expect(mockPrismaLessonSlot.create).toHaveBeenCalled();
      expect(results.created).toEqual(1);
      expect(results.updated).toEqual(0);
      expect(results.deleted).toEqual(0);
    });
    
    it('既存のレッスン枠を更新する', async () => {
      mockPrismaLessonSlot.findMany.mockResolvedValue([{
        ...mockLessonSlot,
        title: '古いタイトル',
      }]);
      
      const results = await syncCalendarToLessonSlots(mockUserId, mockMentorId);
      
      expect(mockPrismaLessonSlot.update).toHaveBeenCalled();
      expect(results.updated).toEqual(1);
      expect(results.created).toEqual(0);
    });
    
    it('カレンダーに存在しないレッスン枠を削除する', async () => {
      mockPrismaLessonSlot.findMany.mockResolvedValue([{
        ...mockLessonSlot,
        googleCalendarEventId: 'other-event-id',
      }]);
      
      mockGoogleCalendarEvents.list.mockResolvedValue({
        data: { items: [] },
      });
      
      const results = await syncCalendarToLessonSlots(mockUserId, mockMentorId);
      
      expect(mockPrismaLessonSlot.delete).toHaveBeenCalled();
      expect(results.deleted).toEqual(1);
    });
    
    it('予約があるレッスン枠は削除しない', async () => {
      mockPrismaLessonSlot.findMany.mockResolvedValue([{
        ...mockLessonSlot,
        googleCalendarEventId: 'other-event-id',
      }]);
      mockPrismaReservation.findFirst.mockResolvedValue({ id: 'reservation-123' });
      
      mockGoogleCalendarEvents.list.mockResolvedValue({
        data: { items: [] },
      });
      
      const results = await syncCalendarToLessonSlots(mockUserId, mockMentorId);
      
      expect(mockPrismaLessonSlot.delete).not.toHaveBeenCalled();
      expect(results.deleted).toEqual(0);
    });
  });
}); 