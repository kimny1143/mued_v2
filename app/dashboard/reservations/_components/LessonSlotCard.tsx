'use client';

import React, { useState, useMemo } from 'react';
import { format, addHours, differenceInHours } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ClockIcon, Loader2Icon } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';

interface LessonSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  hourlyRate?: number;
  currency?: string;
  minHours?: number;
  maxHours?: number;
  teacher?: {
    id: string;
    name: string;
    image?: string | null;
  };
  mentorName?: string;
  price?: number;
  isAvailable: boolean;
}

// 予約時間帯の型定義
interface TimeSlot {
  startTime: Date;
  endTime: Date;
  hours: number;
  label: string;
}

interface LessonSlotCardProps {
  slot: LessonSlot;
  onReserve: (slotId: string, hoursBooked?: number, selectedTimeSlot?: TimeSlot) => void;
  isProcessing?: boolean;
}

export const LessonSlotCard: React.FC<LessonSlotCardProps> = ({
  slot,
  onReserve,
  isProcessing = false,
}) => {
  // 予約時間設定
  const [hoursBooked, setHoursBooked] = useState<number>(slot.minHours || 1);
  
  // 選択した時間帯
  const [selectedTimeSlotIndex, setSelectedTimeSlotIndex] = useState<number>(0);
  
  // 利用可能な時間枠を計算
  const maxAvailableHours = slot.maxHours || differenceInHours(
    new Date(slot.endTime), 
    new Date(slot.startTime)
  );
  const minRequiredHours = slot.minHours || 1;
  
  // 選択可能な時間数の配列を作成
  const availableHours = Array.from(
    { length: maxAvailableHours - minRequiredHours + 1 },
    (_, i) => minRequiredHours + i
  );
  
  // 時間単価
  const hourlyRate = slot.hourlyRate || 5000;
  const currency = slot.currency || 'JPY';
  
  // 合計金額
  const totalAmount = hourlyRate * hoursBooked;
  
  // 利用可能な時間帯の選択肢を生成
  const availableTimeSlots = useMemo(() => {
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);
    const totalSlotHours = differenceInHours(endTime, startTime);
    
    // 選択した時間数に応じた時間帯の選択肢を生成
    const slots: TimeSlot[] = [];
    
    for (let i = 0; i <= totalSlotHours - hoursBooked; i++) {
      const slotStart = new Date(startTime);
      slotStart.setHours(startTime.getHours() + i);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotStart.getHours() + hoursBooked);
      
      // スロット終了時間がレッスン終了時間を超えないことを確認
      if (slotEnd <= endTime) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          hours: hoursBooked,
          label: `${format(slotStart, 'HH:mm', { locale: ja })} - ${format(slotEnd, 'HH:mm', { locale: ja })}`
        });
      }
    }
    
    return slots;
  }, [slot.startTime, slot.endTime, hoursBooked]);
  
  // 時間数が変更されたら、時間帯の選択をリセット
  React.useEffect(() => {
    setSelectedTimeSlotIndex(0);
  }, [hoursBooked]);
  
  // 現在選択中の時間帯
  const selectedTimeSlot = availableTimeSlots[selectedTimeSlotIndex];
  
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
            ¥{hourlyRate.toLocaleString()}/時間
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            予約可能
          </Badge>
          
          <div className="w-full mt-2">
            <Label htmlFor={`hours-${slot.id}`} className="text-sm mb-1 block">
              予約時間
            </Label>
            <Select
              value={hoursBooked.toString()}
              onValueChange={(value) => setHoursBooked(parseInt(value, 10))}
              disabled={isProcessing}
            >
              <SelectTrigger id={`hours-${slot.id}`} className="w-full">
                <SelectValue placeholder="予約時間を選択" />
              </SelectTrigger>
              <SelectContent>
                {availableHours.map((hours) => (
                  <SelectItem key={hours} value={hours.toString()}>
                    {hours}時間
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 時間帯選択 */}
          {availableTimeSlots.length > 0 && (
            <div className="w-full mt-2">
              <Label htmlFor={`timeslot-${slot.id}`} className="text-sm mb-1 block">
                時間帯
              </Label>
              <Select
                value={selectedTimeSlotIndex.toString()}
                onValueChange={(value) => setSelectedTimeSlotIndex(parseInt(value, 10))}
                disabled={isProcessing}
              >
                <SelectTrigger id={`timeslot-${slot.id}`} className="w-full">
                  <SelectValue placeholder="時間帯を選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.map((timeSlot, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {timeSlot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="text-sm font-medium mt-1">
            合計: ¥{totalAmount.toLocaleString()}
          </div>
          
          <Button
            variant="default"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onReserve(
              slot.id, 
              hoursBooked,
              selectedTimeSlot // 選択した時間帯情報を送信
            )}
            disabled={isProcessing || !slot.isAvailable || !selectedTimeSlot}
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