/**
 * Date/Time Test Helpers
 *
 * Utilities for working with dates and times in tests.
 */

/**
 * Create a date from an ISO string
 */
export function createDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Create a date from components
 */
export function createDateFromComponents(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Get current date for testing (mockable)
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date is within range
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Format date as ISO string (without milliseconds)
 */
export function toISOStringWithoutMs(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Parse ISO date string
 */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of week (Monday)
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setDate(diff);
  return startOfDay(result);
}

/**
 * Get end of week (Sunday)
 */
export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  return startOfDay(result);
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  return endOfDay(result);
}

/**
 * Calculate difference in days
 */
export function diffInDays(date1: Date, date2: Date): number {
  const diff = date1.getTime() - date2.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate difference in hours
 */
export function diffInHours(date1: Date, date2: Date): number {
  const diff = date1.getTime() - date2.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

/**
 * Calculate difference in minutes
 */
export function diffInMinutes(date1: Date, date2: Date): number {
  const diff = date1.getTime() - date2.getTime();
  return Math.floor(diff / (1000 * 60));
}

/**
 * Create date range
 */
export function createDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Mock system time
 */
export class MockTime {
  private originalNow: () => number;
  private mockDate: Date | null = null;

  constructor() {
    this.originalNow = Date.now;
  }

  /**
   * Set mock time
   */
  set(date: Date): void {
    this.mockDate = date;
    Date.now = () => this.mockDate!.getTime();
  }

  /**
   * Advance time by milliseconds
   */
  advance(ms: number): void {
    if (!this.mockDate) {
      throw new Error('Mock time not set');
    }
    this.mockDate = new Date(this.mockDate.getTime() + ms);
  }

  /**
   * Advance time by days
   */
  advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  /**
   * Reset to real time
   */
  reset(): void {
    Date.now = this.originalNow;
    this.mockDate = null;
  }

  /**
   * Get current mock time
   */
  now(): Date {
    return this.mockDate || new Date();
  }
}

/**
 * Time-based test data generators
 */
export const timeSeriesGenerators = {
  /**
   * Generate daily timestamps
   */
  dailyTimestamps(startDate: Date, days: number): Date[] {
    return Array.from({ length: days }, (_, i) => addDays(startDate, i));
  },

  /**
   * Generate hourly timestamps
   */
  hourlyTimestamps(startDate: Date, hours: number): Date[] {
    return Array.from({ length: hours }, (_, i) => addHours(startDate, i));
  },

  /**
   * Generate random timestamps within range
   */
  randomTimestamps(startDate: Date, endDate: Date, count: number): Date[] {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const range = end - start;

    return Array.from({ length: count }, () => {
      const randomTime = start + Math.random() * range;
      return new Date(randomTime);
    });
  },

  /**
   * Generate business hours timestamps (9 AM - 5 PM, weekdays)
   */
  businessHoursTimestamps(startDate: Date, days: number): Date[] {
    const timestamps: Date[] = [];

    for (let day = 0; day < days; day++) {
      const date = addDays(startDate, day);
      const dayOfWeek = date.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Generate timestamps from 9 AM to 5 PM
      for (let hour = 9; hour <= 17; hour++) {
        const timestamp = new Date(date);
        timestamp.setHours(hour, 0, 0, 0);
        timestamps.push(timestamp);
      }
    }

    return timestamps;
  },
};

/**
 * Date assertion helpers
 */
export const dateAssertions = {
  /**
   * Assert dates are equal (ignoring milliseconds)
   */
  assertDatesEqual(date1: Date, date2: Date): void {
    const d1 = toISOStringWithoutMs(date1);
    const d2 = toISOStringWithoutMs(date2);

    if (d1 !== d2) {
      throw new Error(`Dates not equal: ${d1} !== ${d2}`);
    }
  },

  /**
   * Assert date is after
   */
  assertDateAfter(date: Date, compareDate: Date): void {
    if (date <= compareDate) {
      throw new Error(`Date ${date.toISOString()} is not after ${compareDate.toISOString()}`);
    }
  },

  /**
   * Assert date is before
   */
  assertDateBefore(date: Date, compareDate: Date): void {
    if (date >= compareDate) {
      throw new Error(`Date ${date.toISOString()} is not before ${compareDate.toISOString()}`);
    }
  },

  /**
   * Assert date is within range
   */
  assertDateInRange(date: Date, start: Date, end: Date): void {
    if (!isWithinRange(date, start, end)) {
      throw new Error(
        `Date ${date.toISOString()} is not within range ${start.toISOString()} - ${end.toISOString()}`
      );
    }
  },
};
