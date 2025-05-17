'use client';

import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ClockIcon, Loader2Icon } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

interface LessonSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  teacher?: {
    id: string;
    name: string;
    image: string | null;
  };
  mentorName?: string;
  price?: number;
  isAvailable: boolean;
}

interface LessonSlotCardProps {
  slot: LessonSlot;
  onReserve: (id: string) => Promise<void>;
  isProcessing?: boolean;
}

export const LessonSlotCard: React.FC<LessonSlotCardProps> = ({
  slot,
  onReserve,
  isProcessing = false,
}) => {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {slot.teacher?.name || slot.mentorName || '講師情報なし'}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(slot.startTime), 'yyyy年M月d日', { locale: ja })}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <ClockIcon className="h-3 w-3" />
            {format(new Date(slot.startTime), 'HH:mm', { locale: ja })} - 
            {format(new Date(slot.endTime), 'HH:mm', { locale: ja })}
          </div>
          <div className="text-sm mt-1">
            {slot.price ? `¥${slot.price.toLocaleString()}` : '¥5,000'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            予約可能
          </Badge>
          <Button
            variant="default"
            size="sm"
            onClick={() => onReserve(slot.id)}
            disabled={isProcessing || !slot.isAvailable}
          >
            {isProcessing ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              '予約する'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}; 