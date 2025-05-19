'use client';

import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Reservation } from '@prisma/client';

interface ReservationCardProps {
  reservation: Reservation & {
    lessonSlot: {
      id: string;
      startTime: Date;
      endTime: Date;
      teacher: {
        id: string;
        name: string;
        image: string | null;
      };
    };
  };
  onCancel: (id: string) => Promise<void>;
}

export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onCancel,
}) => {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {reservation.lessonSlot.teacher.name || '講師情報なし'}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(reservation.lessonSlot.startTime), 'yyyy年M月d日', { locale: ja })}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <ClockIcon className="h-3 w-3" />
            {format(new Date(reservation.lessonSlot.startTime), 'HH:mm', { locale: ja })} - 
            {format(new Date(reservation.lessonSlot.endTime), 'HH:mm', { locale: ja })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {reservation.status === 'CONFIRMED' ? '予約済み' : '完了'}
          </Badge>
          {reservation.status === 'CONFIRMED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(reservation.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              キャンセル
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}; 