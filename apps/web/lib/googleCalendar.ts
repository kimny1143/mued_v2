import { PrismaClient, lesson_slots as PrismaLessonSlot } from '@prisma/client';
import { format, differenceInMilliseconds } from 'date-fns';
import { google, calendar_v3 } from 'googleapis';

const prisma = new PrismaClient();

// レッスン枠の型定義（カスタム拡張版）
interface LessonSlot {
  id: string;
  teacherId: string; // mentorId→teacherIdに変更してPrismaスキーマと一致
  title: string;
  startTime: Date;
  endTime: Date;
  description: string;
  googleCalendarEventId: string | null;
  googleCalendarLink: string | null;
  lastSyncedAt: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
  isAvailable?: boolean;
}

// PrismaのLessonSlotとカスタムLessonSlotの相互変換
const prismaToCustomLessonSlot = (slot: PrismaLessonSlot): LessonSlot => {
  return {
    id: slot.id,
    teacherId: slot.teacher_id,
    title: slot.id, // Prismaにtitleフィールドがない場合はidなどで代用
    startTime: slot.start_time,
    endTime: slot.end_time,
    description: '', // Prismaにdescriptionフィールドがない場合は空文字で代用
    googleCalendarEventId: null,
    googleCalendarLink: null,
    lastSyncedAt: null,
    updatedAt: slot.updated_at,
    createdAt: slot.created_at,
    isAvailable: slot.is_available
  };
};

// OAuth2クライアント設定
export const getOAuth2Client = async (user_id: string) => {
  // ユーザーのGoogle認証情報をDBから取得
  const account = await prisma.account.findFirst({
    where: {
      user_id,
      provider: 'google',
    },
  });

  if (!account || !account.access_token) {
    throw new Error('Google認証情報が見つかりません');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback'
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
const mapEventToLessonSlot = (event: calendar_v3.Schema$Event, teacherId: string) => {
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
    return null;
  }

  return {
    id: event.id,
    teacherId,
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
export const syncLessonSlotsToCalendar = async (userId: string, teacherId: string) => {
  // メンターのレッスン枠を取得
  const lessonSlots = await prisma.lesson_slots.findMany({
    where: {
      teacher_id: teacherId,
      // 最近更新されたレッスン枠のみを対象にする単純な条件に変更
      updated_at: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 過去24時間以内に更新
      }
    },
  });

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
  };

  for (const prismaSlot of lessonSlots) {
    try {
      // Prismaモデルをカスタムモデルに変換
      const slot = prismaToCustomLessonSlot(prismaSlot);
      
      // 既存のイベントを確認するロジックを実装（例：拡張プロパティを確認）
      if (slot.googleCalendarEventId) {
        // 既存のイベントを更新
        await updateCalendarEvent(userId, slot);
        results.updated++;
      } else {
        // 新規イベントを作成
        const event = await createCalendarEvent(userId, slot);
        
        // Prismaのアップデートにはカスタムフィールドは含めない
        await prisma.lesson_slots.update({
          where: { id: slot.id },
          data: {
            // ここにPrismaが認識するフィールドのみを含める
            updated_at: new Date(),
          },
        });
        
        results.created++;
      }
    } catch (error) {
      console.error(`レッスン枠ID:${prismaSlot.id}の同期エラー:`, error);
      results.errors++;
    }
  }

  return results;
};

// 差分同期処理（GoogleカレンダーからDBへ）
export const syncCalendarToLessonSlots = async (userId: string, teacherId: string) => {
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

  // 既存のレッスン枠を取得
  const existingSlots = await prisma.lesson_slots.findMany({
    where: {
      teacher_id: teacherId,
    },
  });

  // イベントIDとレッスン枠のマップを作成
  const existingSlotsMap = new Map();
  existingSlots.forEach(slot => {
    // Prismaモデルには不足フィールドがあるため、IDのみをキーとして使用
    existingSlotsMap.set(slot.id, slot);
  });

  // カレンダーイベントからのデータでDBを更新
  for (const event of events) {
    if (!event.id) continue;

    try {
      const lessonSlot = mapEventToLessonSlot(event, teacherId);
      if (!lessonSlot) continue;

      // イベントIDに基づいてレッスン枠を検索（既存の実装と異なるアプローチ）
      let existingSlot = null;
      // extendedPropertiesのlessonSlotIdがあれば、それに基づいて既存レッスン枠を探す
      if (event.extendedProperties?.private?.lessonSlotId) {
        const slotId = event.extendedProperties.private.lessonSlotId;
        existingSlot = existingSlotsMap.get(slotId);
        existingSlotsMap.delete(slotId); // 処理済みのイベントを削除
      }

      if (existingSlot) {
        // すでに存在する場合は更新
        // Prismaのアップデートにはカスタムフィールドは含めない
        await prisma.lesson_slots.update({
          where: { id: existingSlot.id },
          data: {
            start_time: lessonSlot.startTime,
            end_time: lessonSlot.endTime,
            updated_at: new Date(),
          },
        });
        results.updated++;
      } else {
        // 新規作成
        await prisma.lesson_slots.create({
          data: {
            id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            teacher_id: teacherId,
            start_time: lessonSlot.startTime,
            end_time: lessonSlot.endTime,
            is_available: true,
            updated_at: new Date(),
          },
        });
        results.created++;
      }
    } catch (error) {
      console.error(`イベントID:${event.id}の同期エラー:`, error);
      results.errors++;
    }
  }

  // 残ったマップエントリ（カレンダーには存在しないがDBにある）は削除検討対象
  for (const [slotId] of existingSlotsMap.entries()) {
    // 予約がある場合は削除しない
    const reservation = await prisma.reservations.findFirst({
      where: { slot_id: slotId },
    });

    if (!reservation) {
      try {
        await prisma.lesson_slots.delete({
          where: { id: slotId },
        });
        results.deleted++;
      } catch (error) {
        console.error(`レッスン枠ID:${slotId}の削除エラー:`, error);
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