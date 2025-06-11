import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * ベストプラクティスに準拠したタイムゾーン処理
 */

const JAPAN_TIMEZONE = 'Asia/Tokyo';

/**
 * データベースクエリ用：現在時刻をUTCで取得
 */
export function getCurrentUTC(): Date {
  return new Date();
}

/**
 * 表示用：UTCを日本時間の文字列にフォーマット
 * 注：元のDateオブジェクトは変更しない（イミュータブル）
 */
export function formatInJST(date: Date | string, formatStr: string): string {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  
  // ブラウザ環境ではIntl.DateTimeFormatを使用
  if (typeof window !== 'undefined') {
    return utcDate.toLocaleString('ja-JP', {
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
  
  // サーバー環境では単純にUTCとして扱う
  return format(utcDate, formatStr);
}

/**
 * Supabaseクエリ用：日本時間での比較をPostgreSQLで行うためのヘルパー
 */
export function getJSTFilterQuery(columnName: string, operator: string = '>'): string {
  return `${columnName} AT TIME ZONE 'Asia/Tokyo' ${operator} NOW() AT TIME ZONE 'Asia/Tokyo'`;
}

/**
 * APIレスポンス用：表示用の日時フィールドを追加（元データは変更しない）
 */
export function addDisplayDates<T extends Record<string, any>>(
  obj: T,
  dateFields: string[]
): T & Record<string, string> {
  const result = { ...obj };
  
  // クライアント側でのみ実行
  if (typeof window !== 'undefined') {
    dateFields.forEach(field => {
      if (obj[field]) {
        result[`${field}Display`] = formatInJST(obj[field], 'yyyy-MM-dd HH:mm:ss');
      }
    });
  }
  
  return result;
}

/**
 * パフォーマンス最適化：バッチ処理用
 */
export function filterFutureItemsInDB(query: any, dateColumn: string = 'end_time'): any {
  // Supabaseクエリビルダーで使用
  // 例: query.gte(dateColumn, new Date().toISOString())
  return query.gte(dateColumn, getCurrentUTC().toISOString());
}