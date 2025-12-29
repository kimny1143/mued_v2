/**
 * formatTime.ts - 時間フォーマットユーティリティ
 *
 * アプリ全体で一貫した時間表示を提供
 */

/**
 * 秒数を "1h 30m" または "30m" 形式にフォーマット
 * @param seconds - 秒数
 * @returns フォーマット済み文字列
 */
export function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * 秒数を "Xm" 形式にフォーマット（分のみ）
 * @param seconds - 秒数
 * @returns フォーマット済み文字列
 */
export function formatDurationMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

/**
 * 秒数を "M:SS" 形式にフォーマット（ログタイムスタンプ用）
 * @param seconds - 秒数
 * @returns フォーマット済み文字列
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * ISO文字列から "HH:MM" 形式の時刻を取得
 * @param isoString - ISO 8601形式の日時文字列
 * @returns フォーマット済み時刻文字列
 */
export function formatTimeFromIso(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * ISO文字列から "YYYY-MM-DD" 形式の日付キーを取得
 * @param isoString - ISO 8601形式の日時文字列
 * @returns 日付キー文字列
 */
export function getDateKey(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}
