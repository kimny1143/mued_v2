'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ChevronRightIcon, UserIcon } from 'lucide-react';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { LessonSlot } from './ReservationTable';
import { ReservationModal } from './ReservationModal';

interface ReservationMobileViewProps {
  lessonSlots: LessonSlot[];
  onReserve: (slotId: string) => Promise<void>;
}

export const ReservationMobileView: React.FC<ReservationMobileViewProps> = ({
  lessonSlots,
  onReserve,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReserveClick = (slot: LessonSlot) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleConfirmReservation = async () => {
    if (selectedSlot) {
      await onReserve(selectedSlot.id);
      setIsModalOpen(false);
    }
  };

  // 日付でグループ化する
  const groupByDate = lessonSlots.reduce<Record<string, LessonSlot[]>>(
    (groups, slot) => {
      const dateKey = format(slot.startTime, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
      return groups;
    },
    {}
  );

  // 日付のキーを取得して並び替え
  const sortedDates = Object.keys(groupByDate).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center">
            <CalendarIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="font-medium">
              {format(new Date(dateKey), 'yyyy年M月d日 (EEE)', { locale: ja })}
            </h3>
          </div>
          <div className="divide-y">
            {groupByDate[dateKey].map(slot => (
              <div 
                key={slot.id} 
                className="p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-gray-800 font-medium">
                      {format(slot.startTime, 'HH:mm', { locale: ja })} - 
                      {format(slot.endTime, 'HH:mm', { locale: ja })}
                    </span>
                    {slot.isAvailable ? (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                        空き枠あり
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                        予約済み
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span>{slot.mentorName}</span>
                  </div>
                  <div className="text-gray-800 mt-1 font-medium">
                    {slot.price ? `¥${slot.price.toLocaleString()}` : '価格未設定'}
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!slot.isAvailable}
                  onClick={() => handleReserveClick(slot)}
                  className="flex items-center"
                >
                  予約する
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedSlot && (
        <ReservationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          slot={selectedSlot}
          onConfirm={handleConfirmReservation}
        />
      )}
    </div>
  );
}; 