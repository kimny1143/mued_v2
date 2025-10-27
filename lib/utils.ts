import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

/**
 * Format date to a human-readable string
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time to a human-readable string
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted time string
 */
export function formatTime(date: Date | string, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date and time to a human-readable string
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string, locale: string = 'en-US'): string {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}