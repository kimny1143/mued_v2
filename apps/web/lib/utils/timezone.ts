import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const JAPAN_TIMEZONE = 'Asia/Tokyo';

/**
 * UTC時刻を日本時間に変換
 */
export function utcToJst(date: Date | string): Date {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(utcDate, JAPAN_TIMEZONE);
}

/**
 * 日本時間をUTC時刻に変換
 */
export function jstToUtc(date: Date | string): Date {
  const jstDate = typeof date === 'string' ? parseISO(date) : date;
  return zonedTimeToUtc(jstDate, JAPAN_TIMEZONE);
}

/**
 * 日本時間でフォーマット（表示用）
 */
export function formatJst(date: Date | string, formatStr: string): string {
  const jstDate = utcToJst(date);
  return format(jstDate, formatStr);
}

/**
 * 現在の日本時間を取得
 */
export function nowJst(): Date {
  return utcToZonedTime(new Date(), JAPAN_TIMEZONE);
}

/**
 * 過去の日時かどうかをチェック（日本時間基準）
 */
export function isPastJst(date: Date | string): boolean {
  const jstDate = utcToJst(date);
  const nowJstDate = nowJst();
  return jstDate < nowJstDate;
}

/**
 * レスポンス用にオブジェクト内の日時フィールドをJST表記に変換
 * （実際の値はUTCのまま保持し、表示用フィールドを追加）
 */
export function addJstFields<T extends Record<string, any>>(
  obj: T,
  dateFields: string[]
): T & Record<string, string> {
  const result = { ...obj };
  
  dateFields.forEach(field => {
    if (obj[field]) {
      // JST表示用フィールドを追加（例: startTime → startTimeJst）
      result[`${field}Jst`] = formatJst(obj[field], 'yyyy-MM-dd HH:mm:ss');
    }
  });
  
  return result;
}