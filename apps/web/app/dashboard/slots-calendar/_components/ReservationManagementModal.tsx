'use client';

import { ReservationStatus } from '@prisma/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertTriangle, X, Clock, DollarSign } from 'lucide-react';
import React, { useState, useEffect } from 'react';

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


type ModalMode = 'view' | 'cancel' | 'reschedule' | 'approve' | 'reject';

export interface ReservationManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  reservation: {
    id: string;
    status: ReservationStatus;
    bookedStartTime: Date;
    bookedEndTime: Date;
    totalAmount: number | string;
    notes?: string;
    teacher: { name: string; };
    student?: { name: string; }; // メンター視点の場合
  };
  userRole: 'student' | 'mentor' | 'admin';
  onCancel?: (reason: CancelReason, notes?: string) => Promise<void>;
  onReschedule?: (newStartTime: Date, newEndTime: Date) => Promise<void>;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onModeChange?: (newMode: ModalMode) => void;
  isLoading?: boolean;
}

export const ReservationManagementModal: React.FC<ReservationManagementModalProps> = ({
  isOpen,
  onClose,
  mode,
  reservation,
  userRole,
  onCancel,
  onApprove,
  onReject,
  onModeChange,
  isLoading = false,
}) => {
  // デバッグ用ログ - 予約データの確認
  useEffect(() => {
    if (isOpen) {
      console.log('=== ReservationManagementModal Debug ===');
      console.log('Reservation data:', reservation);
      console.log('totalAmount:', reservation.totalAmount);
      console.log('totalAmount type:', typeof reservation.totalAmount);
      console.log('totalAmount string representation:', String(reservation.totalAmount));
      console.log('totalAmount JSON stringify:', JSON.stringify(reservation.totalAmount));
      console.log('==========================================');
    }
  }, [isOpen, reservation]);

  const [selectedReason, setSelectedReason] = useState<CancelReason | ''>('');
  const [notes, setNotes] = useState('');
  const [cancellationFee, setCancellationFee] = useState<number>(0);
  const [timeUntilDeadline, setTimeUntilDeadline] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [isModalReady, setIsModalReady] = useState(false);

  // totalAmountを安全に数値に変換するヘルパー関数
  const getTotalAmountAsNumber = (): number => {
    const amount = reservation.totalAmount;
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof amount === 'number' ? amount : 0;
  };

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
    
    // totalAmountを数値に変換
    const totalAmount = getTotalAmountAsNumber();
    
    if (isNaN(totalAmount)) {
      console.warn('Invalid totalAmount in calculateCancellationFee:', reservation.totalAmount);
      return 0;
    }

    // 管理者と緊急事態は無料
    if (userRole === 'admin' || reason === CancelReason.EMERGENCY) {
      return 0;
    }

    // 生徒の場合：24時間前を過ぎていたら100%
    if (userRole === 'student' && hoursUntilLesson < 24) {
      return totalAmount;
    }

    // 講師の場合：2時間前を過ぎていたら50%
    if (userRole === 'mentor' && hoursUntilLesson < 2) {
      return Math.floor(totalAmount * 0.5);
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
      await onCancel?.(selectedReason as CancelReason, notes || undefined);
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

  // 承認処理
  const handleApprove = async () => {
    try {
      await onApprove?.();
      onClose();
    } catch (error) {
      console.error('承認処理エラー:', error);
    }
  };

  // 拒否処理
  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    try {
      await onReject?.(rejectReason);
      onClose();
      setRejectReason('');
    } catch (error) {
      console.error('拒否処理エラー:', error);
    }
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    // デバッグ用ログ
    console.log('formatCurrency called with:', { amount, type: typeof amount });
    
    // 値の検証と変換
    let numericAmount: number = 0;
    
    if (amount === null || amount === undefined) {
      console.warn('Amount is null or undefined:', amount);
      return '¥0';
    }
    
    if (typeof amount === 'string') {
      numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        console.warn('Could not parse string amount:', amount);
        return '¥0';
      }
    } else if (typeof amount === 'number') {
      numericAmount = amount;
    } else {
      console.warn('Invalid amount type:', typeof amount, amount);
      return '¥0';
    }
    
    if (isNaN(numericAmount) || !isFinite(numericAmount)) {
      console.warn('Invalid numeric amount:', numericAmount);
      return '¥0';
    }
    
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(numericAmount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' && <Clock className="h-5 w-5 text-blue-500" />}
            {mode === 'reject' && <X className="h-5 w-5 text-red-500" />}
            {mode === 'cancel' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
            {mode === 'reschedule' && <Clock className="h-5 w-5 text-blue-500" />}
            {mode === 'view' && <Clock className="h-5 w-5 text-gray-500" />}
            {mode === 'approve' && 'レッスン承認'}
            {mode === 'reject' && 'レッスン拒否'}
            {mode === 'cancel' && 'レッスンキャンセル'}
            {mode === 'reschedule' && 'レッスンリスケジュール'}
            {mode === 'view' && '予約詳細'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'approve' && '以下のレッスン予約を承認しますか？'}
            {mode === 'reject' && '以下のレッスン予約を拒否しますか？'}
            {mode === 'cancel' && '以下のレッスンをキャンセルしますか？この操作は取り消せません。'}
            {mode === 'reschedule' && 'レッスンの日時変更を行います。'}
            {mode === 'view' && '予約の詳細情報を確認できます。'}
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
          {mode === 'cancel' && (
            <>
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
            </>
          )}

          {/* 拒否理由入力 */}
          {mode === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">拒否理由 *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="予約を拒否する理由を入力してください..."
                rows={3}
              />
            </div>
          )}

          {/* リスケジュール日時選択 */}
          {mode === 'reschedule' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">リスケジュール機能</p>
                    <p className="text-blue-800">
                      現在はシンプルなリスケジュール機能を提供しています。<br/>
                      新しい日時の選択は、メンターのスロットカレンダーから行ってください。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reschedule-notes">リスケジュール理由・備考</Label>
                <Textarea
                  id="reschedule-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="リスケジュールの理由や希望日時を入力してください..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* 承認確認メッセージ */}
          {mode === 'approve' && (
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">承認後の流れ</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>生徒に承認通知が送信されます</li>
                    <li>レッスン開始2時間前に自動決済が実行されます</li>
                    <li>承認後のキャンセルには料金が発生する場合があります</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* キャンセル料情報 */}
          {mode === 'cancel' && selectedReason && (
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
                        {formatCurrency(getTotalAmountAsNumber() - cancellationFee)}
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
          {mode === 'cancel' && (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            戻る
          </Button>
          
          {mode === 'cancel' && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!selectedReason || isLoading}
            >
              {isLoading ? '処理中...' : 'キャンセル実行'}
            </Button>
          )}
          
          {mode === 'approve' && (
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? '処理中...' : '承認する'}
            </Button>
          )}
          
          {mode === 'reject' && (
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isLoading}
            >
              {isLoading ? '処理中...' : '拒否する'}
            </Button>
          )}
          
          {mode === 'view' && (
            <>
              {(userRole === 'mentor' || userRole === 'admin') && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => onModeChange?.('reschedule')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    リスケジュール
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onModeChange?.('cancel')}
                    className="text-red-600 hover:text-red-700"
                  >
                    キャンセル
                  </Button>
                </>
              )}
              <Button onClick={onClose}>
                閉じる
              </Button>
            </>
          )}
          
          {mode === 'reschedule' && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                戻る
              </Button>
              <Button
                onClick={() => {
                  // 簡易リスケジュール処理（現在は新しい予約作成を促す）
                  onClose();
                  alert('リスケジュールをご希望の場合は、まず現在の予約をキャンセルしてから、新しい日時で予約を作成してください。');
                }}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? '処理中...' : 'リスケジュール手続きへ'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 