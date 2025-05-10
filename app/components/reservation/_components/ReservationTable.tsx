'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ReservationModal } from './ReservationModal';

export type LessonSlot = {
  id: string;
  startTime: Date;
  endTime: Date;
  mentorId: string;
  mentorName: string;
  available: boolean;
  price: number;
};

export type Reservation = {
  id: string;
  lessonSlotId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
};

interface ReservationTableProps {
  lessonSlots: LessonSlot[];
  onReserve: (slotId: string) => Promise<void>;
}

export const ReservationTable: React.FC<ReservationTableProps> = ({
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

  return (
    <div className="w-full overflow-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">日時</TableHead>
            <TableHead>メンター</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">料金</TableHead>
            <TableHead className="text-right">予約</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessonSlots.map((slot) => (
            <TableRow key={slot.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(slot.startTime, 'yyyy年M月d日', { locale: ja })}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(slot.startTime, 'HH:mm', { locale: ja })} - 
                    {format(slot.endTime, 'HH:mm', { locale: ja })}
                  </span>
                </div>
              </TableCell>
              <TableCell>{slot.mentorName}</TableCell>
              <TableCell>
                {slot.available ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    空き枠あり
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    予約済み
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">¥{slot.price.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="default"
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => handleReserveClick(slot)}
                >
                  予約する
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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