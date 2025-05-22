import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { TimeSlot } from '../_components/TimeSlotDisplay';

export interface ApiTimeSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

/**
 * メンターの利用可能時間枠を取得する
 */
export async function fetchMentorAvailability(
  mentorId: string,
  fromDate: Date,
  toDate: Date
): Promise<TimeSlot[]> {
  try {
    // 日付をISO形式に変換
    const from = format(fromDate, 'yyyy-MM-dd');
    const to = format(toDate, 'yyyy-MM-dd');
    
    // APIエンドポイントを呼び出す
    const response = await fetch(
      `/api/lesson-slots/by-mentor/${mentorId}?from=${from}&to=${to}`
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data: ApiTimeSlot[] = await response.json();
    
    // APIレスポンスを内部形式に変換
    return data.map(slot => ({
      id: slot.id,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      isAvailable: !slot.isBooked
    }));
  } catch (error) {
    console.error('Error fetching mentor availability:', error);
    return [];
  }
}

/**
 * デフォルトのカレンダー表示範囲を取得する（現在の月とその前後１ヶ月）
 */
export function getDefaultDateRange(baseDate: Date = new Date()) {
  const prevMonth = startOfMonth(addMonths(baseDate, -1));
  const nextMonth = endOfMonth(addMonths(baseDate, 1));
  
  return {
    from: prevMonth,
    to: nextMonth
  };
}

/**
 * カレンダーの予約済み日付を取得する形式に変換
 */
export function convertToReservedDates(timeSlots: TimeSlot[]) {
  return timeSlots
    .filter(slot => !slot.isAvailable)
    .map(slot => ({
      startDate: slot.startTime,
      endDate: slot.endTime
    }));
}

/**
 * 時間枠が利用可能かどうかをチェック
 */
export function isTimeSlotAvailable(
  slot: TimeSlot,
  selectedDuration: 60 | 90,
  allSlots: TimeSlot[]
): boolean {
  if (!slot.isAvailable) return false;
  
  // 60分枠の場合はそのままチェック
  if (selectedDuration === 60) {
    return true;
  }
  
  // 90分枠の場合は、次の連続した30分枠も空いているか確認
  const slotEndTime = slot.endTime.getTime();
  const nextSlot = allSlots.find(s => s.startTime.getTime() === slotEndTime);
  
  return Boolean(nextSlot && nextSlot.isAvailable);
} 