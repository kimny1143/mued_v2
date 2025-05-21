'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Label } from '@ui/label';
import { LessonSlot, convertToLessonSlotType } from './ReservationTable';
import { Loader2 } from 'lucide-react';
import { generateAvailableTimeSlots } from '@/lib/utils';

// TimeSlot型定義を追加
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  hours: number;
  label: string;
}

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: LessonSlot | null;
  selectedTimeSlot?: TimeSlot | null; // 選択された時間帯
  availableTimeSlots?: TimeSlot[]; // 利用可能な時間帯の配列
  onConfirm: () => Promise<void>;
  onTimeSlotSelect?: (timeSlot: TimeSlot) => void; // 時間帯選択時のコールバック
  isLoading?: boolean;
}

// 通貨フォーマット関数
function formatCurrency(amount: number, currency = 'usd'): string {
  if (!amount) return '0';
  
  // 日本円の場合は分割しない、その他の通貨は100で割る（セント→ドル等）
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

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  slot,
  selectedTimeSlot: initialSelectedTimeSlot,
  availableTimeSlots: externalTimeSlots,
  onConfirm,
  onTimeSlotSelect,
  isLoading = false,
}) => {
  const [selectedTimeSlotIndex, setSelectedTimeSlotIndex] = useState<number>(0);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(initialSelectedTimeSlot || null);
  
  // スロットが変更されたら利用可能な時間帯を計算
  useEffect(() => {
    if (slot) {
      // 外部から時間枠が渡された場合はそれを使用
      if (externalTimeSlots && externalTimeSlots.length > 0) {
        setAvailableTimeSlots(externalTimeSlots);
        
        // 初期選択された時間枠がある場合
        if (initialSelectedTimeSlot) {
          setSelectedTimeSlot(initialSelectedTimeSlot);
          // 選択された時間枠のインデックスを探す
          const index = externalTimeSlots.findIndex(ts => 
            ts.startTime.getTime() === initialSelectedTimeSlot.startTime.getTime() && 
            ts.endTime.getTime() === initialSelectedTimeSlot.endTime.getTime()
          );
          if (index >= 0) {
            setSelectedTimeSlotIndex(index);
          }
        } else {
          // デフォルトで最初の時間枠を選択
          setSelectedTimeSlot(externalTimeSlots[0]);
          setSelectedTimeSlotIndex(0);
        }
      } else {
        // 利用可能な時間枠を生成（型変換を行う）
        const slotForUtil = convertToLessonSlotType(slot);
        const timeSlots = generateAvailableTimeSlots(slotForUtil);
        setAvailableTimeSlots(timeSlots);
        
        if (timeSlots.length > 0) {
          // デフォルトで最初の時間枠を選択
          setSelectedTimeSlot(timeSlots[0]);
          setSelectedTimeSlotIndex(0);
        }
      }
    }
  }, [slot, externalTimeSlots, initialSelectedTimeSlot]);
  
  // 時間帯選択が変更されたときのハンドラー
  const handleTimeSlotChange = (value: string) => {
    const index = parseInt(value, 10);
    setSelectedTimeSlotIndex(index);
    
    const selected = availableTimeSlots[index];
    setSelectedTimeSlot(selected);
    
    // コールバックがある場合は呼び出す
    if (onTimeSlotSelect) {
      onTimeSlotSelect(selected);
    }
  };
  
  const handleConfirm = async () => {
    if (isLoading) return;
    
    try {
      await onConfirm();
      // onConfirm内でモーダルを閉じるため、ここでは何もしない
    } catch (error) {
      console.error('予約確定エラー:', error);
      // エラー処理はonConfirm内で行う
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'yyyy年M月d日', { locale: ja });
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: ja });
  };

  // slotがnullの場合は何も表示しない
  if (!slot) return null;
  
  // 予約時間と料金の計算
  const hourlyRate = slot.hourlyRate || (slot.price || 5000);
  
  // 選択された時間帯から時間数と金額を計算
  const hoursBooked = selectedTimeSlot ? selectedTimeSlot.hours : (slot.hoursBooked || 1);
  const totalAmount = hourlyRate * hoursBooked;
  const taxAmount = Math.floor(totalAmount * 0.1); // 10%の消費税
  const totalWithTax = totalAmount + taxAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>レッスン予約の確認</DialogTitle>
          <DialogDescription>
            以下の内容でレッスンを予約します。決済後に予約が確定します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">日付:</span>
            <span className="col-span-4 text-sm">{formatDate(new Date(slot.startTime))}</span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">レッスン枠:</span>
            <span className="col-span-4 text-sm">
              {formatTime(new Date(slot.startTime))} - {formatTime(new Date(slot.endTime))}
            </span>
          </div>
          
          {/* 時間帯選択 */}
          {availableTimeSlots.length > 0 && (
            <div className="grid grid-cols-5 items-center gap-4">
              <Label htmlFor="timeSlot" className="col-span-1 font-medium text-sm">
                予約時間帯:
              </Label>
              <div className="col-span-4">
                <Select
                  value={selectedTimeSlotIndex.toString()}
                  onValueChange={handleTimeSlotChange}
                  disabled={isLoading || availableTimeSlots.length <= 1}
                >
                  <SelectTrigger id="timeSlot" className="w-full">
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
            </div>
          )}
          
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">メンター:</span>
            <span className="col-span-4 text-sm">{slot.teacher ? slot.teacher.name : slot.mentorName}</span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">時間単価:</span>
            <span className="col-span-4 text-sm">
              {formatCurrency(hourlyRate, slot.currency || 'jpy')} / 時間
            </span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">小計:</span>
            <span className="col-span-4 text-sm">
              {formatCurrency(totalAmount, slot.currency || 'jpy')}
            </span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">消費税:</span>
            <span className="col-span-4 text-sm">
              {formatCurrency(taxAmount, slot.currency || 'jpy')} (10%)
            </span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">合計金額:</span>
            <span className="col-span-4 text-sm font-bold">
              {formatCurrency(totalWithTax, slot.currency || 'jpy')}
            </span>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !selectedTimeSlot}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              '決済に進む'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 