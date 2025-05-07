import { google, calendar_v3 } from 'googleapis';
import { addMinutes, parseISO, format, differenceInMilliseconds } from 'date-fns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// レッスン枠の型定義
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

// OAuth2クライアント設定
export const getOAuth2Client = async (userId: string) => {
  // ユーザーのGoogle認証情報をDBから取得
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  });

  if (!account || !account.access_token) {
    throw new Error('Google認証情報が見つかりません');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );

  // トークンを設定
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // トークンの有効期限が切れていたら更新
  if (account.expires_at && Date.now() > account.expires_at * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // 更新されたトークンを保存
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : undefined,
          refresh_token: credentials.refresh_token || account.refresh_token,
        },
      });
      
      // 新しいトークンを設定
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('トークン更新エラー:', error);
      throw new Error('Googleトークンの更新に失敗しました');
    }
  }

  return oauth2Client;
};

// カレンダーイベントをLessonSlot形式に変換
const mapEventToLessonSlot = (event: calendar_v3.Schema$Event, mentorId: string) => {
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
    return null;
  }

  return {
    id: event.id,
    mentorId,
    title: event.summary || 'レッスン枠',
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end.dateTime),
    description: event.description || '',
    googleCalendarEventId: event.id,
    googleCalendarLink: event.htmlLink || '',
    lastSyncedAt: new Date(),
  };
};

// LessonSlotをカレンダーイベント形式に変換
const mapLessonSlotToEvent = (lessonSlot: LessonSlot): calendar_v3.Schema$Event => {
  return {
    summary: lessonSlot.title,
    description: lessonSlot.description,
    start: {
      dateTime: format(lessonSlot.startTime, "yyyy-MM-dd'T'HH:mm:ssxxx"),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: format(lessonSlot.endTime, "yyyy-MM-dd'T'HH:mm:ssxxx"),
      timeZone: 'Asia/Tokyo',
    },
    // MUED LMS用のカスタムデータ
    extendedProperties: {
      private: {
        lessonSlotId: lessonSlot.id,
        isMuedLmsEvent: 'true',
      },
    },
  };
};

// 指定期間内のカレンダーイベント取得
export const getCalendarEvents = async (userId: string, timeMin: Date, timeMax: Date) => {
  const oauth2Client = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      // MUED LMSが作成したイベントのみを取得
      privateExtendedProperty: ['isMuedLmsEvent=true'],
    });

    return response.data.items || [];
  } catch (error) {
    console.error('カレンダーイベント取得エラー:', error);
    throw new Error('Googleカレンダーからイベントを取得できませんでした');
  }
};

// カレンダーイベント作成
export const createCalendarEvent = async (userId: string, lessonSlot: LessonSlot) => {
  const oauth2Client = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const event = mapLessonSlotToEvent(lessonSlot);
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('カレンダーイベント作成エラー:', error);
    throw new Error('Googleカレンダーにイベントを作成できませんでした');
  }
};

// カレンダーイベント更新
export const updateCalendarEvent = async (userId: string, lessonSlot: LessonSlot) => {
  if (!lessonSlot.googleCalendarEventId) {
    throw new Error('GoogleカレンダーイベントIDがありません');
  }

  const oauth2Client = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const event = mapLessonSlotToEvent(lessonSlot);
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: lessonSlot.googleCalendarEventId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('カレンダーイベント更新エラー:', error);
    throw new Error('Googleカレンダーのイベントを更新できませんでした');
  }
};

// カレンダーイベント削除
export const deleteCalendarEvent = async (userId: string, googleCalendarEventId: string) => {
  const oauth2Client = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleCalendarEventId,
    });

    return true;
  } catch (error) {
    console.error('カレンダーイベント削除エラー:', error);
    throw new Error('Googleカレンダーからイベントを削除できませんでした');
  }
};

// 差分同期処理（DBからGoogleカレンダーへ）
export const syncLessonSlotsToCalendar = async (userId: string, mentorId: string) => {
  // メンターのレッスン枠を取得
  const lessonSlots = await prisma.lessonSlot.findMany({
    where: {
      mentorId,
      // 最後の同期から変更されたレッスン枠のみ対象
      OR: [
        { lastSyncedAt: null },
        { updatedAt: { gt: { lastSyncedAt: {} } } },
      ],
    },
  });

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
  };

  for (const slot of lessonSlots) {
    try {
      if (slot.googleCalendarEventId) {
        // 既存のイベントを更新
        await updateCalendarEvent(userId, slot);
        results.updated++;
      } else {
        // 新規イベントを作成
        const event = await createCalendarEvent(userId, slot);
        
        // GoogleカレンダーIDを保存
        await prisma.lessonSlot.update({
          where: { id: slot.id },
          data: {
            googleCalendarEventId: event.id,
            googleCalendarLink: event.htmlLink,
            lastSyncedAt: new Date(),
          },
        });
        
        results.created++;
      }
    } catch (error) {
      console.error(`レッスン枠ID:${slot.id}の同期エラー:`, error);
      results.errors++;
    }
  }

  return results;
};

// 差分同期処理（GoogleカレンダーからDBへ）
export const syncCalendarToLessonSlots = async (userId: string, mentorId: string) => {
  // 1ヶ月前から3ヶ月後までの期間を同期対象に
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 1);
  
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 3);

  // Google Calendarからイベント取得
  const events = await getCalendarEvents(userId, timeMin, timeMax);

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
  };

  // GoogleカレンダーIDがあるレッスン枠を全て取得
  const existingSlots = await prisma.lessonSlot.findMany({
    where: {
      mentorId,
      googleCalendarEventId: { not: null },
    },
  });

  // イベントIDとレッスン枠のマップを作成
  const existingSlotsMap = new Map();
  existingSlots.forEach(slot => {
    if (slot.googleCalendarEventId) {
      existingSlotsMap.set(slot.googleCalendarEventId, slot);
    }
  });

  // カレンダーイベントからのデータでDBを更新
  for (const event of events) {
    if (!event.id) continue;

    try {
      const lessonSlot = mapEventToLessonSlot(event, mentorId);
      if (!lessonSlot) continue;

      const existingSlot = existingSlotsMap.get(event.id);
      existingSlotsMap.delete(event.id); // 処理済みのイベントを削除

      if (existingSlot) {
        // すでに存在する場合は更新
        // 変更がある場合のみ更新
        if (needsUpdate(existingSlot, lessonSlot)) {
          await prisma.lessonSlot.update({
            where: { id: existingSlot.id },
            data: {
              title: lessonSlot.title,
              startTime: lessonSlot.startTime,
              endTime: lessonSlot.endTime,
              description: lessonSlot.description,
              lastSyncedAt: new Date(),
            },
          });
          results.updated++;
        }
      } else {
        // 新規作成
        await prisma.lessonSlot.create({
          data: {
            mentorId,
            title: lessonSlot.title,
            startTime: lessonSlot.startTime,
            endTime: lessonSlot.endTime,
            description: lessonSlot.description,
            googleCalendarEventId: lessonSlot.googleCalendarEventId,
            googleCalendarLink: lessonSlot.googleCalendarLink,
            lastSyncedAt: new Date(),
          },
        });
        results.created++;
      }
    } catch (error) {
      console.error(`イベントID:${event.id}の同期エラー:`, error);
      results.errors++;
    }
  }

  // カレンダーには存在しないがDBにあるレッスン枠は削除対象
  for (const [eventId, slot] of existingSlotsMap.entries()) {
    // 予約がある場合は削除しない
    const reservation = await prisma.reservation.findFirst({
      where: { lessonSlotId: slot.id },
    });

    if (!reservation) {
      try {
        await prisma.lessonSlot.delete({
          where: { id: slot.id },
        });
        results.deleted++;
      } catch (error) {
        console.error(`レッスン枠ID:${slot.id}の削除エラー:`, error);
        results.errors++;
      }
    }
  }

  return results;
};

// レッスン枠に更新が必要かチェック
const needsUpdate = (existingSlot: LessonSlot, newSlot: Partial<LessonSlot>): boolean => {
  // startTimeとendTimeが存在することを確認
  if (!newSlot.startTime || !newSlot.endTime) return false;
  
  return (
    existingSlot.title !== newSlot.title ||
    Math.abs(differenceInMilliseconds(existingSlot.startTime, newSlot.startTime)) > 1000 ||
    Math.abs(differenceInMilliseconds(existingSlot.endTime, newSlot.endTime)) > 1000 ||
    existingSlot.description !== newSlot.description
  );
}; 