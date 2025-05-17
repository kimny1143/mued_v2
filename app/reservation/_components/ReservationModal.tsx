'use client';

import React from 'react';
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
import { LessonSlot } from './ReservationTable';
import { Loader2 } from 'lucide-react';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: LessonSlot | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

// 通貨フォーマット関数
function formatCurrency(amount: number, currency = 'usd'): string {
  if (!amount) return '0';
  
  // 単位を修正（センット -> 実際の通貨単位）
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

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  slot,
  onConfirm,
  isLoading = false,
}) => {
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
            <span className="col-span-1 font-medium text-sm">時間:</span>
            <span className="col-span-4 text-sm">
              {formatTime(new Date(slot.startTime))} - {formatTime(new Date(slot.endTime))}
            </span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">メンター:</span>
            <span className="col-span-4 text-sm">{slot.teacher ? slot.teacher.name : slot.mentorName}</span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <span className="col-span-1 font-medium text-sm">料金:</span>
            <span className="col-span-4 text-sm font-bold">
              {formatCurrency(slot.price || 5000, slot.currency || 'usd')}
            </span>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
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