/**
 * Date and time helper utilities for booking tests
 */

export class DateTimeHelper {
  /**
   * Get today's date at midnight
   */
  static getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Get tomorrow's date at midnight
   */
  static getTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get yesterday's date at midnight
   */
  static getYesterday(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  /**
   * Get a date N days from today
   */
  static getDateFromToday(daysOffset: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Get the first day of the current month
   */
  static getFirstDayOfMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get the last day of the current month
   */
  static getLastDayOfMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Get the first day of next month
   */
  static getFirstDayOfNextMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }

  /**
   * Get the first day of previous month
   */
  static getFirstDayOfPreviousMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() - 1, 1);
  }

  /**
   * Format date for display comparison
   */
  static formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    switch (format) {
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "Month D, YYYY":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      default:
        return date.toString();
    }
  }

  /**
   * Format time for display comparison
   */
  static formatTime(date: Date, format: "12h" | "24h" = "24h"): string {
    if (format === "12h") {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }

  /**
   * Check if a date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if a date is in the past
   */
  static isPast(date: Date): boolean {
    const today = this.getToday();
    return date < today;
  }

  /**
   * Check if a date is in the future
   */
  static isFuture(date: Date): boolean {
    const today = this.getToday();
    return date > today;
  }

  /**
   * Check if a date is a weekend
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get the day of week name
   */
  static getDayName(date: Date, format: "short" | "long" = "long"): string {
    return date.toLocaleDateString("en-US", { weekday: format });
  }

  /**
   * Get the month name
   */
  static getMonthName(date: Date, format: "short" | "long" = "long"): string {
    return date.toLocaleDateString("en-US", { month: format });
  }

  /**
   * Get time slot category (morning, afternoon, evening)
   */
  static getTimeSlotCategory(hour: number): "morning" | "afternoon" | "evening" | "night" {
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 21) return "evening";
    return "night";
  }

  /**
   * Create a time slot with start and end times
   */
  static createTimeSlot(
    date: Date,
    startHour: number,
    startMinute: number = 0,
    durationMinutes: number = 60
  ): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return { start, end };
  }

  /**
   * Check if two dates are on the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  /**
   * Check if two dates are in the same month
   */
  static isSameMonth(date1: Date, date2: Date): boolean {
    return (
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  /**
   * Get the number of days in a month
   */
  static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Get an array of dates for a month
   */
  static getMonthDates(year: number, month: number): Date[] {
    const dates: Date[] = [];
    const daysInMonth = this.getDaysInMonth(year, month);

    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }

    return dates;
  }

  /**
   * Get business days (Monday-Friday) in a date range
   */
  static getBusinessDays(startDate: Date, endDate: Date): Date[] {
    const businessDays: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (!this.isWeekend(current)) {
        businessDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return businessDays;
  }

  /**
   * Parse a time string (e.g., "14:30") to hours and minutes
   */
  static parseTimeString(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hours, minutes };
  }

  /**
   * Calculate duration between two dates in minutes
   */
  static getDurationInMinutes(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Add minutes to a date
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * Add hours to a date
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get the start of the week (Monday)
   */
  static getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get the end of the week (Sunday)
   */
  static getEndOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() + (7 - day);
    result.setDate(diff);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Format date for Japanese locale
   */
  static formatDateJapanese(date: Date, includeWeekday: boolean = true): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    if (includeWeekday) {
      options.weekday = "short";
    }

    return date.toLocaleDateString("ja-JP", options);
  }

  /**
   * Format time for Japanese locale
   */
  static formatTimeJapanese(date: Date): string {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Check if a slot time conflicts with another
   */
  static hasTimeConflict(
    slot1Start: Date,
    slot1End: Date,
    slot2Start: Date,
    slot2End: Date
  ): boolean {
    return slot1Start < slot2End && slot2Start < slot1End;
  }

  /**
   * Generate available time slots for a day
   */
  static generateDayTimeSlots(
    date: Date,
    startHour: number = 9,
    endHour: number = 21,
    slotDurationMinutes: number = 60,
    breakMinutes: number = 0
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const current = new Date(date);
    current.setHours(startHour, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, 0, 0, 0);

    while (current < endTime) {
      const slotEnd = this.addMinutes(current, slotDurationMinutes);

      if (slotEnd <= endTime) {
        slots.push({
          start: new Date(current),
          end: slotEnd,
        });
      }

      current.setMinutes(current.getMinutes() + slotDurationMinutes + breakMinutes);
    }

    return slots;
  }

  /**
   * Check if current time is within business hours
   */
  static isBusinessHours(
    date: Date = new Date(),
    startHour: number = 9,
    endHour: number = 18
  ): boolean {
    const hours = date.getHours();
    return hours >= startHour && hours < endHour && !this.isWeekend(date);
  }
}