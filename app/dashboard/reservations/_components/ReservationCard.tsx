'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { CancelReservationModal } from './CancelReservationModal';
import { CancelReason } from '@/lib/types/reservation';

interface ReservationCardProps {
  reservation: {
    id: string;
    status: string;
    bookedStartTime: Date;
    bookedEndTime: Date;
    totalAmount: number;
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
  onCancel: (id: string, reason: CancelReason, notes?: string) => Promise<void>;
  userRole: 'student' | 'mentor' | 'admin';
}

export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onCancel,
  userRole,
}) => {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancelClick = () => {
    setIsCancelModalOpen(true);
  };

  const handleCancelConfirm = async (reason: CancelReason, notes?: string) => {
    setIsLoading(true);
    try {
      await onCancel(reservation.id, reason, notes);
      setIsCancelModalOpen(false);
    } catch (error) {
      console.error('キャンセル処理エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };
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
              onClick={handleCancelClick}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isLoading ? '処理中...' : 'キャンセル'}
            </Button>
          )}
        </div>
      </div>

      {/* キャンセルモーダル */}
      <CancelReservationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        reservation={{
          id: reservation.id,
          bookedStartTime: reservation.bookedStartTime,
          bookedEndTime: reservation.bookedEndTime,
          totalAmount: reservation.totalAmount,
          teacher: {
            name: reservation.lessonSlot.teacher.name,
          },
        }}
        userRole={userRole}
        isLoading={isLoading}
      />
    </Card>
  );
}; 