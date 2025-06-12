import { format, parseISO } from 'date-fns';

const JAPAN_TIMEZONE = 'Asia/Tokyo';

/**
 * ISO文字列をUTC時刻として確実に解釈する
 * @param dateStr - ISO形式の日時文字列
 * @returns UTC時刻のDateオブジェクト
 */
export function parseAsUTC(dateStr: string): Date {
  // Zサフィックスやタイムゾーンオフセットがない場合はZを追加
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-')) {
    return parseISO(dateStr + 'Z');
  }
  return parseISO(dateStr);
}

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
 * @param date - UTC時刻のDateオブジェクトまたはISO文字列
 * @param formatStr - date-fnsのフォーマット文字列
 * @param debug - デバッグログを出力するか（オプション）
 */
export function formatJst(date: Date | string, formatStr: string, debug = false): string {
  let inputDate: Date;
  
  if (typeof date === 'string') {
    // 文字列の場合、Zサフィックスがない場合は追加してUTCとして解釈
    const dateStr = date.endsWith('Z') || date.includes('+') || date.includes('-') 
      ? date 
      : date + 'Z';
    inputDate = parseISO(dateStr);
  } else {
    inputDate = date;
  }
  
  if (debug) {
    console.log('[formatJst] Input:', date);
    console.log('[formatJst] Parsed as UTC:', inputDate.toISOString());
  }
  
  // Intl.DateTimeFormatを使用して日本時間を取得
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: JAPAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    // タイムゾーン情報も含めて取得（デバッグ用）
    timeZoneName: debug ? 'short' : undefined
  });
  
  const parts = formatter.formatToParts(inputDate);
  const dateMap: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateMap[part.type] = part.value;
    }
  });
  
  if (debug) {
    console.log('[formatJst] Formatted parts:', dateMap);
    console.log('[formatJst] JST time:', formatter.format(inputDate));
  }
  
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
  
  const result = format(pseudoDate, formatStr);
  
  if (debug) {
    console.log('[formatJst] Final result:', result);
  }
  
  return result;
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
 * @param obj - 変換対象のオブジェクト
 * @param dateFields - 日時フィールドの名前の配列
 * @param debug - デバッグログを出力するか（オプション）
 */
export function addJstFields<T extends Record<string, any>>(
  obj: T,
  dateFields: string[],
  debug = false
): T & Record<string, string> {
  const result = { ...obj };
  
  dateFields.forEach(field => {
    if (obj[field]) {
      // JST表示用フィールドを追加（例: startTime → startTimeJst）
      result[`${field}Jst`] = formatJst(obj[field], 'yyyy-MM-dd HH:mm:ss', debug);
      
      if (debug) {
        console.log(`[addJstFields] ${field}:`, obj[field], '→', result[`${field}Jst`]);
      }
    }
  });
  
  return result;
}

/**
 * シンプルな日本時間表示（デフォルトフォーマット）
 * @param date - UTC時刻のDateオブジェクトまたはISO文字列
 * @returns 日本時間の文字列（yyyy-MM-dd HH:mm:ss形式）
 */
export function toJstString(date: Date | string): string {
  return formatJst(date, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 時刻のみの日本時間表示
 * @param date - UTC時刻のDateオブジェクトまたはISO文字列
 * @returns 日本時間の時刻文字列（HH:mm形式）
 */
export function toJstTimeString(date: Date | string): string {
  return formatJst(date, 'HH:mm');
}

/**
 * 日付のみの日本時間表示
 * @param date - UTC時刻のDateオブジェクトまたはISO文字列
 * @returns 日本時間の日付文字列（yyyy-MM-dd形式）
 */
export function toJstDateString(date: Date | string): string {
  return formatJst(date, 'yyyy-MM-dd');
}