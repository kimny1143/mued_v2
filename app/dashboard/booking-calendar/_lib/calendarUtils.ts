import { format, startOfMonth, endOfMonth, addMonths, addDays, isSameDay } from 'date-fns';
import { TimeSlot } from '../_components/TimeSlotDisplay';

export interface ApiTimeSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

// レッスンスロットの型定義を追加
export interface LessonSlot {
  id?: string;
  startTime: string | Date;
  endTime: string | Date;
  isAvailable?: boolean;
}

/**
 * メンターの利用可能時間枠を取得する
 * @param mentorId メンターのID
 * @param fromDate 開始日
 * @param toDate 終了日
 * @param availableSlots メンターの利用可能スロット（オプション）
 */
export async function fetchMentorAvailability(
  mentorId: string,
  fromDate: Date,
  toDate: Date,
  availableSlots?: LessonSlot[]
): Promise<TimeSlot[]> {
  try {
    console.log('メンター時間枠取得開始:', { mentorId, fromDate: fromDate.toISOString(), toDate: toDate.toISOString() });
    
    // availableSlotsが渡されている場合は、それを使用
    if (availableSlots && availableSlots.length > 0) {
      console.log(`渡されたスロット数: ${availableSlots.length}`);
      
      // 日付範囲でフィルタリング
      const filteredSlots = availableSlots.filter(slot => {
        const slotStart = new Date(slot.startTime);
        return slotStart >= fromDate && slotStart <= toDate;
      });
      
      console.log(`日付範囲内のスロット数: ${filteredSlots.length}`);
      
      // TimeSlot形式に変換
      const slots: TimeSlot[] = filteredSlots.map(slot => ({
        id: slot.id || `slot-${mentorId}-${slot.startTime}`,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
        isAvailable: slot.isAvailable !== false // デフォルトはtrue
      }));
      
      const sortedSlots = slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      // 最初と最後のスロットをログ出力
      if (sortedSlots.length > 0) {
        console.log('最初のスロット:', {
          date: format(sortedSlots[0].startTime, 'yyyy/MM/dd'),
          start: format(sortedSlots[0].startTime, 'HH:mm'),
          end: format(sortedSlots[0].endTime, 'HH:mm')
        });
        
        console.log('最後のスロット:', {
          date: format(sortedSlots[sortedSlots.length - 1].startTime, 'yyyy/MM/dd'),
          start: format(sortedSlots[sortedSlots.length - 1].startTime, 'HH:mm'),
          end: format(sortedSlots[sortedSlots.length - 1].endTime, 'HH:mm')
        });
        
        // 日付ごとのスロット数を集計
        const dateCountMap = new Map<string, number>();
        sortedSlots.forEach(slot => {
          const dateKey = format(slot.startTime, 'yyyy/MM/dd');
          dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
        });
        
        console.log('日付ごとのスロット数:', Object.fromEntries(dateCountMap));
      }
      
      return sortedSlots;
    }
    
    // availableSlotsが渡されていない場合のフォールバック
    console.warn('利用可能スロットが渡されていません。空の配列を返します。');
    return [];
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
  const reserved = timeSlots
    .filter(slot => !slot.isAvailable)
    .map(slot => ({
      startDate: new Date(slot.startTime),
      endDate: new Date(slot.endTime)
    }));
  
  console.log(`予約済みスロット数: ${reserved.length}`);
  return reserved;
}

/**
 * 特定の日付に予約可能な時間枠があるかチェック
 */
export function hasAvailableSlotsOnDate(timeSlots: TimeSlot[], date: Date): boolean {
  const result = timeSlots.some(slot => {
    const slotDate = new Date(slot.startTime);
    return isSameDay(slotDate, date) && slot.isAvailable;
  });
  
  return result;
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