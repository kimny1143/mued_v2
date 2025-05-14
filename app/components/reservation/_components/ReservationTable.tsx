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
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Reservation = {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentId?: string;
  paymentStatus?: 'UNPAID' | 'PROCESSING' | 'PAID' | 'REFUNDED' | 'FAILED'; 
  createdAt: string | Date;
  updatedAt?: string | Date;
};

interface ReservationTableProps {
  lessonSlots: LessonSlot[];
  onReserve: (slotId: string) => Promise<void>;
}

// 通貨フォーマット関数
function formatCurrency(amount: number, currency = 'usd'): string {
  if (!amount) return '0';
  
  // 単位を修正（センント -> 実際の通貨単位）
  const actualAmount = amount / 100;
  
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
              <TableCell className="text-right">{formatCurrency(slot.price || 5000, slot.currency || 'usd')}</TableCell>
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