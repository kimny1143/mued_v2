'use client';

import { addMinutes, format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatJst } from '@/lib/utils/timezone';
import { Clock } from 'lucide-react';
import React from 'react';

import { Button } from '@/app/components/ui/button';

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  hourlyRate?: number;
}

interface TimeSlotDisplayProps {
  selectedDate: Date | null;
  timeSlots: TimeSlot[];
  onTimeSlotSelect: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot | null;
  showDateHeading?: boolean;
}

// スロットの時間範囲内で30分単位の開始時間選択肢を生成
function generateTimeOptions(slot: TimeSlot): Array<{startTime: Date, label: string}> {
  const options: Array<{startTime: Date, label: string}> = [];
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);
  
  // 最低1時間は確保する（開始時間は終了時間の1時間前まで）
  const maxStartTime = new Date(endTime.getTime() - 60 * 60 * 1000);
  
  let currentTime = new Date(startTime);
  
  while (currentTime <= maxStartTime) {
    const label = formatJst(currentTime, 'HH:mm');
    options.push({
      startTime: new Date(currentTime),
      label: label
    });
    
    // 30分追加
    currentTime = addMinutes(currentTime, 30);
  }
  
  return options;
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
    console.log('例:', filteredTimeSlots.map(slot => formatJst(slot.startTime, 'HH:mm')));
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
        <h3 className="text-lg font-medium mb-4" id="timeslot-heading">{formattedDate}</h3>
      )}
      
      <div aria-labelledby={showDateHeading ? "timeslot-heading" : undefined} role="region">
        {filteredTimeSlots.length > 0 ? (
          <div className="space-y-4">
            {filteredTimeSlots.map((slot) => {
              const timeOptions = generateTimeOptions(slot);
              const slotEndTime = formatJst(slot.endTime, 'HH:mm');
              const hourlyRate = slot.hourlyRate || 5000; // デフォルト料金
              
              // デバッグ用に追加
              console.log('slot.startTime文字列:', slot.startTime);
              console.log('Dateオブジェクト:', new Date(slot.startTime));
              console.log('表示時刻:', formatJst(slot.startTime, 'HH:mm'));

              return (
                <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900">
                      空き時間: {formatJst(slot.startTime, 'HH:mm')} 〜 {slotEndTime}
                    </h4>
                    <div className="text-sm text-gray-600">
                      ¥{hourlyRate.toLocaleString()}/時間
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">開始時間を選択してください：</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {timeOptions.map((option, index) => {
                        const isSelected = selectedSlot && 
                          selectedSlot.id === slot.id && 
                          selectedSlot.startTime.getTime() === option.startTime.getTime();
                        
                        return (
                          <Button
                            key={index}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={`h-auto py-2 ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
                            onClick={() => {
                              // 選択された開始時間でTimeSlotオブジェクトを更新
                              const updatedSlot: TimeSlot = {
                                ...slot,
                                startTime: option.startTime,
                                // 終了時間は元のスロットの終了時間のまま（講師の裁量）
                              };
                              onTimeSlotSelect(updatedSlot);
                            }}
                            aria-label={`${option.label}から開始`}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {selectedSlot && selectedSlot.id === slot.id && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>選択済み:</strong> {formatJst(selectedSlot.startTime, 'HH:mm')}開始 
                        （終了時間は講師と相談して決定）
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        料金: ¥{hourlyRate.toLocaleString()}/時間
                      </p>
                    </div>
                  )}
                </div>
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
    </div>
  );
};

export default TimeSlotDisplay; 