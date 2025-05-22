'use client';

import React from 'react';
import { addMinutes, format, isSameDay } from 'date-fns';
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
  showDateHeading?: boolean;
}

export const TimeSlotDisplay: React.FC<TimeSlotDisplayProps> = ({
  selectedDate,
  timeSlots,
  onTimeSlotSelect,
  selectedSlot,
  showDateHeading = true,
}) => {
  // 選択された日付に対応する時間枠のみをフィルタリング
  const filteredTimeSlots = selectedDate
    ? timeSlots.filter(
        slot => {
          const slotStartTime = new Date(slot.startTime);
          return isSameDay(slotStartTime, selectedDate) && slot.isAvailable;
        }
      )
    : [];

  console.log(`${selectedDate?.toDateString()} のスロット数: ${filteredTimeSlots.length}件`);
  if (filteredTimeSlots.length > 0) {
    console.log('例:', filteredTimeSlots.map(slot => format(new Date(slot.startTime), 'HH:mm')));
  }

  const formattedDate = selectedDate
    ? format(selectedDate, 'yyyy年MM月dd日 (EEEE)', { locale: ja })
    : '';

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
      {showDateHeading && (
        <h3 className="text-lg font-medium mb-2" id="timeslot-heading">{formattedDate}</h3>
      )}
      
      <div aria-labelledby={showDateHeading ? "timeslot-heading" : undefined} role="region">
        {filteredTimeSlots.length > 0 ? (
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
            role="radiogroup"
            aria-label="予約可能な時間枠"
          >
            {filteredTimeSlots.map((slot) => {
              const startTime = format(new Date(slot.startTime), 'HH:mm');
              const endTime = format(new Date(slot.endTime), 'HH:mm');
              
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
              選択された日に空き時間がありません。別の日をお試しください。
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