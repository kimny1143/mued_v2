import { format, parseISO } from 'date-fns';

const JAPAN_TIMEZONE = 'Asia/Tokyo';

/**
 * 日付を日本時間の文字列として取得
 */
function toJSTString(date: Date): string {
  return date.toLocaleString('ja-JP', { 
    timeZone: JAPAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * UTC時刻を日本時間に変換（注：返されるDateオブジェクトは依然としてUTC基準）
 * 表示専用で使用すること
 */
export function utcToJst(date: Date | string): Date {
  // この関数は実際には変換せず、表示用の関数で処理する
  return typeof date === 'string' ? parseISO(date) : date;
}

/**
 * 日本時間をUTC時刻に変換
 */
export function jstToUtc(date: Date | string): Date {
  // この関数は実際には変換せず、入力をそのまま返す
  return typeof date === 'string' ? parseISO(date) : date;
}

/**
 * 日本時間でフォーマット（表示用）
 */
export function formatJst(date: Date | string, formatStr: string): string {
  const inputDate = typeof date === 'string' ? parseISO(date) : date;
  
  // Intl.DateTimeFormatを使用して日本時間を取得
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: JAPAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(inputDate);
  const dateMap: any = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateMap[part.type] = part.value;
    }
  });
  
  // date-fnsのformatで使えるように、擬似的なDateオブジェクトを作成
  // 注：これは表示専用で、実際の日時計算には使用しない
  const pseudoDate = new Date(
    parseInt(dateMap.year),
    parseInt(dateMap.month) - 1,
    parseInt(dateMap.day),
    parseInt(dateMap.hour),
    parseInt(dateMap.minute),
    parseInt(dateMap.second || '0')
  );
  
  return format(pseudoDate, formatStr);
}

/**
 * 現在の日本時間を取得（注：返されるDateオブジェクトは依然としてUTC基準）
 */
export function nowJst(): Date {
  // 現在時刻をそのまま返す（表示時に変換）
  return new Date();
}

/**
 * 過去の日時かどうかをチェック（日本時間基準）
 */
export function isPastJst(date: Date | string): boolean {
  const inputDate = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  // 両方の日時を日本時間の文字列に変換して比較
  const inputJST = toJSTString(inputDate);
  const nowJST = toJSTString(now);
  
  return inputJST < nowJST;
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