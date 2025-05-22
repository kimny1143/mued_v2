'use client';

import React from 'react';
import { addMinutes, format } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { ja } from 'date-fns/locale';
import { Clock } from 'lucide-react';

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
}

interface TimeSlotDisplayProps {
  selectedDate: Date | null;
  timeSlots: TimeSlot[];
  onTimeSlotSelect: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot | null;
  lessonDuration: 60 | 90;
  onLessonDurationChange: (duration: 60 | 90) => void;
}

export const TimeSlotDisplay: React.FC<TimeSlotDisplayProps> = ({
  selectedDate,
  timeSlots,
  onTimeSlotSelect,
  selectedSlot,
  lessonDuration,
  onLessonDurationChange,
}) => {
  // 選択された日付に対応する時間枠のみをフィルタリング
  const filteredTimeSlots = selectedDate
    ? timeSlots.filter(
        slot =>
          slot.startTime.toDateString() === selectedDate.toDateString() &&
          slot.isAvailable
      )
    : [];

  const formattedDate = selectedDate
    ? format(selectedDate, 'yyyy年MM月dd日 (EEEE)', { locale: ja })
    : '';

  // 60分授業の場合と90分授業の場合でフィルタリングロジックを分ける
  const getAvailableSlots = (duration: 60 | 90) => {
    if (duration === 60) {
      // 60分枠はそのまま表示
      return filteredTimeSlots;
    } else {
      // 90分枠は、連続する2つの60分枠が必要（簡易的な実装）
      return filteredTimeSlots.filter((slot, index) => {
        if (index === filteredTimeSlots.length - 1) return false;
        
        const nextSlot = filteredTimeSlots[index + 1];
        const slotEnd = new Date(slot.endTime);
        const nextStart = new Date(nextSlot.startTime);
        
        // 連続した時間枠かどうかチェック
        return slotEnd.getTime() === nextStart.getTime();
      });
    }
  };

  const availableSlots = getAvailableSlots(lessonDuration);

  if (!selectedDate) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg" aria-live="polite">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" aria-hidden="true" />
        <p className="text-gray-500">カレンダーから日付を選択して、利用可能な時間枠を確認してください</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium mb-2" id="timeslot-heading">{formattedDate}</h3>
      
      <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-labelledby="duration-heading">
        <span id="duration-heading" className="sr-only">レッスン時間を選択</span>
        <Button
          variant={lessonDuration === 60 ? "default" : "outline"}
          size="sm"
          onClick={() => onLessonDurationChange(60)}
          aria-pressed={lessonDuration === 60}
          className="flex-1 sm:flex-none min-w-[110px]"
        >
          60分レッスン
        </Button>
        <Button
          variant={lessonDuration === 90 ? "default" : "outline"}
          size="sm"
          onClick={() => onLessonDurationChange(90)}
          aria-pressed={lessonDuration === 90}
          className="flex-1 sm:flex-none min-w-[110px]"
        >
          90分レッスン
        </Button>
      </div>
      
      <div aria-labelledby="timeslot-heading" role="region">
        {availableSlots.length > 0 ? (
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
            role="radiogroup"
            aria-label="予約可能な時間枠"
          >
            {availableSlots.map((slot) => {
              const startTime = format(slot.startTime, 'HH:mm');
              const endTime = format(
                lessonDuration === 90
                  ? addMinutes(slot.startTime, 90)
                  : slot.endTime,
                'HH:mm'
              );
              
              const isSelected = selectedSlot && selectedSlot.id === slot.id;
              const timeLabel = `${startTime}から${endTime}まで`;
              
              return (
                <Button
                  key={slot.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-auto py-3 ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
                  onClick={() => onTimeSlotSelect(slot)}
                  role="radio"
                  aria-checked={isSelected ? true : false}
                  aria-label={timeLabel}
                  tabIndex={isSelected ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onTimeSlotSelect(slot);
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="font-medium">{startTime}</div>
                    <div className="text-xs">〜 {endTime}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-lg" aria-live="polite">
            <p className="text-gray-500">
              {lessonDuration === 90
                ? '選択された日に90分の空き時間がありません。60分レッスンをお試しください。'
                : '選択された日に空き時間がありません。別の日をお試しください。'}
            </p>
          </div>
        )}
      </div>
      
      {/* モバイル向け固定予約ボタン - 時間枠が選択された場合 */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:hidden z-10">
          <Button className="w-full" size="lg">
            予約に進む
          </Button>
        </div>
      )}
    </div>
  );
};

export default TimeSlotDisplay; 