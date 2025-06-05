'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { CancelReason } from '@/lib/types/reservation';

interface CancelReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: CancelReason, notes?: string) => Promise<void>;
  reservation: {
    id: string;
    bookedStartTime: Date;
    bookedEndTime: Date;
    totalAmount: number;
    teacher: {
      name: string;
    };
  };
  userRole: 'student' | 'mentor' | 'admin';
  isLoading?: boolean;
}

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  reservation,
  userRole,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<CancelReason | ''>('');
  const [notes, setNotes] = useState('');
  const [cancellationFee, setCancellationFee] = useState<number>(0);
  const [timeUntilDeadline, setTimeUntilDeadline] = useState<string>('');

  // ユーザーロール別のキャンセル理由オプション
  const getCancelReasonOptions = () => {
    const baseOptions = [
      { value: CancelReason.EMERGENCY, label: '緊急事態' },
    ];

    if (userRole === 'student') {
      return [
        { value: CancelReason.STUDENT_REQUEST, label: '生徒都合' },
        ...baseOptions,
      ];
    } else if (userRole === 'mentor') {
      return [
        { value: CancelReason.MENTOR_REQUEST, label: '講師都合' },
        ...baseOptions,
      ];
    } else {
      return [
        { value: CancelReason.ADMIN_REQUEST, label: '管理者判断' },
        { value: CancelReason.SYSTEM_ERROR, label: 'システムエラー' },
        ...baseOptions,
      ];
    }
  };

  // キャンセル料を計算（簡易版）
  const calculateCancellationFee = (reason: CancelReason) => {
    const now = new Date();
    const lessonStart = new Date(reservation.bookedStartTime);
    const hoursUntilLesson = (lessonStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 管理者と緊急事態は無料
    if (userRole === 'admin' || reason === CancelReason.EMERGENCY) {
      return 0;
    }

    // 生徒の場合：24時間前を過ぎていたら100%
    if (userRole === 'student' && hoursUntilLesson < 24) {
      return reservation.totalAmount;
    }

    // 講師の場合：2時間前を過ぎていたら50%
    if (userRole === 'mentor' && hoursUntilLesson < 2) {
      return Math.floor(reservation.totalAmount * 0.5);
    }

    return 0;
  };

  // 期限までの時間を計算
  const calculateTimeUntilDeadline = () => {
    const now = new Date();
    const lessonStart = new Date(reservation.bookedStartTime);
    const hoursUntilLesson = (lessonStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    let deadlineHours = 0;
    if (userRole === 'student') {
      deadlineHours = 24;
    } else if (userRole === 'mentor') {
      deadlineHours = 2;
    }

    const timeUntilDeadline = hoursUntilLesson - deadlineHours;
    
    if (timeUntilDeadline > 0) {
      const hours = Math.floor(timeUntilDeadline);
      const minutes = Math.floor((timeUntilDeadline - hours) * 60);
      return `${hours}時間${minutes}分`;
    } else {
      return '期限を過ぎています';
    }
  };

  // 理由が選択されたときの処理
  const handleReasonChange = (reason: CancelReason) => {
    setSelectedReason(reason);
    const fee = calculateCancellationFee(reason);
    setCancellationFee(fee);
    setTimeUntilDeadline(calculateTimeUntilDeadline());
  };

  // キャンセル確定処理
  const handleConfirm = async () => {
    if (!selectedReason) return;
    
    try {
      await onConfirm(selectedReason as CancelReason, notes || undefined);
      // 成功時はモーダルを閉じる
      onClose();
      setSelectedReason('');
      setNotes('');
      setCancellationFee(0);
    } catch (error) {
      // エラーハンドリングは親コンポーネントで行う
      console.error('キャンセル処理エラー:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            レッスンキャンセル
          </DialogTitle>
          <DialogDescription>
            以下のレッスンをキャンセルしますか？この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        {/* 予約詳細 */}
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">予約詳細</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">講師:</span>
                <span>{reservation.teacher.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">日時:</span>
                <span>
                  {format(reservation.bookedStartTime, 'yyyy年M月d日(E) HH:mm', { locale: ja })} - 
                  {format(reservation.bookedEndTime, 'HH:mm', { locale: ja })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">料金:</span>
                <span>{formatCurrency(reservation.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* キャンセル理由選択 */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">キャンセル理由 *</Label>
            <Select value={selectedReason} onValueChange={handleReasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="理由を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {getCancelReasonOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 詳細メモ */}
          <div className="space-y-2">
            <Label htmlFor="notes">詳細・備考（任意）</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="キャンセルの詳細や理由を入力してください..."
              rows={3}
            />
          </div>

          {/* キャンセル料情報 */}
          {selectedReason && (
            <div className={`p-4 rounded-lg border ${cancellationFee > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">キャンセル料:</span>
                    <span className={`font-bold ${cancellationFee > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(cancellationFee)}
                    </span>
                  </div>
                  {cancellationFee > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span>返金額:</span>
                      <span className="text-green-600">
                        {formatCurrency(reservation.totalAmount - cancellationFee)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                    <Clock className="h-3 w-3" />
                    <span>無料キャンセル期限まで: {timeUntilDeadline}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 注意事項 */}
          <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
              <div className="text-sm">
                <ul className="list-disc list-inside space-y-1">
                  <li>キャンセル後の予約復旧はできません</li>
                  <li>返金処理は管理者が手動で行います（2-3営業日）</li>
                  <li>キャンセル料が発生する場合があります</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            戻る
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || isLoading}
          >
            {isLoading ? '処理中...' : 'キャンセル実行'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 