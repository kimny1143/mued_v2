// @mued/shared/utils/date - Date utility functions

import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 日付を指定されたフォーマットで文字列に変換
 */
export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr, { locale: ja });
}

/**
 * 日時を日本語形式で表示
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'yyyy年MM月dd日 HH:mm');
}

/**
 * 時刻のみを表示
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm');
}

/**
 * 相対的な時間表示（例: 3時間前）
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return formatDate(dateObj, 'yyyy/MM/dd');
}

/**
 * 2つの日付間の時間差（分）を計算
 */
export function calculateMinutesDiff(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * 2つの日付間の時間差（時間）を計算
 */
export function calculateHoursDiff(start: Date | string, end: Date | string): number {
  return calculateMinutesDiff(start, end) / 60;
}

/**
 * 日付が過去かどうかを判定
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * 日付が未来かどうかを判定
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * 日付が今日かどうかを判定
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getFullYear() === today.getFullYear() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getDate() === today.getDate()
  );
}