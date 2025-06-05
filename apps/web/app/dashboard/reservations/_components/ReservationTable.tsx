'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import React, { useState } from 'react';


import { ReservationType, LessonSlotType } from '@/lib/utils';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@ui/table';

import { ReservationModal } from './ReservationModal';

export type Teacher = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type LessonSlot = {
  id: string;
  startTime: string | Date;  // API returns string, converted to Date in components
  endTime: string | Date;    // API returns string, converted to Date in components
  teacherId: string;
  teacher?: Teacher;       // Included when using API's include option
  mentorName?: string;     // For backward compatibility with mock data
  isAvailable: boolean;    // API uses isAvailable instead of available
  price?: number;          // レッスン価格（StripeのAPI価格）
  currency?: string;       // 通貨コード（usd、jpyなど）
  priceId?: string;        // Stripe価格ID
  reservations?: Reservation[];
  hourlySlots?: {          // 1時間単位の予約状況
    startTime: Date;
    endTime: Date;
    isReserved: boolean;
    reservationId?: string;
  }[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  hourlyRate?: number;     // 時間単価
  minHours?: number;       // 最小予約時間
  maxHours?: number;       // 最大予約時間
  hoursBooked?: number;    // 予約時間数（ユーザーが選択）
};

export type Reservation = {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
  paymentId?: string;
  bookedStartTime?: string | Date; // 追加：予約開始時間
  bookedEndTime?: string | Date;   // 追加：予約終了時間
  createdAt: string | Date;
  updatedAt?: string | Date;
};

// LessonSlotType型への変換関数
export function convertToLessonSlotType(slot: LessonSlot): LessonSlotType {
  return {
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    teacherId: slot.teacherId,
    isAvailable: slot.isAvailable,
    reservations: slot.reservations?.map(convertToReservationType) || [],
    hourlyRate: slot.hourlyRate
  };
}

// ReservationType型への変換関数
export function convertToReservationType(reservation: Reservation): ReservationType {
  return {
    id: reservation.id,
    bookedStartTime: reservation.bookedStartTime || reservation.createdAt,
    bookedEndTime: reservation.bookedEndTime || reservation.createdAt,
    status: reservation.status
  };
}

interface ReservationTableProps {
  lessonSlots: LessonSlot[];
  onReserve: (slotId: string) => Promise<void>;
}

// 通貨フォーマット関数
function formatCurrency(amount: number, currency = 'usd'): string {
  if (!amount) return '0';
  
  // 日本円の場合は分割しない、その他の通貨は100で割る
  const actualAmount = currency.toLowerCase() === 'jpy' ? amount : amount / 100;
  
  // 通貨シンボルの設定
  const currencySymbols: Record<string, string> = {
    usd: '$',
    jpy: '¥',
    eur: '€',
    gbp: '£',
  };
  
  const symbol = currencySymbols[currency.toLowerCase()] || currency.toUpperCase();
  
  // 通貨記号と金額を結合して返す
  return `${symbol}${actualAmount.toLocaleString()}`;
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
                    {format(new Date(slot.startTime), 'yyyy年M月d日', { locale: ja })}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(slot.startTime), 'HH:mm', { locale: ja })} - 
                    {format(new Date(slot.endTime), 'HH:mm', { locale: ja })}
                  </span>
                </div>
              </TableCell>
              <TableCell>{slot.teacher ? slot.teacher.name : slot.mentorName}</TableCell>
              <TableCell>
                {slot.isAvailable ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    空き枠あり
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    予約済み
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(slot.hourlyRate || 5000, slot.currency || 'jpy')}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="default"
                  size="sm"
                  disabled={!slot.isAvailable}
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