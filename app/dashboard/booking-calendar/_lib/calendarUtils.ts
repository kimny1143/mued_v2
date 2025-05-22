import { format, startOfMonth, endOfMonth, addMonths, addDays } from 'date-fns';
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
    // 実際の実装ではAPIから取得。ここではダミーデータを生成
    const slots: TimeSlot[] = [];
    const currentDate = new Date(fromDate);
    let checkDate = new Date(currentDate);
    
    // 開始日から終了日まで、ランダムな時間枠を生成
    while (checkDate <= toDate) {
      // 平日のみスロットを生成（0=日曜日, 6=土曜日）
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        // 1日あたり0〜3の予約枠をランダム生成
        const slotsPerDay = Math.floor(Math.random() * 4);
        
        for (let i = 0; i < slotsPerDay; i++) {
          // 9時〜17時の間でランダムな開始時間を設定
          const hour = 9 + Math.floor(Math.random() * 8);
          const startTime = new Date(checkDate);
          startTime.setHours(hour, 0, 0, 0);
          
          // 終了時間は開始から1時間後
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);
          
          slots.push({
            id: `slot-${mentorId}-${startTime.toISOString()}`,
            startTime,
            endTime,
            isAvailable: true
          });
        }
      }
      
      // 次の日に進む
      const nextDate = new Date(checkDate);
      nextDate.setDate(nextDate.getDate() + 1);
      checkDate = nextDate;
    }
    
    return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  } catch (error) {
    console.error('メンター利用可能時間取得エラー:', error);
    return [];
  }
}

/**
 * デフォルトのカレンダー表示範囲を取得する（現在の月とその前後１ヶ月）
 */
export function getDefaultDateRange(currentDate: Date) {
  // 月の最初と最後の日付を取得
  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  
  // 翌月の10日までを含める（翌月の予定も見られるように）
  const extendedEndDate = addDays(lastDay, 10);
  
  return {
    from: firstDay,
    to: extendedEndDate
  };
}

/**
 * カレンダーの予約済み日付を取得する形式に変換
 */
export function convertToReservedDates(timeSlots: TimeSlot[]) {
  // 予約済みの日付データを適切な形式に変換
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