import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  formatDistanceToNow,
  formatRelative,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isValid,
} from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

// ========================================
// Class Name Utilities
// ========================================

/**
 * Utility function to merge Tailwind CSS classes with proper precedence.
 * Combines clsx for conditional class names and tailwind-merge for Tailwind class deduplication.
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 *
 * @example
 * cn('px-2 py-1', 'px-3') // 'py-1 px-3'
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ========================================
// Date Formatting Utilities (date-fns)
// ========================================

type DateInput = Date | string | number;
type LocaleOption = 'en' | 'ja';

/**
 * Get date-fns locale object
 */
function getLocale(locale: LocaleOption = 'ja') {
  return locale === 'ja' ? ja : enUS;
}

/**
 * Parse date input to Date object
 */
function toDate(date: DateInput): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'string') return parseISO(date);
  return new Date(date);
}

/**
 * Format date to a human-readable string
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'ja')
 * @returns Formatted date string (e.g., "2024年1月15日" or "Jan 15, 2024")
 */
export function formatDate(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  const pattern = locale === 'ja' ? 'yyyy年M月d日' : 'MMM d, yyyy';
  return format(d, pattern, { locale: getLocale(locale) });
}

/**
 * Format date with short format
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted date string (e.g., "1/15" or "1/15")
 */
export function formatDateShort(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  return format(d, 'M/d', { locale: getLocale(locale) });
}

/**
 * Format date with weekday
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted date string (e.g., "2024年1月15日(月)" or "Mon, Jan 15, 2024")
 */
export function formatDateWithWeekday(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  const pattern = locale === 'ja' ? 'yyyy年M月d日(E)' : 'EEE, MMM d, yyyy';
  return format(d, pattern, { locale: getLocale(locale) });
}

/**
 * Format time to a human-readable string
 * @param date - Date to format
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(date: DateInput): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  return format(d, 'HH:mm');
}

/**
 * Format time with 12-hour format
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted time string (e.g., "2:30 PM" or "午後2:30")
 */
export function formatTime12h(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  const pattern = locale === 'ja' ? 'aaa h:mm' : 'h:mm a';
  return format(d, pattern, { locale: getLocale(locale) });
}

/**
 * Format date and time to a human-readable string
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'ja')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  const pattern = locale === 'ja' ? 'yyyy年M月d日 HH:mm' : 'MMM d, yyyy HH:mm';
  return format(d, pattern, { locale: getLocale(locale) });
}

/**
 * Format date as ISO string for API/DB
 * @param date - Date to format
 * @returns ISO date string (e.g., "2024-01-15")
 */
export function formatDateISO(date: DateInput): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  return format(d, 'yyyy-MM-dd');
}

/**
 * Format month and day only
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted string (e.g., "Jan 15" or "1月15日")
 */
export function formatMonthDay(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  const pattern = locale === 'ja' ? 'M月d日' : 'MMM d';
  return format(d, pattern, { locale: getLocale(locale) });
}

/**
 * Format weekday only
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @param short - Use short format (default: true)
 * @returns Formatted weekday (e.g., "Mon" or "月")
 */
export function formatWeekday(date: DateInput, locale: LocaleOption = 'ja', short: boolean = true): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  const pattern = short ? 'EEE' : 'EEEE';
  return format(d, pattern, { locale: getLocale(locale) });
}

/**
 * Format relative time (e.g., "3時間前", "2日後")
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Relative time string
 */
export function formatRelativeTime(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: getLocale(locale),
  });
}

/**
 * Format smart date (今日/明日/昨日 or relative)
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Smart formatted date string
 */
export function formatSmartDate(date: DateInput, locale: LocaleOption = 'ja'): string {
  const d = toDate(date);
  if (!isValid(d)) return '';

  if (isToday(d)) return locale === 'ja' ? '今日' : 'Today';
  if (isTomorrow(d)) return locale === 'ja' ? '明日' : 'Tomorrow';
  if (isYesterday(d)) return locale === 'ja' ? '昨日' : 'Yesterday';

  const daysDiff = differenceInDays(d, new Date());

  if (daysDiff > -7 && daysDiff < 7) {
    return formatRelative(d, new Date(), { locale: getLocale(locale) });
  }

  return formatDate(d, locale);
}

// ========================================
// Date Calculation Utilities
// ========================================

export {
  // Re-export commonly used date-fns functions
  isToday,
  isTomorrow,
  isYesterday,
  isValid,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
};